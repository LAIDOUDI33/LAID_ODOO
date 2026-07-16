# Part of Odoo. See LICENSE file for full copyright and licensing details.
from odoo import models
from odoo.fields import Domain


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    def _load_pos_self_data_domain(self, data, config):
        domain = super()._load_pos_self_data_domain(data, config)

        rewards = config._get_program_ids().reward_ids
        reward_products = rewards.discount_line_product_id | rewards.reward_product_ids | rewards.reward_product_id
        reward_product_tmpl_ids = reward_products._filtered_access('read').product_tmpl_id.ids
        if reward_product_tmpl_ids:
            domain = Domain.OR([domain, [('id', 'in', reward_product_tmpl_ids)]])
        return domain
