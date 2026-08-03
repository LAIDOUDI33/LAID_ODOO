from odoo import api, fields, models


class MailingMailing(models.Model):
    _inherit = 'mailing.mailing'

    @api.depends('card_campaign_id')
    def _compute_mailing_domain(self):
        super()._compute_mailing_domain()

        # we consider if the card campaign is based on an (allowed) model, from the event module, that has an "event_id" field
        # it's always relevant to limit the domain to the related event
        context_event_id = self.env.context.get('card_mailing_event_id')
        for mailing in self.filtered(
            lambda m: m.card_campaign_id and m.card_campaign_id.res_model in m.card_campaign_id._get_allowed_event_model_names()
        ):
            event_id = context_event_id
            if not event_id:
                # sharing from the campaign, the record it was designed on is the only hint of an event
                preview_record = mailing.card_campaign_id.preview_record_ref
                event_id = preview_record.event_id.id if preview_record and 'event_id' in preview_record else False
            if not event_id:
                continue
            mailing_domain = fields.Domain(mailing._parse_mailing_domain())
            TargetModel = self.env[mailing.card_campaign_id.res_model]
            if not any(condition.field_expr == 'event_id' for condition in mailing_domain.iter_conditions()):
                final_domain = fields.Domain('event_id', '=', event_id) & mailing_domain
            else:
                # only support explicit '=' or 'in', if the condition is more complex nothing happens
                # it is assumed the user knows what they are doing
                final_domain = mailing_domain.optimize(TargetModel).map_conditions(
                    lambda condition: (
                        fields.Domain('event_id', '=', event_id)
                        if condition.field_expr == 'event_id' and condition.operator == 'in'
                        else condition
                    )
                ).optimize(TargetModel)
            mailing.mailing_domain = repr(final_domain)
