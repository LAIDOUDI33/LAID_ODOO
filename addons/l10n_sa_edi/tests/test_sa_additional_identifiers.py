from odoo.tests import tagged
from odoo.addons.account.tests.common import AccountTestInvoicingCommon


@tagged('post_install_l10n', '-at_install', 'post_install')
class TestL10nSaAdditionalIdentifiers(AccountTestInvoicingCommon):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.saudi_arabia = cls.env.ref('base.sa')
        cls.partner_sa = cls.env['res.partner'].create({
            'name': 'Test Saudi Partner',
            'country_id': cls.saudi_arabia.id,
        })

    def test_computed_scheme_and_number(self):
        """Computed fields should reflect the active 'SA' identifier."""
        self.partner_sa._set_additional_identifier('SA_CRN', '2525252525252')
        self.assertEqual(self.partner_sa.l10n_sa_edi_additional_identification_scheme, 'CRN')
        self.assertEqual(self.partner_sa.l10n_sa_edi_additional_identification_number, '2525252525252')

    def test_inverse_scheme_and_number(self):
        """Inverse fields should update the 'SA' additional identifiers"""
        self.partner_sa.l10n_sa_edi_additional_identification_scheme = 'CRN'
        self.partner_sa.l10n_sa_edi_additional_identification_number = '2525252525252'
        self.assertIn('SA_CRN', self.partner_sa.additional_identifiers)
        self.assertEqual(self.partner_sa.additional_identifiers['SA_CRN'], '2525252525252')
