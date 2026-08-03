# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.tools import frozendict

from odoo.addons.payment.const import SENSITIVE_KEYS as PAYMENT_SENSITIVE_KEYS

SENSITIVE_KEYS = {"store_passwd"}
PAYMENT_SENSITIVE_KEYS.update(SENSITIVE_KEYS)

IPN_ROUTE = "/payment/sslcommerz/ipn"
PAYMENT_API_LIVE_URL = "https://uat-securepay.sslcommerz.com"
PAYMENT_API_TEST_URL = "https://sandbox.sslcommerz.com"
PAYMENT_RETURN_ROUTE = "/payment/sslcommerz/return"

# The currency supported by SSLCOMMERZ, in ISO 4217 format.
SUPPORTED_CURRENCY = "BDT"

# The codes of the default primary payment methods to activate
DEFAULT_PAYMENT_METHOD_CODES = {"card", "mobile_banking", "netbanking"}

# Mapping of payment method codes to SSLCOMMERZ codes
PAYMENT_METHODS_MAPPING = frozendict({
    "card": "visacard,mastercard,amexcard",
    "mobile_banking": "mobilebank",
    "netbanking": "internetbank",
})

# Mapping of payment method codes to SSLCOMMERZ response codes
PAYMENT_METHODS_RESPONSE_MAPPING = frozendict({
    "mastercard": "master",
    "mobile_banking": "mobilebanking",
    "netbanking": "ib",
})

# Mapping of transaction states to SSLCOMMERZ payment statuses.
PAYMENT_STATUS_MAPPING = frozendict({
    "done": ("VALID", "VALIDATED"),
    "cancel": ("CANCELLED", "EXPIRED", "UNATTEMPTED"),
    "error": ("FAILED", "INVALID_TRANSACTION"),
})
