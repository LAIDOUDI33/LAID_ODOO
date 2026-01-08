# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models


class ProductAttributeValue(models.Model):
    _inherit = "product.attribute.value"

    def write(self, vals):
        reordered_pavs = "sequence" in vals and self.filtered(
            lambda pav: pav.sequence != vals["sequence"]
        )

        res = super().write(vals)

        if reordered_pavs:
            templates = reordered_pavs.mapped("pav_attribute_line_ids.product_tmpl_id")
            templates._update_images_assignments()

        return res
