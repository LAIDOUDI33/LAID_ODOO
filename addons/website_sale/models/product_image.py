# Part of Odoo. See LICENSE file for full copyright and licensing details.

from urllib.parse import urlparse

from odoo import api, fields, models
from odoo.exceptions import ValidationError
from odoo.tools.image import is_image_size_above


class ProductImage(models.Model):
    _name = "product.image"
    _description = "Product Image"
    _inherit = ["image.mixin"]
    _order = "has_attribute_value desc, sequence, id"

    name = fields.Char(string="Name", required=True)
    sequence = fields.Integer(default=10)

    image_1920 = fields.Image()

    product_tmpl_id = fields.Many2one(
        string="Product Template", comodel_name="product.template", ondelete="cascade", index=True
    )

    video_url = fields.Char(string="Video URL", help="URL of a video for showcasing your product.")

    can_image_1024_be_zoomed = fields.Boolean(
        string="Can Image 1024 be zoomed", compute="_compute_can_image_1024_be_zoomed", store=True
    )

    attribute_value_ids = fields.Many2many(
        comodel_name="product.template.attribute.value",
        relation="product_image_attribute_value_rel",
    )
    has_attribute_value = fields.Boolean(compute="_compute_has_attribute_value", store=True)

    # === COMPUTE METHODS ===#

    @api.depends("image_1920", "image_1024")
    def _compute_can_image_1024_be_zoomed(self):
        for image in self:
            image.can_image_1024_be_zoomed = image.image_1920 and is_image_size_above(
                image.image_1920, image.image_1024
            )

    @api.depends("attribute_value_ids")
    def _compute_has_attribute_value(self):
        for image in self:
            image.has_attribute_value = bool(image.attribute_value_ids)

    # === CONSTRAINT METHODS ===#

    @api.constrains("video_url")
    def _check_valid_video_url(self):
        for image in self:
            if image.video_url and not urlparse(image.video_url):
                raise ValidationError(
                    image.env._(
                        "Provided video URL for '%s' is not valid. Please enter a valid video URL.",
                        image.name,
                    )
                )

    # === CRUD METHODS ===#

    @api.model_create_multi
    def create(self, vals_list):
        images = super().create(vals_list)
        images.product_tmpl_id.product_variant_ids._update_computed_main_image()
        return images

    def write(self, vals):
        res = super().write(vals)

        if {"sequence", "attribute_value_ids", "image_1920"} & vals.keys():
            self.product_tmpl_id._update_computed_main_image()
            self.product_tmpl_id.product_variant_ids._update_computed_main_image()
        return res

    def unlink(self):
        product_templates = self.mapped("product_tmpl_id")
        product_variants = product_templates.product_variant_ids

        template_restore_computed = {
            template.id: bool(template.computed_main_image_id)
            for template in product_templates
        }
        variant_restore_computed = {
            product.id: bool(product.computed_main_image_id)
            for product in product_variants
        }

        res = super().unlink()

        product_templates._update_computed_main_image(
            restore_computed=template_restore_computed,
        )
        product_variants._update_computed_main_image(
            restore_computed=variant_restore_computed,
        )
        return res
