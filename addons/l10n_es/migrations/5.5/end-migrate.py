from odoo import api, SUPERUSER_ID


def migrate(cr, version):
    env = api.Environment(cr, SUPERUSER_ID, {})
    NEW_TAXES = [
        "account_tax_template_s_iva0_eu_e_t",
        "account_tax_template_s_iva0_eu_e_m",
        "account_tax_template_s_iva0_eu_e_h",
        "account_tax_template_s_iva0_bc",
        "account_tax_template_s_iva_0_bc_tai",
        "account_tax_template_s_iva_0_bc_sus",
    ]

    def get_tax_from_xmlid(company_id, k):
        return env.ref(f"account.{company_id}_{k}", raise_if_not_found=False)

    for company in env['res.company'].search([('chart_template', '=', 'es_pymes')], order="parent_path"):
        # Create new taxes
        ChartTemplate = env["account.chart.template"].with_company(company)
        taxes = {
            k: v
            for k, v in ChartTemplate._get_account_tax(company.chart_template).items()
            if k in NEW_TAXES and not bool(get_tax_from_xmlid(company.id, k))
        }
        ChartTemplate._load_data({"account.tax": taxes})

        # Patch tags
        data = [
            ("account_tax_template_p_iva21_sp_in", "mod349[I]"),
            ("account_tax_template_p_iva21_ic_bc", "mod349[A]"),
            ("account_tax_template_p_iva21_ic_bi", "mod349[A]"),
            ("account_tax_template_p_iva4_ic_bc", "mod349[A]"),
            ("account_tax_template_p_iva4_ic_bi", "mod349[A]"),
            ("account_tax_template_p_iva5_ic_bi", "mod349[A]"),
            ("account_tax_template_p_iva10_ic_bc", "mod349[A]"),
            ("account_tax_template_p_iva10_ic_bi", "mod349[A]"),
            ("account_tax_template_p_iva7-5_ic_bc", "mod349[A]"),
            ("account_tax_template_p_iva7-5_ic_sc", "mod349[I]"),
            ("account_tax_template_p_iva5_ic_bc", "mod349[A]"),
            ("account_tax_template_p_iva5_ic_sc", "mod349[I]"),
            ("account_tax_template_p_iva2_ic_bc", "mod349[A]"),
            ("account_tax_template_p_iva2_ic_sc", "mod349[I]"),
            ("account_tax_template_p_iva0_ic_bc", "mod349[A]"),
            ("account_tax_template_p_iva0_ic_sc", "mod349[I]"),
            ("account_tax_template_s_iva0_sp_i", "mod349[S]"),
            ("account_tax_template_p_iva10_sp_in", "mod349[I]"),
            ("account_tax_template_p_iva4_sp_in", "mod349[I]"),
            ("account_tax_template_s_iva0_g_i", "mod349[E]"),
        ]
        for xmlid, tag_name in data:
            tax = get_tax_from_xmlid(company.id, xmlid)
            tag = env['account.account.tag'].search([('name', '=', tag_name)], limit=1)

            if not tax or not tag:
                continue

            lines = tax.repartition_line_ids.filtered(
                lambda l: l.repartition_type == 'base' and l.document_type == 'invoice'
            )
            for line in lines:
                if tag not in line.tag_ids:
                    line.tag_ids = [(4, tag.id)]
