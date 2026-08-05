# -*- coding: utf-8 -*-
# Part of HASSIBA Suite ERP - Algerian Localization for Odoo 19

from . import models
from . import wizards
from . import reports


def _pre_init_hook(cr):
    """Hook called before module installation."""
    pass

def _post_init_hook(cr, registry):
    """Hook called after module installation."""
    from odoo import api, SUPERUSER_ID
    env = api.Environment(cr, SUPERUSER_ID, {})
    _setup_algerian_company_data(env)

def _uninstall_hook(cr, registry):
    """Hook called before module uninstallation."""
    pass
