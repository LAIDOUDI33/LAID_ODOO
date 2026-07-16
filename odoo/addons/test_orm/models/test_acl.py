import re

from odoo import api, fields, models


def _sanitize_account_number(account_number):
    if account_number:
        return re.sub(r'\W+', '', account_number).upper()
    return False


class TestOrmAcl(models.Model):
    _name = 'test_orm.acl'
    _description = 'Test ORM ACL'

    name = fields.Char()
    many2one_id = fields.Many2one('test_orm.acl.relations')


class TestOrmAclRelations(models.Model):
    _name = 'test_orm.acl.relations'
    _description = 'Test ORM ACL Relations'

    name = fields.Char()


class TestOrmAclPartner(models.Model):
    _name = 'test_orm.acl.partner'
    _description = 'Test ORM ACL Partner'

    name = fields.Char(required=True)
    active = fields.Boolean(default=True)
    bank_ids = fields.One2many('test_orm.acl.partner.bank', 'partner_id')


class TestOrmAclPartnerBank(models.Model):
    _name = 'test_orm.acl.partner.bank'
    _rec_name = 'account_number'
    _description = 'Test ORM ACL Partner Bank'

    account_number = fields.Char(search='_search_account_number')
    holder_name = fields.Char(compute='_compute_account_holder_name', readonly=False, store=True)
    sanitized_account_number = fields.Char(compute='_compute_sanitized_account_number', readonly=True, store=True)
    partner_id = fields.Many2one(comodel_name='test_orm.acl.partner', domain=['|', ('is_company', '=', True), ('parent_id', '=', False)], required=True)

    @api.depends('partner_id')
    def _compute_account_holder_name(self):
        for account in self:
            if not account.holder_name:
                account.holder_name = account.partner_id.name

    @api.depends('account_number')
    def _compute_sanitized_account_number(self):
        for account in self:
            account.sanitized_account_number = _sanitize_account_number(account.account_number)

    def _search_account_number(self, operator, value):
        if operator in ('in', 'not in'):
            value = [_sanitize_account_number(i) for i in value]
        else:
            value = _sanitize_account_number(value)
        return [('sanitized_account_number', operator, value)]
