# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import fields, models, api


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    is_reward_line = fields.Boolean(
        help="Whether this line is part of a reward or not.")
    reward_id = fields.Many2one(
        'loyalty.reward', "Reward", ondelete='restrict',
        help="The reward associated with this line.", index='btree_not_null')
    card_id = fields.Many2one(
        'loyalty.card', "Card", ondelete='restrict',
        help="The card used to claim that reward.")
    points_cost = fields.Float(help="How many points this reward cost.")

    @api.model
    def _load_pos_data_fields(self, config):
        params = super()._load_pos_data_fields(config)
        params += ['is_reward_line', 'reward_id', 'points_cost', 'card_id']
        return params

    def _has_discount(self):
        return super()._has_discount() or (self.is_reward_line and self.reward_id.reward_type == 'discount')

    def _get_discount_amount_for_report(self):
        if self.is_reward_line:
            return abs(self.price_subtotal_incl)
        return super()._get_discount_amount_for_report()

    def isRefund(self):
        return super().isRefund() and not self.is_reward_line
