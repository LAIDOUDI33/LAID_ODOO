# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import _, api, fields, models
from odoo.exceptions import UserError

class LoyaltyCard(models.Model):
    _name = "loyalty.card"
    _inherit = ["loyalty.card", "pos.load.mixin"]

    source_pos_order_id = fields.Many2one(
        string="POS Order Reference",
        help="The POS order from which coupon is generated",
        comodel_name="pos.order",
        readonly=True,
        index="btree_not_null",
    )

    def _has_source_order(self):
        return super()._has_source_order() or bool(self.source_pos_order_id)

    @api.model
    def _load_pos_data_domain(self, data, config):
        return False

    @api.model
    def _load_pos_data_fields(self, config):
        return ['partner_id', 'code', 'points', 'points_display', 'program_id', 'expiration_date', 'write_date']
    
    @api.model
    def get_card_status(self, code, config_id):
        config = self.env['pos.config'].browse(config_id)
        card = self.search([('code', '=', code)], limit=1)
        in_config = card.program_id.id in config._get_program_ids().ids
        is_valid_gift_card = card.exists() and in_config and (not card.expiration_date or card.expiration_date > fields.Date.context_today(self)) and card.points > 0
        is_valid_gift_card = is_valid_gift_card and (card.program_id.program_type == 'gift_card') and not card.partner_id
        is_valid_gift_card = is_valid_gift_card and len([id for id in card.history_ids.mapped('order_id') if id != 0]) == 0
        card_fields = self._load_pos_data_fields(config_id)

        return {
            'status': bool(is_valid_gift_card) or not card.exists(),
            'loyalty.card': card.read(card_fields, load=False) if in_config else [],
            'has_source_order': card._has_source_order() if in_config else False,
        }

    @api.model
    def create_pos_cards(self, requests, config_id):
        """Create/resolve the loyalty cards funded by trigger-product lines at payment time.

        Each request is ``{'program_id', 'partner_id'}`` for one gift-card/eWallet line.
        A nominative program (eWallet) requires a partner and reuses their existing card;
        a gift card always gets a fresh card. Cards are created with a zero balance: the
        amount paid is credited server-side in ``pos.order._process_loyalty`` when the order
        is saved. Returns the cards' POS data plus ``card_ids`` aligned to ``requests`` so the
        client can stamp ``card_id`` on the matching line.
        """
        valid_program_ids = set(self.env['pos.config'].browse(config_id)._get_program_ids().ids)
        LoyaltyCard = self.with_context(action_no_send_mail=True).sudo()
        card_ids = []
        cards = self.env['loyalty.card'].sudo()
        for req in requests:
            program = self.env['loyalty.program'].browse(req['program_id'])
            if program.id not in valid_program_ids or program.program_type not in ('gift_card', 'ewallet'):
                raise UserError(_("This program cannot be used to create a card."))
            partner_id = req.get('partner_id') or False
            code = req.get('code') or False
            card = self.env['loyalty.card']
            if program.is_nominative:
                if not partner_id:
                    raise UserError(_("A customer is required to create a %s card.", program.name))
                card = LoyaltyCard.search([
                    ('program_id', '=', program.id),
                    ('partner_id', '=', partner_id),
                ], limit=1)
            elif code:
                card = LoyaltyCard.search([('code', '=', code)], limit=1)
            if not card:
                vals = {
                    'program_id': program.id,
                    'partner_id': partner_id,
                    'points': 0,
                    'expiration_date': program.date_to or False,
                }
                if code:
                    vals['code'] = code
                card = LoyaltyCard.create(vals)
            card_ids.append(card.id)
            cards |= card
        return {
            'card_ids': card_ids,
            'loyalty.card': cards.read(self._load_pos_data_fields(config_id), load=False),
        }

    def _send_creation_communication(self, force_send=False):
        """Override to log a sold gift card's email in its source pos.order's chatter."""
        mail_ids = super()._send_creation_communication(force_send=force_send)
        for mail in self.env['mail.mail'].browse([mid for mid in mail_ids if mid]):
            if mail.model != 'loyalty.card' or mail.res_id not in self.ids:
                continue
            card = self.browse(mail.res_id)
            if card.program_id.program_type == 'gift_card' and card.source_pos_order_id:
                card.source_pos_order_id.message_post(body=mail.body_content)
        return mail_ids
