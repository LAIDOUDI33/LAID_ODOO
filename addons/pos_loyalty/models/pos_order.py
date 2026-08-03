# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from collections import defaultdict

from odoo import fields, models, api


class PosOrder(models.Model):
    _inherit = 'pos.order'

    def _process_saved_order(self, draft):
        """
        Override to update loyalty points and generate history lines
        """
        res = super()._process_saved_order(draft)
        if not draft and self.state != 'cancel':
            self._process_loyalty()

        return res

    def read_pos_data(self, data, config):
        """Return the loyalty cards touched by these orders alongside the order data.

        ``_process_loyalty`` credits/debits cards server-side after the order is saved, but
        the base sync response carries no ``loyalty.card`` records. Without this, a card sold
        or credited on the order keeps its stale in-memory balance (e.g. a gift card sold and
        then redeemed in the same session would read a 0 balance). Sending the cards back lets
        the client refresh their points via ``loadConnectedData``.
        """
        result = super().read_pos_data(data, config)
        if config:
            history = self.env['loyalty.history'].sudo().search([
                ('order_model', '=', 'pos.order'),
                ('order_id', 'in', self.ids),
            ])
            cards = self.lines.card_id | history.card_id
            result['loyalty.card'] = self.env['loyalty.card']._load_pos_data_read(cards, config)

            programs = self.lines.filtered('is_reward_line').reward_id.program_id
            if programs:
                programs.invalidate_recordset(['pos_order_count', 'total_order_count'])
                result['loyalty.program'] = self.env['loyalty.program']._load_pos_data_read(
                    programs, config
                )
        return result

    def _process_loyalty(self):
        """Create/credit the loyalty cards involved in this order and record history.

        Every program that takes part in the order goes through a card:
        - points *issued* by the order are recomputed server-side from the rules
        - points *used* are taken from the reward lines' ``points_cost``;
        - one loyalty.history line per card records both.

        :returns: the loyalty.card records created or credited.
        """
        if not self.config_id:
            return self.env['loyalty.card']

        if self.env['loyalty.history'].sudo().search_count([
            ('order_model', '=', 'pos.order'),
            ('order_id', '=', self.id),
        ]):
            return self.env['loyalty.card']

        programs = self.config_id._get_program_ids(check_usage=False)
        credited_cards = self.env['loyalty.card'].sudo()
        history_vals = []

        funding_lines = self.lines.filtered(
            lambda l: not l.is_reward_line and l.card_id.program_id in programs
        )
        sold_gift_cards = self.env['loyalty.card'].sudo()
        for line in funding_lines:
            card = line.card_id
            points_issued = card.program_id._get_pos_order_points(self, line)
            if card.program_id.program_type == 'gift_card' and not card.source_pos_order_id:
                card.source_pos_order_id = self.id
                sold_gift_cards |= card
                if card.points:
                    points_issued = 0
            card.points += points_issued
            credited_cards |= card
            history_vals.append({
                'card_id': card.id,
                'order_model': 'pos.order',
                'order_id': self.id,
                'issued': points_issued,
                'used': 0,
                'description': self.name,
            })

        if sold_gift_cards:
            sold_gift_cards.with_context(action_no_send_mail=False)._send_creation_communication()

        earning_lines = self.lines - funding_lines
        for program in programs:
            reward_lines = self.lines.filtered(
                lambda l: l.is_reward_line and l.reward_id.program_id == program
            )
            if self.is_refund and not program.is_payment_program:
                points_issued = self._get_refund_reversal_points(program)
            else:
                points_issued = program._get_pos_order_points(self, earning_lines)

            if (program.applies_on == 'current' and not reward_lines) or (not points_issued and not reward_lines):
                continue

            # Enforce the usage limit against the count before this order: total_order_count
            # already includes this order when it carries a reward line, so subtract that so
            # the order reaching the cap is still credited while later orders are skipped.
            if program.limit_usage:
                prior_usage = program.total_order_count - (1 if reward_lines else 0)
                if prior_usage >= program.max_usage:
                    continue

            card = self._get_loyalty_card_to_credit(program, reward_lines)
            if not card:
                continue

            reward_lines.filtered(lambda l: not l.card_id).card_id = card
            points_used = sum(reward_lines.mapped('points_cost'))

            card.points += points_issued - points_used
            credited_cards |= card
            history_vals.append({
                'card_id': card.id,
                'order_model': 'pos.order',
                'order_id': self.id,
                'issued': points_issued,
                'used': points_used,
                'description': self.name,
            })

        if history_vals:
            self.env['loyalty.history'].sudo().create(history_vals)
        return credited_cards

    def _get_refund_reversal_points(self, program):
        """
        Negative points to remove for ``program`` on this refund order.
        """
        self.ensure_one()
        refund_lines = self.lines.filtered(
            lambda l: l.refunded_orderline_id and not l.is_reward_line
        )
        if not refund_lines:
            return 0

        lines_by_origin = defaultdict(lambda: self.env['pos.order.line'])
        for line in refund_lines:
            lines_by_origin[line.refunded_orderline_id.order_id] |= line

        reversal = 0.0
        for origin_order, origin_refund_lines in lines_by_origin.items():
            history = self.env['loyalty.history'].sudo().search([
                ('order_model', '=', 'pos.order'),
                ('order_id', '=', origin_order.id),
                ('card_id.program_id', '=', program.id),
            ])
            net_issued = sum(history.mapped('issued')) - sum(history.mapped('used'))
            if net_issued <= 0:
                continue
            origin_base = sum(
                origin_order.lines
                .filtered(lambda l: not l.is_reward_line)
                .mapped('price_subtotal_incl')
            )
            if not origin_base:
                continue
            refunded_base = 0.0
            for line in origin_refund_lines:
                origin_line = line.refunded_orderline_id
                if not origin_line.qty:
                    continue
                refunded_base += origin_line.price_subtotal_incl * (-line.qty / origin_line.qty)
            reversal += net_issued * (refunded_base / origin_base)

        return -reversal

    def _get_loyalty_card_to_credit(self, program, reward_lines):
        """Find or create the card that should receive/spend points.

        A reward line may already reference the card it spends from (a gift card / eWallet).
        Otherwise a nominative program reserves its card to a customer and keeps it across orders,
        while a reward applied to the current order is anonymous and just gets a throwaway per-order card,
        no partner needed.
        """
        if reward_lines.card_id:
            return reward_lines.card_id[:1]

        LoyaltyCard = self.env['loyalty.card'].with_context(action_no_send_mail=True).sudo()

        if program.is_nominative:
            if not self.partner_id:
                return
            existing = LoyaltyCard.search([
                ('program_id', '=', program.id),
                ('partner_id', '=', self.partner_id.id),
            ], limit=1)
            if existing:
                return existing

        return LoyaltyCard.create({
            'program_id': program.id,
            'partner_id': self.partner_id.id if program.is_nominative else False,
            'points': 0,
            'expiration_date': program.date_to or False,
            'source_pos_order_id': self.id,
        })
