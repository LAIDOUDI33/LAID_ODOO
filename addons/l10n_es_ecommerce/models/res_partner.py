# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models


class ResPartner(models.Model):
    _inherit = 'res.partner'

    def _get_mandatory_billing_address_fields(self, country_sudo, **kwargs):
        """Make the VAT/NIF mandatory or optional on Spanish e-commerce orders
        based on the order amount, regardless of the customer's billing country.

        Orders whose total is below the ``l10n_es_ecommerce.simplified_invoice_limit``
        may be invoiced with a simplified invoice, which does not require the
        customer's VAT. At or above the limit — or when the amount can't be
        determined — VAT stays mandatory.
        """
        field_names = super()._get_mandatory_billing_address_fields(country_sudo, **kwargs)

        if self.env.company.country_code != 'ES':
            return field_names

        # The order is forwarded through the address-submit flow as a kwarg. The
        # dynamic "country changed" refresh route doesn't pass it, so fall back
        # to the current website cart.
        order_sudo = kwargs.get('order_sudo')
        if not order_sudo:
            # Can't determine the amount: keep VAT mandatory (safer default).
            field_names.add('vat')
            return field_names

        threshold_amount = self.env['ir.config_parameter'].sudo().get_float(
            'l10n_es_ecommerce.simplified_invoice_limit', 400.0,
        )
        if order_sudo.amount_total < threshold_amount:
            field_names.discard('vat')
        else:
            field_names.add('vat')

        return field_names
