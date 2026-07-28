# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models
from odoo.addons.mail.tools.discuss import Store


class MailMessage(models.Model):
    _name = 'mail.message'
    _inherit = ['mail.message', 'website.ugc.mixin']

    def _get_rel_values_to_add(self):
        value_dict = super()._get_rel_values_to_add()
        value_dict['slide.slide'] = {'ugc', 'nofollow'}
        return value_dict

    def _store_message_fields(self, res: Store.FieldList, **kwargs):
        super()._store_message_fields(res, **kwargs)
        slides = self._records_by_model_name().get("slide.slide")
        if not slides:
            return
        res.many(
            "records",
            ["comments_count"],
            as_thread=True,
            only_data=True,
            value=slides,
        )
