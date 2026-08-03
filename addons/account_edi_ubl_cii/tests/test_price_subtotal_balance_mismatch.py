from odoo.addons.account_edi_ubl_cii.tests.test_ubl_import_bis3_invoice_be import TestUblImportBis3InvoiceBE
from odoo.tests import tagged

from freezegun import freeze_time


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestPriceSubtotalBalanceMismatch(TestUblImportBis3InvoiceBE):

    @freeze_time('2020-01-01')
    def test_price_subtotal_disagrees_with_balance(self):
        self.assertEqual(
            self.company_data['company'].tax_calculation_rounding_method, 'round_globally',
            "This repro requires round_globally (the be_comp default) to trigger.",
        )
        self.percent_tax(21.0)

        invoice = self._import_invoice_as_attachment_on(
            test_name='test_price_subtotal_balance_mismatch',
            journal=self.company_data['default_journal_sale'],
        )

        # quantity=71, price=150, base_quantity=3: unit price doesn't divide evenly, so
        # round_globally's whole-invoice redistribution nudges this line's balance. Since
        # price_subtotal is now computed alongside the other lines of the move, it reflects
        # that same redistribution and stays equal to -balance.
        line_71 = invoice.invoice_line_ids.filtered(lambda l: l.quantity == 71)
        self.assertEqual(line_71.price_subtotal, 3549.98)
        self.assertEqual(line_71.balance, -3549.98)

        # amount_untaxed (computed from balance) now agrees with the sum of the lines' own
        # displayed price_subtotal - the value shown on the form/PDF/UBL.
        currency = invoice.currency_id
        sum_of_displayed_price_subtotal = currency.round(sum(invoice.invoice_line_ids.mapped('price_subtotal')))
        self.assertEqual(sum_of_displayed_price_subtotal, 13750.62)
        self.assertEqual(invoice.amount_untaxed, 13750.62)
