from odoo import models


class MailMessage(models.Model):
    _name = 'mail.message'
    _inherit = ['mail.message', 'website.ugc.mixin']

    def _get_rel_values_to_add(self):
        value_dict = super()._get_rel_values_to_add()
        value_dict['blog.post'] = {'ugc', 'nofollow'}
        return value_dict
