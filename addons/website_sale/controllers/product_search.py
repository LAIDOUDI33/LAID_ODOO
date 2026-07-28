# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.fields import Domain
from odoo.http import Controller, request, route


class ProductSearch(Controller):
    @route(
        "/shop/product_search/filters", type="jsonrpc", auth="public", website=True, readonly=True
    )
    def product_search_filters(self):
        tags_domain = Domain.AND([
            Domain("visible_to_customers", "=", True),
            request.env.website.website_domain(),
        ])
        tags = request.env["product.tag"].search_read(tags_domain, ["id", "name"], order="name")

        attributes = request.env["product.attribute"].search(
            [("visibility", "=", "visible")], order="sequence, id"
        )
        attributes_data = [
            {
                "id": attribute.id,
                "name": attribute.name,
                "display_type": attribute.display_type,
                "values": [
                    {
                        "id": value.id,
                        "name": value.name,
                        "html_color": value.html_color,
                        "has_image": bool(value.image),
                    }
                    for value in attribute.value_ids
                ],
            }
            for attribute in attributes
            if attribute.value_ids
        ]

        return {"tags": tags, "attributes": attributes_data}
