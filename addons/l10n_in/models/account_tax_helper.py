from odoo import models
from odoo.tools import SQL


class AccountTaxHelper(models.AbstractModel):
    _name = "account.tax.helper"
    _description = "Account Tax Helper"

    def _get_tax_details(
        self,
        domain,
        include_aml_id=False,
        include_aml_name=False,
        include_move_ref=False,
        include_product_id=False,
        include_reversed_entry_id=False,
        include_debit_origin_id=False,
        include_l10n_in_account_return_id=False,
        include_l10n_in_gstr2b_reconciliation_status=False,
        include_account_id=False,
        include_non_itc=False,
        include_export_details=False,
        include_foreign_currency_amount=False,
        include_currency_id=False,
    ):
        domain_query = self.env["account.move.line"]._search(domain)

        aml_id_query = (
            SQL(", ANY_VALUE(aml.id) AS line_id") if include_aml_id else SQL("")
        )
        aml_name_query = (
            SQL(", ANY_VALUE(aml.name) AS line_name") if include_aml_name else SQL("")
        )
        move_ref_query = (
            SQL(", ANY_VALUE(move.ref) AS move_ref") if include_move_ref else SQL("")
        )
        product_id_query = (
            SQL(", ANY_VALUE(aml.product_id) AS product_id")
            if include_product_id
            else SQL("")
        )
        reversed_entry_id_query = (
            SQL(", ANY_VALUE(move.reversed_entry_id) AS reversed_entry_id")
            if include_reversed_entry_id
            else SQL("")
        )
        debit_origin_id_query = (
            SQL(", ANY_VALUE(move.debit_origin_id) AS debit_origin_id")
            if include_debit_origin_id
            else SQL("")
        )
        l10n_in_account_return_id_query = (
            SQL(", ANY_VALUE(move.l10n_in_account_return_id) AS account_return_id")
            if include_l10n_in_account_return_id
            else SQL("")
        )
        l10n_in_gstr2b_reconciliation_status_query = (
            SQL(", ANY_VALUE(move.l10n_in_gstr2b_reconciliation_status) AS gstr2b_reconciliation_status")
            if include_l10n_in_gstr2b_reconciliation_status
            else SQL("")
        )
        account_id_query = (
            SQL(", ANY_VALUE(aml.account_id) AS account_id")
            if include_account_id
            else SQL("")
        )
        non_itc_query = (
            SQL(
                '''
                HAVING BOOL_OR(CASE
                    WHEN rel.account_account_tag_id IN (%(non_itc_tag)s, %(other_non_itc_tag)s)
                    THEN TRUE
                    ELSE FALSE
                END) = TRUE;
                '''
                ,
                non_itc_tag=self.env.ref("l10n_in.tax_tag_non_itc").id,
                other_non_itc_tag=self.env.ref("l10n_in.tax_tag_other_non_itc").id,
            )
            if include_non_itc
            else SQL(";")
        )
        non_itc_tag_query = (
            SQL(
                '''
                , %(non_itc_tag)s
                , %(other_non_itc_tag)s
                ''',
                non_itc_tag=self.env.ref("l10n_in.tax_tag_non_itc").id,
                other_non_itc_tag=self.env.ref("l10n_in.tax_tag_other_non_itc").id,
            )
            if include_non_itc
            else SQL("")
        )
        export_details_query = (
            SQL(
                '''
                , ANY_VALUE(move.l10n_in_shipping_bill_number) AS l10n_in_shipping_bill_number
                , ANY_VALUE(move.l10n_in_shipping_bill_date) AS l10n_in_shipping_bill_date
                , ANY_VALUE(move.l10n_in_shipping_port_code_id) AS l10n_in_shipping_port_code_id
                '''
            )
        ) if include_export_details else SQL("")
        foreign_currency_amount_query = (
            SQL(
                '''
                , ANY_VALUE(aml.amount_currency) AS amount_currency
                '''
            )
        ) if include_foreign_currency_amount else SQL("")
        currency_id_query = (
            SQL(
                '''
                , ANY_VALUE(aml.currency_id) AS currency_id
                '''
            )
        ) if include_currency_id else SQL("")

        self.env.cr.execute(
            SQL(
                '''
            DROP TABLE IF EXISTS gst_tax_details_by_base_lines;

            CREATE TEMPORARY TABLE gst_tax_details_by_base_lines ON COMMIT DROP AS
            SELECT aml.id AS base_line_id,
                   ANY_VALUE(aml.balance) AS base_amount,
                   ANY_VALUE(aml.move_id) AS move_id,
                   ANY_VALUE(aml.l10n_in_gstr_section) AS l10n_in_gstr_section,
                   ANY_VALUE(aml.l10n_in_hsn_code) AS l10n_in_hsn_code,
                   ANY_VALUE(aml.quantity) AS quantity,
                   ANY_VALUE(aml.product_uom_id) AS product_uom_id,
                   ANY_VALUE(move.commercial_partner_id) AS move_commercial_partner_id,
                   ANY_VALUE(move.name) AS move_name,
                   ANY_VALUE(move.move_type) AS move_type,
                   ANY_VALUE(move.invoice_date) AS invoice_date,
                   ANY_VALUE(move.amount_total_signed) AS amount_total_signed,
                   ANY_VALUE(move.l10n_in_state_id) AS l10n_in_state_id,
                   ANY_VALUE(move.l10n_in_gst_treatment) AS l10n_in_gst_treatment,
                   SUM(CASE
                           WHEN rel.account_account_tag_id = %(igst_tag)s
                           THEN td.tax_amount
                           ELSE 0
                       END) AS igst,
                   SUM(CASE
                           WHEN rel.account_account_tag_id = %(cgst_tag)s
                           THEN td.tax_amount
                           ELSE 0
                       END) AS cgst,
                   SUM(CASE
                           WHEN rel.account_account_tag_id = %(sgst_tag)s
                           THEN td.tax_amount
                           ELSE 0
                       END) AS sgst,
                   SUM(CASE
                           WHEN rel.account_account_tag_id = %(cess_tag)s
                           THEN td.tax_amount
                           ELSE 0
                       END) AS cess,
                   COALESCE(MAX(CASE WHEN rel.account_account_tag_id = %(igst_tag)s THEN tax.amount END), 0)
                   + COALESCE(MAX(CASE WHEN rel.account_account_tag_id = %(cgst_tag)s THEN tax.amount END), 0)
                   + COALESCE(MAX(CASE WHEN rel.account_account_tag_id = %(sgst_tag)s THEN tax.amount END), 0)
                   AS gst_tax_rate
                   %(aml_id_query)s
                   %(aml_name_query)s
                   %(move_ref_query)s
                   %(product_id_query)s
                   %(reversed_entry_id_query)s
                   %(debit_origin_id_query)s
                   %(account_return_id_query)s
                   %(l10n_in_gstr2b_reconciliation_status_query)s
                   %(account_id_query)s
                   %(export_details_query)s
                   %(foreign_currency_amount_query)s
                   %(currency_id_query)s
            FROM (
                SELECT account_move_line.*
                FROM %(aml_from_clause)s
                WHERE %(aml_where_clause)s
                  AND account_move_line.tax_repartition_line_id IS NULL
             ) as aml
             LEFT JOIN (%(tax_details_query)s) AS td
               ON td.base_line_id = aml.id
             LEFT JOIN account_tax tax
               ON tax.id = td.tax_id
             LEFT JOIN account_account_tag_account_tax_repartition_line_rel rel
               ON (
                   rel.account_tax_repartition_line_id = td.tax_repartition_line_id
                   AND rel.account_account_tag_id IN (
                       %(igst_tag)s,
                       %(cgst_tag)s,
                       %(sgst_tag)s,
                       %(cess_tag)s
                       %(non_itc_tag_query)s
                   )
              )
             JOIN account_move move
               ON move.id = aml.move_id
            GROUP BY aml.id
            %(non_itc_query)s
            ANALYZE gst_tax_details_by_base_lines
            ''',
                tax_details_query=self.env[
                    "account.move.line"
                ]._get_query_tax_details_from_domain(domain),
                aml_from_clause=domain_query.from_clause,
                aml_where_clause=domain_query.where_clause,
                igst_tag=self.env.ref("l10n_in.tax_tag_igst").id,
                cgst_tag=self.env.ref("l10n_in.tax_tag_cgst").id,
                sgst_tag=self.env.ref("l10n_in.tax_tag_sgst").id,
                cess_tag=self.env.ref("l10n_in.tax_tag_cess").id,
                aml_id_query=aml_id_query,
                aml_name_query=aml_name_query,
                move_ref_query=move_ref_query,
                product_id_query=product_id_query,
                reversed_entry_id_query=reversed_entry_id_query,
                debit_origin_id_query=debit_origin_id_query,
                account_id_query=account_id_query,
                account_return_id_query=l10n_in_account_return_id_query,
                l10n_in_gstr2b_reconciliation_status_query=l10n_in_gstr2b_reconciliation_status_query,
                non_itc_query=non_itc_query,
                non_itc_tag_query=non_itc_tag_query,
                export_details_query=export_details_query,
                foreign_currency_amount_query=foreign_currency_amount_query,
                currency_id_query=currency_id_query,
            )
        )
