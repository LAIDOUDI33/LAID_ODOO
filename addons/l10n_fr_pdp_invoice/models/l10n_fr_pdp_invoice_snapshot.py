from odoo import fields, models


class L10nFrPdpInvoiceSnapshot(models.Model):
    _name = 'l10n_fr_pdp.invoice.snapshot'
    _description = 'French PDP Invoice Rate Snapshot'

    move_id = fields.Many2one(
        comodel_name='account.move',
        required=True,
        ondelete='cascade',
    )
    late_payment_penalties_rate = fields.Float(
        string="Late Payment Penalties Rate",
        digits=(16, 2),
        required=True,
    )
    late_payment_penalties_period = fields.Date(
        string="Late Payment Penalties Rate Period",
    )

    _sql_constraints = [
        (
            'move_id_unique',
            'unique(move_id)',
            "A late payment penalty rate already exists for this invoice.",
        ),
    ]
