from odoo.tests import tagged

from .common import TestL10nEgEdiPosCommon


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestL10nEgEdiPosInvoice(TestL10nEgEdiPosCommon):

    def _create_accepted_order(self):
        order = self._create_unpaid_order()
        with self._mock_eta(send_response=self._eta_accepts_any_uuid()):
            self._pay(order)
        return order

    def _invoice_order(self, order):
        return self.env['account.move'].browse(order.with_context(generate_pdf=False).action_pos_order_invoice()['res_id'])

    def test_pos_invoice_skips_eta_einvoice_document(self):
        order = self._create_accepted_order()
        invoice = self._invoice_order(order)

        self.assertIn('eg_eta', order.config_id.journal_id.edi_format_ids.mapped('code'))
        self.assertEqual(invoice.pos_order_ids, order)
        self.assertFalse(invoice.edi_document_ids.filtered(lambda doc: doc.edi_format_id.code == 'eg_eta'))

    def test_pos_invoice_sign_action_is_noop(self):
        order = self._create_accepted_order()
        invoice = self._invoice_order(order)

        with self._assert_no_eta_call():
            result = invoice.action_post_sign_invoices()

        self.assertFalse(result)

    def test_single_pos_invoice_uses_pos_order_qr(self):
        order = self._create_accepted_order()
        invoice = self._invoice_order(order)

        self.assertEqual(invoice.l10n_eg_qr_code, order.l10n_eg_edi_pos_qr)

    def test_consolidated_pos_invoice_has_no_single_pos_qr(self):
        order_1 = self._create_accepted_order()
        order_2 = self._create_accepted_order()
        orders = order_1 | order_2

        self.env['pos.make.invoice'].with_context(active_ids=orders.ids, generate_pdf=False).create({
            'consolidated_billing': True,
        }).action_create_invoices()

        invoice = orders.account_move
        self.assertEqual(len(invoice), 1)
        self.assertFalse(invoice.edi_document_ids.filtered(lambda doc: doc.edi_format_id.code == 'eg_eta'))
