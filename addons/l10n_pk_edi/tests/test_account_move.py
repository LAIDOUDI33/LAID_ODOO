from odoo.tests import tagged

from odoo.addons.account.tests.common import AccountTestInvoicingCommon


@tagged('post_install_l10n', '-at_install', 'post_install')
class TestPkEdiAccountMove(AccountTestInvoicingCommon):

    @classmethod
    @AccountTestInvoicingCommon.setup_chart_template('pk')
    def setUpClass(cls):
        super().setUpClass()

        cls.uom_kg = cls.env.ref('uom.product_uom_kgm')
        cls.uom_kg.l10n_pk_edi_uom_code = '13'

        cls.product_a.write({
            'l10n_pk_edi_sale_type': '24',
            'uom_id': cls.uom_kg.id,
            'hs_code': '1234.56.78',
        })

        cls.invoice = cls.init_invoice('out_invoice', products=[cls.product_a])

        cls.pk_sindh = cls._get_or_create_state('Sindh', 'PK-SD', cls.env.ref('base.pk'))
        cls.pk_punjab = cls._get_or_create_state('Punjab', 'PK-PB', cls.env.ref('base.pk'))

    @classmethod
    def _get_or_create_state(cls, name, code, country):
        state = cls.env['res.country.state'].search([('code', '=', code), ('country_id', '=', country.id)], limit=1)
        return state or cls.env['res.country.state'].create({'name': name, 'code': code, 'country_id': country.id})

    def test_line_details_uom_and_sale_type_labels(self):
        """uoM/saleType must be resolved from the selection field, not the raw code."""
        line_details = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)
        self.assertEqual(len(line_details), 1)

        line_vals = line_details[0]
        self.assertEqual(line_vals['uoM'], 'KG')
        self.assertEqual(line_vals['saleType'], 'Goods at Reduced Rate')
        self.assertEqual(line_vals['hsCode'], self.product_a.hs_code)

    def test_line_details_unknown_codes_fall_back_to_defaults(self):
        """Missing/invalid selection codes must fall back to the documented defaults."""
        self.invoice.invoice_line_ids.l10n_pk_edi_sale_type = False
        self.uom_kg.l10n_pk_edi_uom_code = False

        line_vals = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)[0]
        self.assertEqual(line_vals['uoM'], 'Nos')
        self.assertEqual(line_vals['saleType'], 'Goods at standard rate')

    def test_line_details_payload_types(self):
        """FBR expects fixed JSON types per field; str/float must not get swapped by rounding or fallback logic."""
        line_vals = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)[0]

        float_fields = (
            'quantity', 'totalValues', 'valueSalesExcludingST', 'salesTaxApplicable',
            'salesTaxWithheldAtSource', 'furtherTax', 'discount', 'fedPayable',
        )
        for field in float_fields:
            self.assertIsInstance(line_vals[field], float, f"{field} must be a float, got {line_vals[field]!r}")

        str_fields = ('hsCode', 'productDescription', 'rate', 'uoM', 'saleType', 'extraTax')
        for field in str_fields:
            self.assertIsInstance(line_vals[field], str, f"{field} must be a str, got {line_vals[field]!r}")

        # No SRO configured on the line: these stay unset (False), not empty strings.
        self.assertIs(line_vals['sroScheduleNo'], False)
        self.assertIs(line_vals['sroItemSerialNo'], False)

        # fixedNotifiedValueOrRetailPrice switches type: float only for 3rd Schedule Goods (sale type '23').
        self.assertIsInstance(line_vals['fixedNotifiedValueOrRetailPrice'], str)
        self.invoice.invoice_line_ids.l10n_pk_edi_sale_type = '23'
        line_vals = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)[0]
        self.assertIsInstance(line_vals['fixedNotifiedValueOrRetailPrice'], float)

    def test_line_details_sro_schedule_and_item(self):
        """sroScheduleNo/sroItemSerialNo must be the SRO/item names configured on the line, not their ids."""
        # Data record: SRO 587(I)/2017, sale type '24' (Goods at Reduced Rate), same as product_a.
        sro = self.env.ref('l10n_pk_edi.l10n_pk_edi_sro_587_1_2017')
        sro_item = self.env.ref('l10n_pk_edi.l10n_pk_edi_sro_item_587_1_2017_1')
        self.assertEqual(sro.l10n_pk_edi_sale_type, self.product_a.l10n_pk_edi_sale_type)

        self.invoice.invoice_line_ids.write({
            'l10n_pk_edi_sro_id': sro.id,
            'l10n_pk_edi_sro_item_id': sro_item.id,
        })

        line_vals = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)[0]
        self.assertEqual(line_vals['sroScheduleNo'], sro.name)
        self.assertEqual(line_vals['sroItemSerialNo'], sro_item.name)

    def test_line_details_discount_excludes_tax_included_amount(self):
        """'discount' must stay tax-excluded even when the tax is price-included, matching valueSalesExcludingST's basis."""
        tax_incl_15 = self.env['account.tax'].create({
            'name': 'PK 15% (tax-included)',
            'amount': 15,
            'amount_type': 'percent',
            'type_tax_use': 'sale',
            'price_include_override': 'tax_included',
            'company_id': self.company_data['company'].id,
        })
        self.invoice.invoice_line_ids.write({
            'price_unit': 115.0,
            'quantity': 2,
            'discount': 10,
            'tax_ids': [(6, 0, [tax_incl_15.id])],
        })

        line_vals = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)[0]
        # Tax-excluded unit price is 100 (115 / 1.15); gross tax-excluded total is 200; 10% of that is 20.
        # The naive price_unit * quantity * discount / 100 would wrongly give 23 (115 * 2 * 0.10), tax included.
        self.assertAlmostEqual(line_vals['discount'], 20.0)
        self.assertAlmostEqual(line_vals['valueSalesExcludingST'], 180.0)

    def test_line_details_fixed_notified_value_excludes_tax_only_in_tax_included_mode(self):
        """fixedNotifiedValueOrRetailPrice must subtract the line's tax only when the document is encoded tax-included."""
        self.product_a.list_price = 500.0
        self.invoice.invoice_line_ids.l10n_pk_edi_sale_type = '23'
        tax_15 = self.env['account.tax'].create({
            'name': 'PK 15%',
            'amount': 15,
            'amount_type': 'percent',
            'type_tax_use': 'sale',
            'company_id': self.company_data['company'].id,
        })
        self.invoice.invoice_line_ids.tax_ids = [(6, 0, [tax_15.id])]

        self.invoice.document_tax_mode = 'tax_excluded'
        line_vals = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)[0]
        self.assertAlmostEqual(line_vals['fixedNotifiedValueOrRetailPrice'], 500.0)

        self.invoice.document_tax_mode = 'tax_included'
        line_vals = self.invoice._get_l10n_pk_edi_line_details(self.invoice.invoice_line_ids)[0]
        line = self.invoice.invoice_line_ids
        self.assertAlmostEqual(line_vals['fixedNotifiedValueOrRetailPrice'], 500.0 - (line.price_total - line.price_subtotal))

    def _configure_seller_and_buyer(self):
        self.company_data['company'].write({
            'vat': 'SELLER-NTN-001',
            'state_id': self.pk_sindh.id,
            'street': 'Seller Street',
            'l10n_pk_edi_enable': True,
        })
        self.partner_a.write({
            'vat': 'BUYER-NTN-002',
            'state_id': self.pk_punjab.id,
            'street': 'Buyer Street',
            'l10n_pk_edi_fbr_customer_status': 'registered',
        })

    def test_generate_invoice_json_values(self):
        """Every key of the FBR payload must be set from the right source field, not left default/stale."""
        self._configure_seller_and_buyer()
        seller = self.company_data['company'].partner_id
        buyer = self.partner_a

        json_payload = self.invoice._l10n_pk_edi_generate_invoice_json()

        self.assertEqual(json_payload['invoiceType'], 'Sale Invoice')
        self.assertEqual(json_payload['invoiceRefNo'], self.invoice.name or "")
        self.assertEqual(json_payload['invoiceDate'], str(self.invoice.invoice_date))

        self.assertEqual(json_payload['sellerNTNCNIC'], 'SELLER-NTN-001')
        self.assertEqual(json_payload['sellerBusinessName'], seller.display_name)
        self.assertEqual(json_payload['sellerProvince'], 'SINDH')
        self.assertEqual(json_payload['sellerAddress'], (seller._display_address() or '').replace('\n', ' '))

        # Buyer is 'registered': real vat is sent, not the '0000000' placeholder.
        self.assertEqual(json_payload['buyerNTNCNIC'], 'BUYER-NTN-002')
        self.assertEqual(json_payload['buyerBusinessName'], buyer.name)
        self.assertEqual(json_payload['buyerProvince'], 'PUNJAB')
        self.assertEqual(json_payload['buyerAddress'], (buyer._display_address() or '').replace('\n', ' '))
        self.assertEqual(json_payload['buyerRegistrationType'], 'Registered')

        self.assertEqual(len(json_payload['items']), len(self.invoice.invoice_line_ids))
        self.assertNotIn('scenarioId', json_payload, "scenarioId must be absent outside the test environment")
        self.assertNotIn('reason', json_payload, "reason is only set for debit notes against a sent origin")

    def test_generate_invoice_json_unregistered_buyer_uses_placeholder_vat(self):
        """Unregistered buyers must never leak their real NTN/CNIC to FBR."""
        self._configure_seller_and_buyer()
        self.partner_a.l10n_pk_edi_fbr_customer_status = 'unregistered'

        json_payload = self.invoice._l10n_pk_edi_generate_invoice_json()
        self.assertEqual(json_payload['buyerNTNCNIC'], '0000000')
        self.assertEqual(json_payload['buyerRegistrationType'], 'Unregistered')

    def test_generate_invoice_json_scenario_id_in_test_environment(self):
        """scenarioId must appear only when the company is in the FBR sandbox."""
        self._configure_seller_and_buyer()
        self.company_data['company'].l10n_pk_edi_test_environment = True
        self.invoice.l10n_pk_edi_testing_scenario_type = 'SN001'

        json_payload = self.invoice._l10n_pk_edi_generate_invoice_json()
        self.assertEqual(json_payload['scenarioId'], 'SN001')

    def test_generate_invoice_json_debit_note_overrides_reason_and_ref(self):
        """A debit note against a sent origin must report the FBR reason and the origin's reference, tagged '*test*'."""
        self._configure_seller_and_buyer()
        self.invoice.action_post()
        self.invoice.l10n_pk_edi_status = 'sent'
        self.invoice.l10n_pk_edi_reference = 'FBR-REF-0001'

        debit_note = self.init_invoice('out_invoice', partner=self.partner_a, products=[self.product_a])
        debit_note.write({
            'debit_origin_id': self.invoice.id,
            'l10n_pk_edi_refund_reason': 'Price correction',
        })

        json_payload = debit_note._l10n_pk_edi_generate_invoice_json()
        self.assertEqual(json_payload['invoiceType'], 'Debit Note')
        self.assertEqual(json_payload['reason'], 'Price correction')
        self.assertEqual(json_payload['invoiceRefNo'], 'FBR-REF-0001*test*')
