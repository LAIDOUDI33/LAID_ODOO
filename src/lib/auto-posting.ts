import { db } from './db';

// Auto-generate journal entry from invoice
export async function postInvoiceToJournal(
  invoiceId: string,
  userId: string
): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  try {
    // Fetch invoice with all data
    const invoice = await db.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        company: true,
        partner: true,
        lines: { include: { product: true } }
      }
    });

    if (!invoice) return { success: false, error: 'Invoice not found' };
    if (!invoice.companyId) return { success: false, error: 'Invoice has no company' };

    // Find the sales journal (VT - Ventes)
    const journal = await db.journal.findFirst({
      where: {
        companyId: invoice.companyId,
        type: 'sale'
      }
    });

    if (!journal) {
      return { success: false, error: 'Sales journal not found for this company' };
    }

    // Find or create customer account for partner (411x - Clients)
    let clientAccount = await db.chartOfAccount.findFirst({
      where: {
        companyId: invoice.companyId,
        code: { startsWith: '411' }, // Clients
        isLeaf: true
      }
    });

    if (!clientAccount) {
      // Use default client account
      clientAccount = await db.chartOfAccount.findFirst({
        where: {
          companyId: invoice.companyId,
          code: '411000',
          isLeaf: true
        }
      });
    }

    // Find TVA collectée account (4457)
    const tvaCollecteAccount = await db.chartOfAccount.findFirst({
      where: {
        companyId: invoice.companyId,
        code: { startsWith: '4457' },
        isLeaf: true
      }
    });

    // Build journal items
    const journalItems: Array<{
      accountId: string;
      label: string;
      debit: number;
      credit: number;
    }> = [];

    // Debit: Client account (amount total TTC)
    if (clientAccount) {
      journalItems.push({
        accountId: clientAccount.id,
        label: `Facture ${invoice.reference} - ${invoice.partner?.name || 'Client'}`,
        debit: invoice.amountTotal,
        credit: 0,
      });
    }

    // Credit: Revenue accounts (70x) and TVA for each line
    for (const line of invoice.lines) {
      // Find revenue account for product category
      let revenueAccount = await db.chartOfAccount.findFirst({
        where: {
          companyId: invoice.companyId,
          code: { startsWith: '70' }, // Revenue accounts
          isLeaf: true
        }
      });

      if (revenueAccount) {
        journalItems.push({
          accountId: revenueAccount.id,
          label: `${line.label || line.product?.name || 'Vente'} - ${invoice.reference}`,
          debit: 0,
          credit: line.amountUntaxed,
        });
      }

      // TVA collectée
      if (line.amountTax > 0 && tvaCollecteAccount) {
        journalItems.push({
          accountId: tvaCollecteAccount.id,
          label: `TVA collectée ${(line.tvaRate * 100).toFixed(0)}% - ${invoice.reference}`,
          debit: 0,
          credit: line.amountTax,
        });
      }
    }

    // Add timbre fiscal if applicable
    if (invoice.timbreFiscal && invoice.timbreFiscal > 0) {
      const timbreAccount = await db.chartOfAccount.findFirst({
        where: {
          companyId: invoice.companyId,
          code: { startsWith: '6' }, // Expense accounts for stamps
          isLeaf: true
        }
      });

      if (timbreAccount) {
        journalItems.push({
          accountId: timbreAccount.id,
          label: `Timbre fiscal - ${invoice.reference}`,
          debit: 0,
          credit: invoice.timbreFiscal,
        });
      }
    }

    // Validate balanced entry
    const totalDebit = journalItems.reduce((sum, item) => sum + item.debit, 0);
    const totalCredit = journalItems.reduce((sum, item) => sum + item.credit, 0);

    // Allow small rounding differences (< 1 DZD)
    if (Math.abs(totalDebit - totalCredit) > 1) {
      // Add rounding difference to a rounding account
      const roundingAccount = await db.chartOfAccount.findFirst({
        where: {
          companyId: invoice.companyId,
          code: '659000', // Rounding account
          isLeaf: true
        }
      });
      
      if (roundingAccount) {
        const diff = totalDebit - totalCredit;
        if (diff > 0) {
          journalItems.push({
            accountId: roundingAccount.id,
            label: `Arrondi ${invoice.reference}`,
            debit: 0,
            credit: diff,
          });
        } else {
          journalItems.push({
            accountId: roundingAccount.id,
            label: `Arrondi ${invoice.reference}`,
            debit: Math.abs(diff),
            credit: 0,
          });
        }
      }
    }

    // Generate reference
    const date = new Date();
    const refDate = date.toISOString().slice(0, 10).replace(/-/g, '');
    const refSequence = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
    const reference = `AC-${refDate}-${refSequence}`;

    // Create journal entry with items in transaction
    const journalEntry = await db.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          reference,
          date: invoice.date || new Date(),
          label: `Facture ${invoice.reference} - ${invoice.partner?.name || 'Client'}`,
          totalDebit: journalItems.reduce((sum, item) => sum + item.debit, 0),
          totalCredit: journalItems.reduce((sum, item) => sum + item.credit, 0),
          status: 'posted',
          source: 'invoice',
          sourceId: invoice.id,
          journalId: journal.id,
        }
      });

      await tx.journalItem.createMany({
        data: journalItems.map(item => ({
          ...item,
          entryId: entry.id,
        }))
      });

      return entry;
    });

    // Link journal entry to invoice
    await db.invoice.update({
      where: { id: invoiceId },
      data: { journalEntryId: journalEntry.id }
    });

    return { 
      success: true, 
      journalEntryId: journalEntry.id 
    };
  } catch (error) {
    console.error('Auto-posting invoice error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to post invoice' 
    };
  }
}

// Auto-generate journal entry from payment
export async function postPaymentToJournal(
  paymentId: string,
  userId: string
): Promise<{ success: boolean; journalEntryId?: string; error?: string }> {
  try {
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      include: {
        invoice: { 
          include: { 
            partner: true,
            company: true
          } 
        },
        bill: {
          include: {
            partner: true,
            company: true
          }
        },
        bankAccount: true
      }
    });

    if (!payment) return { success: false, error: 'Payment not found' };

    // Determine company from invoice or bill
    const company = payment.invoice?.company || payment.bill?.company;
    if (!company) return { success: false, error: 'Payment has no associated company' };

    // Determine the appropriate journal based on payment type
    let journalType: string = 'bank';
    if (payment.method === 'cash') {
      journalType = 'cash';
    }

    const journal = await db.journal.findFirst({
      where: {
        companyId: company.id,
        type: journalType
      }
    });

    if (!journal) {
      return { success: false, error: `${journalType} journal not found for this company` };
    }

    // Find bank/cash account (51x or 53x)
    const bankAccount = await db.chartOfAccount.findFirst({
      where: {
        companyId: company.id,
        code: { startsWith: payment.method === 'cash' ? '53' : '51' }, // Cash/bank accounts
        isLeaf: true
      }
    });

    // Determine if it's customer payment or supplier payment
    const isCustomerPayment = !!payment.invoice;
    
    // Find client/supplier account
    const accountCodePrefix = isCustomerPayment ? '411' : '401'; // Clients / Fournisseurs
    const partyAccount = await db.chartOfAccount.findFirst({
      where: {
        companyId: company.id,
        code: { startsWith: accountCodePrefix },
        isLeaf: true
      }
    });

    if (!bankAccount || !partyAccount) {
      return { success: false, error: 'Required accounts not found' };
    }

    const partnerName = payment.invoice?.partner?.name || payment.bill?.partner?.name || '';
    const reference = `PAI-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(Math.floor(Math.random() * 99) + 1).padStart(2, '0')}`;

    const journalEntry = await db.$transaction(async (tx) => {
      const entry = await tx.journalEntry.create({
        data: {
          reference,
          date: payment.date || new Date(),
          label: `Paiement ${payment.reference || ''} - ${partnerName}`,
          totalDebit: payment.amount,
          totalCredit: payment.amount,
          status: 'posted',
          source: 'payment',
          sourceId: payment.id,
          journalId: journal.id,
        }
      });

      if (isCustomerPayment) {
        // Customer payment: Debit Bank/Cash, Credit Client
        await tx.journalItem.createMany({
          data: [
            {
              entryId: entry.id,
              accountId: bankAccount.id,
              label: `Encaissement ${payment.method} - ${payment.reference || ''}`,
              debit: payment.amount,
              credit: 0,
            },
            {
              entryId: entry.id,
              accountId: partyAccount.id,
              label: `Règlement client ${partnerName}`,
              debit: 0,
              credit: payment.amount,
            }
          ]
        });
      } else {
        // Supplier payment: Debit Supplier, Credit Bank/Cash
        await tx.journalItem.createMany({
          data: [
            {
              entryId: entry.id,
              accountId: partyAccount.id,
              label: `Règlement fournisseur ${partnerName}`,
              debit: payment.amount,
              credit: 0,
            },
            {
              entryId: entry.id,
              accountId: bankAccount.id,
              label: `Paiement ${payment.method} - ${payment.reference || ''}`,
              debit: 0,
              credit: payment.amount,
            }
          ]
        });
      }

      return entry;
    });

    return { success: true, journalEntryId: journalEntry.id };
  } catch (error) {
    console.error('Auto-posting payment error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to post payment' 
    };
  }
}
