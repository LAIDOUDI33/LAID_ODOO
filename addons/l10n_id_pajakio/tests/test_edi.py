import json
from unittest.mock import patch

from odoo.exceptions import UserError
from odoo.tests import tagged

from odoo.addons.account.tests.common import AccountTestInvoicingCommon
from odoo.addons.account.tests.test_account_move_send import TestAccountMoveSendCommon

IAP_PROXY_METHOD = "odoo.addons.l10n_id_pajakio.models.iap_account.IapAccount._l10n_id_pajakio_iap_connect"


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestPajakio(AccountTestInvoicingCommon):
    """ Tests for the user/company registration and activation flows"""

    @classmethod
    @AccountTestInvoicingCommon.setup_chart_template('id')
    def setUpClass(cls):
        super().setUpClass()
        cls.company_data['company'].update({
            'country_id': cls.env.ref('base.id').id,
            'city': 'Jakarta',
            'vat': '1234567890123456',
            'l10n_id_pajakio_mode': 'test',
        })

        # mocked return arguments
        cls.mock_register_user_success = {
            "data": None,
        }
        cls.mock_register_user_fail = {
            "error": "Email already registered",
            "code": "register_user_failed",
        }
        cls.mock_register_company_success = {
            'data': {
                'clientId': '-vvQZu6NgRStS-QNIJB9gG7aGt12v72fPg',
            },
        }
        cls.mock_register_company_fail = {
            'error': "Failed to register company in Pajak.io: PASSWORD DOESN'T MATCH WITH REGISTERED EMAIL",
            'code': 'register_company_failed',
        }
        cls.mock_sign_in_success = {
            'data': {
                'clientId': '-vvQZu6NgRStS-QNIJB9gG7aGt12v72fPg',
            },
        }
        cls.mock_sign_in_fail = {
            'error': "NPWP is not registered in Pajak.io",
            'code': 'sign_in_failed',
        }
        cls.mock_activation_success = {
            "data": True,
        }

    # User Registration

    def test_pajakio_register_user_success(self):
        """ Test when a user successfully registers user, the company's email is supposed to be set"""
        wizard = self.env['l10n_id_pajakio.registration.form'].create({
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
            'user_name': 'John Doe',
            'phone': '1234567890',
        })
        with patch(IAP_PROXY_METHOD, return_value=self.mock_register_user_success) as mock_method:
            self.assertFalse(self.company_data['company'].l10n_id_pajakio_email)
            wizard.action_register_user()
            self.assertEqual(mock_method.call_count, 1)
            self.assertEqual(self.company_data['company'].l10n_id_pajakio_email, 'test@example.com')

    def test_pajakio_register_user_fail(self):
        """ Test when a user failed to register user, an error should be raise and exception should be caught and
        the erro message should contain the reason"""
        wizard = self.env['l10n_id_pajakio.registration.form'].create({
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
            'user_name': 'John Doe',
            'phone': '1234567890',
        })
        with patch(IAP_PROXY_METHOD, return_value=self.mock_register_user_fail) as mock_method:
            self.assertFalse(self.company_data['company'].l10n_id_pajakio_email)
            with self.assertRaises(UserError):
                wizard.action_register_user()
            self.assertEqual(mock_method.call_count, 1)
            self.assertFalse(self.company_data['company'].l10n_id_pajakio_email)  # should remain false since registration fails

    # Company Registration

    def test_pajakio_register_company_success(self):
        """ Test that when company successfuly is registered, response is supposed to contain clientId which we will store"""
        self.company_data['company'].l10n_id_pajakio_email = 'test@example.com'
        wizard = self.env['l10n_id_pajakio.registration.form'].create({
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
            'company_name': 'Test Company',
            'npwp': '1234567890',
            'address': 'Test Address',
            'city': 'Jakarta',
        })
        with patch(IAP_PROXY_METHOD, return_value=self.mock_register_company_success) as mock_method:
            wizard.action_register_company()
            self.assertEqual(mock_method.call_count, 2)
            self.assertEqual(self.company_data['company'].l10n_id_pajakio_client_id, '-vvQZu6NgRStS-QNIJB9gG7aGt12v72fPg')

    def test_pajakio_register_company_fail(self):
        """ Test if company registration fail, an exception should be raised"""
        wizard = self.env['l10n_id_pajakio.registration.form'].create({
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
            'company_name': 'Test Company',
            'npwp': '1234567890',
            'address': 'Test Address',
            'city': 'Jakarta',
        })
        with patch(IAP_PROXY_METHOD, return_value=self.mock_register_company_fail) as mock_method:
            with self.assertRaises(UserError):
                wizard.action_register_company()
            self.assertEqual(mock_method.call_count, 1)

    # Sign in

    def test_action_sign_in_pajakio_opens_wizard_with_context(self):
        """Settings sign-in action opens wizard with sign_in flag and company email/VAT defaults."""
        company = self.company_data['company']
        company.write({
            'email': 'signin@example.com',
            'vat': '1234567890123456',
        })
        settings = self.env['res.config.settings'].create({})
        action = settings.action_sign_in_pajakio()
        self.assertTrue(action['context']['sign_in'])
        self.assertEqual(action['context']['default_email'], company.email)
        self.assertEqual(action['context']['default_npwp'], company.vat)

    def test_pajakio_sign_in_success(self):
        """ Test sign in stores email and client ID on success"""
        company_id = self.company_data['company']
        wizard = self.env['l10n_id_pajakio.registration.form'].create({
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
            'npwp': '1234567890',
        })
        with patch(IAP_PROXY_METHOD, return_value=self.mock_sign_in_success) as mock_method:
            self.assertFalse(company_id.l10n_id_pajakio_email)
            self.assertFalse(company_id.l10n_id_pajakio_client_id)
            wizard.action_sign_in()
            self.assertEqual(mock_method.call_count, 2)  # since sign in is followed with activation immediately, there's 2 API calls
            self.assertEqual(company_id.l10n_id_pajakio_email, 'test@example.com')
            self.assertEqual(company_id.l10n_id_pajakio_client_id, '-vvQZu6NgRStS-QNIJB9gG7aGt12v72fPg')

    def test_pajakio_sign_in_fail(self):
        """ Test sign in failure raises an error and does not store credentials."""
        company_id = self.company_data['company']
        wizard = self.env['l10n_id_pajakio.registration.form'].create({
            'email': 'test@example.com',
            'password': 'SecurePassword123!',
            'npwp': '1234567890',
        })
        with patch(IAP_PROXY_METHOD, return_value=self.mock_sign_in_fail) as mock_method:
            with self.assertRaises(UserError):
                wizard.action_sign_in()
            self.assertEqual(mock_method.call_count, 1)
            self.assertFalse(company_id.l10n_id_pajakio_email)
            self.assertFalse(company_id.l10n_id_pajakio_client_id)

    # company activation

    def test_pajakio_activate_requires_email_and_client_id(self):
        """ email and client_id needs to be configured before being allowed to proceed """
        company_id = self.company_data['company']
        with self.assertRaises(UserError):
            company_id._l10n_id_pajakio_activate()

        company_id.l10n_id_pajakio_email = 'test@email.com'

        # should still produce error because client_id is not set
        with self.assertRaises(UserError):
            company_id._l10n_id_pajakio_activate()

        company_id.l10n_id_pajakio_email = ''
        company_id.l10n_id_pajakio_client_id = 'client_id'

        with self.assertRaises(UserError):
            company_id._l10n_id_pajakio_activate()

    def test_pajakio_activate_pajakio_success(self):
        """ Activate pajak.io connection, should set `l10n_id_pajakio_active` to False"""
        company_id = self.company_data['company']
        company_id.l10n_id_pajakio_email = 'test@email.com'
        company_id.l10n_id_pajakio_client_id = 'client_id'

        self.assertFalse(company_id.l10n_id_pajakio_active)
        with patch(IAP_PROXY_METHOD, return_value=self.mock_activation_success) as mock_method:
            company_id._l10n_id_pajakio_activate()
            self.assertEqual(mock_method.call_count, 1)
            self.assertEqual(mock_method.call_args[0][1], "/api/pajakio/1/register")
            self.assertTrue(company_id.l10n_id_pajakio_active)

    def test_pajakio_deactivate_pajakio_success(self):
        """ Deactivate pajak.io connection, should set `l10n_id_pajakio_active` to False.
        Deactivation is local-only and must not call the IAP proxy. """
        company_id = self.company_data['company']
        company_id.l10n_id_pajakio_email = 'test@email.com'
        company_id.l10n_id_pajakio_client_id = 'client_id'

        # Simulate currently activated company
        company_id.l10n_id_pajakio_active = True
        self.assertTrue(company_id.l10n_id_pajakio_active)

        with patch(IAP_PROXY_METHOD, return_value=self.mock_activation_success) as mock_method:
            company_id._l10n_id_pajakio_activate(status=False)
            self.assertFalse(company_id.l10n_id_pajakio_active)
            mock_method.assert_not_called()

    # logout

    def test_pajakio_logout_clears_local_credentials_only(self):
        """ Logout deactivates the integration and clears local credentials for the
        current mode. It must not call the IAP proxy """
        company = self.company_data['company']
        company.l10n_id_pajakio_email = 'test@email.com'
        company.l10n_id_pajakio_client_id = 'client_id'
        company.l10n_id_pajakio_active = True

        settings = self.env['res.config.settings'].create({})
        with patch(IAP_PROXY_METHOD, return_value=self.mock_activation_success) as mock_iap:
            settings.action_logout_pajakio()
            mock_iap.assert_not_called()

        self.assertFalse(company.l10n_id_pajakio_active)
        self.assertFalse(company.l10n_id_pajakio_email)
        self.assertFalse(company.l10n_id_pajakio_client_id)


@tagged('post_install_l10n', 'post_install', '-at_install')
class L10nIDTestPajakioEdi(TestAccountMoveSendCommon):
    """Tests in this class are to guarantee the actual invoice creation/sending/status update/cancellation flow with Pajak.io"""

    @classmethod
    @TestAccountMoveSendCommon.setup_country('id')
    def setUpClass(cls):
        super().setUpClass()
        cls.company_data['company'].update({
            "name": "ID Company",
            'country_id': cls.env.ref('base.id').id,
            'city': 'Jakarta',
            'vat': '1234567890123456',
            # assumes that account has been successfully registered and activated
            'l10n_id_pajakio_mode': 'test',
            'l10n_id_pajakio_active': True,
            'l10n_id_pajakio_client_id': 'client_id',
            'l10n_id_pajakio_email': 'test@email.com',
        })
        cls.partner_a.write({
            'l10n_id_kode_transaksi': '04',
            'vat': '1234567890123456',
            'country_id': cls.env.ref('base.id').id,
            'l10n_id_pkp': True,
        })

    def _create_pajakio_document(self, invoice):
        """ Create the Pajak.io e-Faktur document backing an invoice, mirroring what the real
        send flow creates on-demand, so tests can set Pajak.io fields directly. """
        invoice.l10n_id_coretax_document = self.env['l10n_id_efaktur_coretax.document'].create({
            'invoice_ids': invoice.ids,
            'company_id': invoice.company_id.id,
            'document_type': 'pajakio',
        })
        return invoice.l10n_id_coretax_document

    # Pajak.io showing in the account.move.send wizard

    def test_pajakio_edi_shows(self):
        """ Test when the Pajak.io EDI option is shown in the invoice send wizard"""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True)
        wizard = self.create_send_and_print(invoice)
        self.assertIn('id_pajakio', wizard.extra_edis)

    def test_pajakio_edi_not_shown(self):
        # pajak.io not activated yet
        self.company_data['company'].l10n_id_pajakio_active = False

        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True)
        wizard = self.create_send_and_print(invoice)
        self.assertFalse(wizard.extra_edis)

        # The pajak.io status of invoice is either draft/waiting/approved
        self.company_data['company'].l10n_id_pajakio_active = True

        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_status = 'draft'
        wizard = self.create_send_and_print(invoice)
        self.assertFalse(wizard.extra_edis)

        document.l10n_id_pajakio_status = 'waiting'
        wizard = self.create_send_and_print(invoice)
        self.assertFalse(wizard.extra_edis)

        document.l10n_id_pajakio_status = 'approved'
        wizard = self.create_send_and_print(invoice)
        self.assertFalse(wizard.extra_edis)

    # Payload Generation

    def test_pajakio_edi_generate_json(self):
        """ Test the JSON data created by method _l10n_id_pajakio_prepare_invoice_payload is correct """
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        invoice.l10n_id_kode_transaksi = "04"
        # Make sure draft is not blocking eligibility (should be posted already)
        payload = invoice._l10n_id_pajakio_prepare_invoice_payload()

        # Validate some important fields in the generated payload structure
        self.assertEqual(payload["noInvoice"], invoice.name)
        self.assertEqual(payload["kdJenisTransaksi"], 'TD.00304')
        self.assertIn("lawanTransaksi", payload)
        self.assertEqual(payload["lawanTransaksi"]["identityType"], "NPWP")
        self.assertEqual(payload["lawanTransaksi"]["identityValue"], invoice.partner_id.commercial_partner_id.vat)
        self.assertEqual(payload["penandatangan"]["nama"], "ID Company")
        self.assertEqual(payload["penandatangan"]["npwp"], "1234567890123456")

        # Check a line for expected structure and value conversion
        self.assertIsInstance(payload["barangJasa"], list)
        self.assertTrue(len(payload["barangJasa"]) > 0)
        line = payload["barangJasa"][0]
        self.assertIn("jenis", line)
        self.assertIn("kode", line)
        self.assertIn("nama", line)
        # Instead of data type, check the actual amount
        self.assertEqual(line["harga"], 1000.0)

        # Some specific checks for kode transaksi 04
        self.assertTrue(line["cekDppLain"])
        # The DPP Lain and standard DPP should be calculated based on value
        self.assertEqual(line["dpp"], 1000.0)
        self.assertEqual(line["dppLain"], 916.67)

    def test_pajakio_generate_json_attachment_data(self):
        """ Test _l10n_id_pajakio_generate_json creates expected attachment payload in invoice_data."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        invoice.l10n_id_kode_transaksi = "04"

        invoice_data = {
            'extra_edis': {'id_pajakio'},
        }
        expected_payload = invoice._l10n_id_pajakio_prepare_invoice_payload()

        self.env['account.move.send']._l10n_id_pajakio_generate_json(invoice, invoice_data)

        self.assertIn('pajakio_attachments', invoice_data)
        attachment_data = invoice_data['pajakio_attachments']
        self.assertEqual(attachment_data['name'], f'{invoice.name}_pajakio_request.json')
        self.assertEqual(attachment_data['mimetype'], 'application/json')
        self.assertEqual(attachment_data['res_model'], 'l10n_id_efaktur_coretax.document')
        self.assertEqual(attachment_data['res_field'], 'l10n_id_pajakio_file')
        self.assertEqual(json.loads(attachment_data['raw']), expected_payload)

    # invoice creation

    def test_pajakio_send_invoice_success(self):
        """Test for method _l10n_id_pajakio_send: should store transaction ID on invoice if successful """
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        json_content = invoice._l10n_id_pajakio_prepare_invoice_payload()

        mock_response = {'data': {'transactionId': 'TRX-12345'}}
        with patch(IAP_PROXY_METHOD, return_value=mock_response) as mock_iap:
            result = invoice.l10n_id_coretax_document._l10n_id_pajakio_send(json_content)
            self.assertFalse(result)
            self.assertEqual(invoice.l10n_id_coretax_document.l10n_id_pajakio_transaction_id, 'TRX-12345')
            self.assertEqual(mock_iap.call_args[0][1], "/api/pajakio/1/create_invoice")

    def test_pajakio_send_invoice_error(self):
        """Test that _l10n_id_pajakio_send returns error message on failure. No transaction ID should be stored on
        the invoice as well"""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        json_content = invoice._l10n_id_pajakio_prepare_invoice_payload()

        mock_response = {'error': 'Invalid payload'}
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            result = invoice.l10n_id_coretax_document._l10n_id_pajakio_send(json_content)
            self.assertEqual(result, 'Invalid payload')
            self.assertFalse(invoice.l10n_id_coretax_document.l10n_id_pajakio_transaction_id)

    def test_pajakio_batch_send_multiple_invoices(self):
        """Test that batch-sending multiple invoices to Pajak.io succeeds for each invoice independently,
        and that the status of the whole batch is fetched with a single IAP call."""
        invoice_1 = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        invoice_2 = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[2000], post=True, taxes=self.tax_sale_a)
        invoices = invoice_1 + invoice_2

        transaction_ids = iter(['TRX-1', 'TRX-2'])

        def mock_iap_side_effect(params, url_path, timeout=30):
            if url_path == '/api/pajakio/1/create_invoice':
                return {'data': {'transactionId': next(transaction_ids)}}
            if url_path == '/api/pajakio/1/update':
                return {'data': {
                    trx_id: {'status': 'MENUNGGU_VERIFIKASI_DJP', 'data': {'jenisFaktur': 'NORMAL'}}
                    for trx_id in params['transaction_ids']
                }}
            return None

        with patch(IAP_PROXY_METHOD, side_effect=mock_iap_side_effect) as mock_iap:
            wizard = self.env['account.move.send.batch.wizard'].with_context(
                active_model='account.move', active_ids=invoices.ids,
            ).create({})
            wizard.action_send_and_print(force_synchronous=True)

        self.assertEqual(invoice_1.l10n_id_coretax_document.l10n_id_pajakio_status, 'waiting')
        self.assertEqual(invoice_2.l10n_id_coretax_document.l10n_id_pajakio_status, 'waiting')
        self.assertEqual(invoice_1.l10n_id_coretax_document.l10n_id_pajakio_transaction_id, 'TRX-1')
        self.assertEqual(invoice_2.l10n_id_coretax_document.l10n_id_pajakio_transaction_id, 'TRX-2')

        update_calls = [call for call in mock_iap.call_args_list if call.args[1] == '/api/pajakio/1/update']
        self.assertEqual(len(update_calls), 1, "status of the whole batch should be fetched in a single IAP call")

    # invoice update status

    def test_pajakio_update_status_approved(self):
        """Test that update_status sets approved status with invoice number and URL."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'

        mock_response = {
            'data': {
                'TRX-12345': {
                    'status': 'APPROVAL_SUKSES',
                    'data': {
                        'nofa': 'INV-001-DJP',
                        'urlPdf': 'testurlpdf.com',
                        'jenisFaktur': 'NORMAL',
                    },
                },
            },
        }
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            result = document._l10n_id_pajakio_update_status()
            self.assertFalse(result)
            self.assertEqual(document.l10n_id_pajakio_status, 'approved')
            self.assertEqual(document.l10n_id_pajakio_invoice_number, 'INV-001-DJP')
            self.assertEqual(document.l10n_id_pajakio_transaction_url, 'testurlpdf.com')

    def test_pajakio_update_status_waiting(self):
        """Test that update_status sets waiting status."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'

        mock_response = {
            'data': {
                'TRX-12345': {
                    'status': 'MENUNGGU_VERIFIKASI_DJP',
                    'data': {'jenisFaktur': 'NORMAL'},
                },
            },
        }
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            document._l10n_id_pajakio_update_status()
            self.assertEqual(document.l10n_id_pajakio_status, 'waiting')

    def test_pajakio_update_status_rejected(self):
        """Test that update_status sets rejected status with reason."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'

        mock_response = {
            'data': {
                'TRX-12345': {
                    'status': 'DITOLAK',
                    'data': {
                        'alasan': 'Invalid NPWP format',
                        'jenisFaktur': 'NORMAL',
                    },
                },
            },
        }
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            document._l10n_id_pajakio_update_status()
            self.assertEqual(document.l10n_id_pajakio_status, 'rejected')
            self.assertEqual(document.l10n_id_pajakio_reject_reason, 'Invalid NPWP format')

    def test_pajakio_update_status_cancelled(self):
        """Test that update_status sets cancel status when jenisFaktur is BATAL."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'

        mock_response = {
            'data': {
                'TRX-12345': {
                    'status': 'APPROVAL_SUKSES',
                    'data': {'jenisFaktur': 'BATAL'},
                },
            },
        }
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            document._l10n_id_pajakio_update_status()
            self.assertEqual(document.l10n_id_pajakio_status, 'cancel')

    def test_cron_update_waiting_status(self):
        """Cron only refreshes documents still 'waiting', batching same-company documents into one IAP call."""
        invoice_waiting = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document_waiting = self._create_pajakio_document(invoice_waiting)
        document_waiting.l10n_id_pajakio_transaction_id = 'TRX-WAITING'
        document_waiting.l10n_id_pajakio_status = 'waiting'

        invoice_approved = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document_approved = self._create_pajakio_document(invoice_approved)
        document_approved.l10n_id_pajakio_transaction_id = 'TRX-APPROVED'
        document_approved.l10n_id_pajakio_status = 'approved'

        mock_response = {
            'data': {
                'TRX-WAITING': {
                    'status': 'APPROVAL_SUKSES',
                    'data': {'nofa': 'INV-001-DJP', 'urlPdf': 'testurlpdf.com', 'jenisFaktur': 'NORMAL'},
                },
            },
        }
        with patch(IAP_PROXY_METHOD, return_value=mock_response) as mock_iap:
            self.env['l10n_id_efaktur_coretax.document']._cron_l10n_id_pajakio_update_waiting_status()
            self.assertEqual(mock_iap.call_count, 1, "one IAP call for the single company with waiting documents")
            self.assertEqual(mock_iap.call_args[0][0]['transaction_ids'], ['TRX-WAITING'])

        self.assertEqual(document_waiting.l10n_id_pajakio_status, 'approved')
        self.assertEqual(document_approved.l10n_id_pajakio_status, 'approved')

    # Cancel flow

    def test_pajakio_button_request_cancel_opens_wizard_when_approved(self):
        """Test that a wizard is returned upon calling the button_request_cancel method instead of the standrad cancel request process"""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        self._create_pajakio_document(invoice).l10n_id_pajakio_status = 'approved'

        action = invoice.button_request_cancel()
        self.assertEqual(action['res_model'], 'l10n_id_pajakio.invoice.cancel')
        self.assertEqual(action['context']['default_invoice_id'], invoice.id)

    def test_pajakio_button_request_cancel_falls_back_when_not_approved(self):
        """Test that if the request cancel is called when invoice is not in approved status yet, error is raised"""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_status = 'waiting'
        with self.assertRaises(UserError):
            invoice.button_request_cancel()

        document.l10n_id_pajakio_status = 'draft'
        with self.assertRaises(UserError):
            invoice.button_request_cancel()

    def test_pajakio_wizard_request_cancel_success(self):
        """Test the full flow of successful request cancel and the effects"""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_status = 'approved'
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'
        wizard = self.env['l10n_id_pajakio.invoice.cancel'].create({
            'invoice_id': invoice.id,
            'reason': 'Customer requested cancellation',
        })

        mock_responses = [
            # when requesting the cancel itself
            {
                'data': True,
            },
            # when updating the status after cancel
            {
                'data': {  #
                    'TRX-12345': {
                        'status': 'APPROVAL_SUKSES',
                        'data': {'jenisFaktur': 'BATAL'},
                    },
                },
            },
        ]
        with patch(IAP_PROXY_METHOD, side_effect=mock_responses) as mock_iap:
            wizard.button_request_cancel()

        self.assertEqual(document.l10n_id_pajakio_cancel_reason, 'Customer requested cancellation')
        self.assertEqual(document.l10n_id_pajakio_status, 'cancel')
        self.assertEqual(invoice.state, 'cancel')
        self.assertEqual(mock_iap.call_count, 2)

    def test_pajakio_wizard_request_cancel_iap_failure(self):
        """Test that a UserError is raised and the invoice is unchanged when the cancel IAP call fails."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_status = 'approved'
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'
        wizard = self.env['l10n_id_pajakio.invoice.cancel'].create({
            'invoice_id': invoice.id,
            'reason': 'Customer requested cancellation',
        })

        mock_response = {'error': 'Cancellation failed on Pajak.io side'}
        with patch(IAP_PROXY_METHOD, return_value=mock_response) as mock_iap:
            with self.assertRaises(UserError):
                wizard.button_request_cancel()
            self.assertEqual(mock_iap.call_count, 1)  # once cancel request fail method should stop

        # invoice must remain unchanged — not cancelled in Odoo either
        self.assertEqual(document.l10n_id_pajakio_status, 'approved')
        self.assertEqual(invoice.state, 'posted')

    def test_pajakio_wizard_request_cancel_status_update_failure(self):
        """Test that when cancel succeeds but the follow-up status update fails, the invoice is still
        cancelled in Odoo and a chatter message is posted with the error of failed status update"""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_status = 'approved'
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'
        wizard = self.env['l10n_id_pajakio.invoice.cancel'].create({
            'invoice_id': invoice.id,
            'reason': 'Customer requested cancellation',
        })

        mock_responses = [
            {'data': True},                    # cancel request succeeds
            {'error': 'Connection timeout'},   # status update fails
        ]
        with patch(IAP_PROXY_METHOD, side_effect=mock_responses) as mock_iap:
            wizard.button_request_cancel()  # must NOT raise
            self.assertEqual(mock_iap.call_count, 2)

        self.assertEqual(invoice.state, 'cancel')
        # l10n_id_pajakio_status is set optimistically after the cancel API succeeds
        self.assertEqual(document.l10n_id_pajakio_status, 'cancel')
        # error is communicated via chatter, not an exception
        self.assertTrue(any('Connection timeout' in msg.body for msg in document.message_ids))

    def test_pajakio_wizard_request_cancel_requires_reason(self):
        """Test that if reason is not given or blank during cancellation request, error is raised"""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        wizard = self.env['l10n_id_pajakio.invoice.cancel'].create({
            'invoice_id': invoice.id,
            'reason': '   ',
        })

        with self.assertRaises(UserError):
            wizard.button_request_cancel()

    # additional misc

    def test_pajakio_update_status_error_response(self):
        """Test that update_status returns error on IAP failure."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'

        mock_response = {'error': 'Connection timeout'}
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            result = document._l10n_id_pajakio_update_status()
            self.assertEqual(result, 'Connection timeout')

    def test_pajakio_update_status_missing_transaction(self):
        """A transaction absent from the response (or flagged 'missing') must post a chatter
        message without crashing and without changing the status."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'

        mock_response = {'data': {'TRX-12345': {'status': 'missing'}}}
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            result = document._l10n_id_pajakio_update_status()
        self.assertFalse(result)
        self.assertFalse(document.l10n_id_pajakio_status)
        self.assertTrue(any('not found in Pajak.io' in msg.body for msg in document.message_ids))

    def test_pajakio_update_status_error_per_transaction(self):
        """A per-transaction 'error' status must surface the error via chatter without crashing."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True, taxes=self.tax_sale_a)
        document = self._create_pajakio_document(invoice)
        document.l10n_id_pajakio_transaction_id = 'TRX-12345'

        mock_response = {'data': {'TRX-12345': {'status': 'error', 'error': 'Upstream DJP failure'}}}
        with patch(IAP_PROXY_METHOD, return_value=mock_response):
            result = document._l10n_id_pajakio_update_status()
        self.assertFalse(result)
        self.assertFalse(document.l10n_id_pajakio_status)
        self.assertTrue(any('Upstream DJP failure' in msg.body for msg in document.message_ids))

    def test_pajakio_rejected_invoice_can_be_resent(self):
        """Test that a rejected invoice is eligible for resending via pajak.io EDI."""
        invoice = self.init_invoice("out_invoice", partner=self.partner_a, amounts=[1000], post=True)
        self._create_pajakio_document(invoice).l10n_id_pajakio_status = 'rejected'
        wizard = self.create_send_and_print(invoice)
        self.assertIn('id_pajakio', wizard.extra_edis)

    def test_pajakio_edi_not_applicable_for_non_invoice(self):
        """Test that pajak.io EDI is not applicable for refunds."""
        invoice = self.init_invoice("out_refund", partner=self.partner_a, amounts=[1000], post=True)
        wizard = self.create_send_and_print(invoice)
        self.assertFalse(wizard.extra_edis)
