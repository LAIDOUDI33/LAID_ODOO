from odoo import api, models


class MailMessage(models.Model):
    _name = "mail.message"
    _inherit = ["mail.message", "website.ugc.mixin"]

    @api.model
    def _get_rel_values_to_add(self):
        value_dict = super()._get_rel_values_to_add()
        value_dict["product.template"] = {"ugc", "nofollow"}
        return value_dict
