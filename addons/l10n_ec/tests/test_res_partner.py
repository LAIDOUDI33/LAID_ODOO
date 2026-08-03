from odoo.exceptions import ValidationError
from odoo.tests.common import TransactionCase, tagged


@tagged('post_install_l10n', 'post_install', '-at_install')
class TestEcAccountMove(TransactionCase):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.ec_partner = cls.env['res.partner'].create({
            'name': 'Ecuadorian Partner',
            'l10n_latam_identification_type_id': cls.env.ref('l10n_ec.ec_ruc').id,
            'country_id': cls.env.ref('base.ec').id,
        })

    def test_ec_partner_vat_validation(self):
        with self.assertRaises(ValidationError, msg="If your identification type is RUC, it must be 13 digits"):
            self.ec_partner.vat = '17100340650'

        with self.assertRaises(ValidationError, msg="If your identification type is RUC, it must be 13 digits"):
            self.ec_partner.vat = '171003406500A'

        self.ec_partner.l10n_latam_identification_type_id = self.env.ref('l10n_ec.ec_dni')
        with self.assertRaises(ValidationError, msg="If your identification type is Citizenship, it must be 10 digits"):
            self.ec_partner.vat = '1710034'

        with self.assertRaises(ValidationError, msg="If your identification type is Citizenship, it must be 10 digits"):
            self.ec_partner.vat = '171003406A'
