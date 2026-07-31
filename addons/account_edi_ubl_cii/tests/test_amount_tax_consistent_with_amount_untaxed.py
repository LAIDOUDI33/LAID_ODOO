from odoo.addons.account_edi_ubl_cii.tests.test_ubl_import_bis3_invoice_be import TestUblImportBis3InvoiceBE
from odoo.tests import tagged

from freezegun import freeze_time


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestAmountTaxConsistentWithAmountUntaxed(TestUblImportBis3InvoiceBE):

    @freeze_time('2020-01-01')
    def test_amount_tax_consistent_with_amount_untaxed_sale(self):
        self.assertEqual(
            self.company_data['company'].tax_calculation_rounding_method, 'round_globally',
            "This repro requires round_globally (the be_comp default) to trigger.",
        )
        self.percent_tax(21.0)

        invoice = self._import_invoice_as_attachment_on(
            test_name='test_amount_tax_consistent_with_amount_untaxed',
            journal=self.company_data['default_journal_sale'],
        )

        # amount_untaxed is corrected to match the file (via the synthetic "Rounding" line,
        # _import_ubl_invoice_fix_untaxed_amount), and amount_tax is now re-fixed afterwards
        # so it reconciles with the corrected amount_untaxed regardless of the first pass's
        # tolerance.
        self.assertRecordValues(
            invoice,
            [
                {
                    'amount_untaxed': 11202.00,
                    'amount_tax': 2352.42,
                    'amount_total': 13554.42,
                },
            ],
        )

    @freeze_time('2020-01-01')
    def test_amount_tax_consistent_with_amount_untaxed_purchase(self):
        # Same mechanism on a vendor bill: the "Rounding" line isn't Peppol-specific,
        # it's added by core for both sale and purchase documents.
        self.percent_tax(21.0, type_tax_use='purchase')

        bill = self._import_invoice_as_attachment_on(test_name='test_amount_tax_consistent_with_amount_untaxed')

        self.assertRecordValues(
            bill,
            [
                {
                    'amount_untaxed': 11202.00,
                    'amount_tax': 2352.42,
                    'amount_total': 13554.42,
                },
            ],
        )
