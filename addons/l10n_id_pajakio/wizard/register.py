from odoo import _, fields, models
from odoo.exceptions import UserError


class PajakioRegistrationForm(models.TransientModel):

    _name = "l10n_id_pajakio.registration.form"
    _description = "Pop-up to allow user enter credentials for Pajak.io"

    company_id = fields.Many2one('res.company', default=lambda self: self.env.company)

    # The fields are combination of user and company registration fields
    email = fields.Char(string="Email", required=True)
    password = fields.Char(
        string="Password",
        required=True,
        help="Password needs to \n - Contain capital letters\n- Contain numbers\n - Contain symbols\n - Be at least 8 characters long",
    )
    user_name = fields.Char(string="Name")
    phone = fields.Char(string="Phone")
    company_name = fields.Char(string="Company Name")
    npwp = fields.Char(string="NPWP", readonly=True)
    address = fields.Char(string="Address")
    city = fields.Char(string="City")

    def action_register_user(self):
        """ Sign-up procedure. Use IAP utility to send request to route /api/pajakio/1/register_user"""
        payload = {
            "email": self.email,
            "nama": self.user_name,
            "telp": self.phone,
            "password": self.password,
        }
        response = self.env["iap.account"]._l10n_id_pajakio_iap_connect(
            {"reg_payload": payload},
            "/api/pajakio/1/register_user",
        )

        # if error in response, then report the error
        # else save the email on
        if 'error' in response:
            raise UserError(response.get('error'))

        self.company_id.l10n_id_pajakio_email = self.email
        return self.company_id._l10n_id_pajakio_action_register_company()

    def action_register_company(self):
        """ Company registration procedure. Can only be run once user is registered. Will retrieve client ID from
         Pajak.io which we will store internally and link it to the company """
        payload = {
            "email": self.email,
            "password": self.password,
            "npwp": self.npwp,
            "nama": self.company_name,
            "alamat": self.address,
            "kota": self.city,
            "partnerCode": "ODOO",  # fixed result for Pajak.io team to identify our account as Odoo partner
        }
        response = self.env["iap.account"]._l10n_id_pajakio_iap_connect(
            {"reg_payload": payload},
            "/api/pajakio/1/register_company",
        )

        # if error in response, report the error
        # else save client_id
        if 'error' in response:
            raise UserError(response.get('error'))

        client_id = response.get('data', {}).get('clientId')
        self.company_id.l10n_id_pajakio_client_id = client_id

        self.company_id._l10n_id_pajakio_activate()

    def action_sign_in(self):
        """ If pajak.io account is already created outside Odoo, user can sign ing with email-password-npwp"""

        payload = {
            "email": self.email,
            "password": self.password,
            "npwp": self.npwp,
        }

        response = self.env["iap.account"]._l10n_id_pajakio_iap_connect(
            {"payload": payload},
            "/api/pajakio/1/sign_in",
        )

        # if error in response, report the error
        # else save client_id
        if 'error' in response:
            raise UserError(_("Sign in failed: %(error)s", error=response.get('error')))

        client_id = response.get('data', {}).get('clientId')
        self.company_id.l10n_id_pajakio_email = self.email
        self.company_id.l10n_id_pajakio_client_id = client_id

        self.company_id._l10n_id_pajakio_activate()
