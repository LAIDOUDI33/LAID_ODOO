# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo.addons.payment.tests.common import PaymentCommon


class XenditCommon(PaymentCommon):

    @classmethod
    def setUpClass(cls):
        super().setUpClass()

        cls.xendit = cls._prepare_provider('xendit', update_values={
            'xendit_public_key': 'xnd_public_key',
            'xendit_secret_key': 'xnd_secret_key',
            'xendit_webhook_token': 'xnd_webhook_token',
        })
        cls.provider = cls.xendit
        cls.webhook_notification_data = {
            'payment_session_id': 'ps-64a8f9c614802d6c402cd82d',
            'reference_id': cls.reference,
            'session_type': 'PAY',
            'mode': 'PAYMENT_LINK',
            'amount': 1740,
            'currency': 'IDR',
            'country': 'ID',
            'status': 'COMPLETED',
            'created': '2023-07-12T09:31:13.111Z',
            'updated': '2023-07-12T09:31:23.577Z',
            'description': cls.reference,
            'customer_id': 'cust-64118d86854d7d89206e732d',
            'allowed_payment_channels': ['BNI'],
            'payment_link_url': 'https://xen.to/kGxPCi60',
            'payment_id': 'py-ac1fcd3e21c54c70bb06fa3c34e19e0c',
            'business_id': '64118d86854d7d89206e732d',
        }
        cls.charge_notification_data = {
            'status': 'CAPTURED',
            'authorized_amount': 11100,
            'capture_amount': 11100,
            'currency': 'IDR',
            'metadata': {},
            'credit_card_token_id': '6645aaa2f00da60017cdc669',
            'business_id': '64118d86854d7d89206e732d',
            'merchant_id': 'samplemerchant',
            'merchant_reference_code': '6645aaa3f00da60017cdc66a',
            'external_id': 'ABC00026',
            'eci': '00',
            'charge_type': 'MULTIPLE_USE_TOKEN',
            'masked_card_number': '520000XXXXXX2151',
            'card_brand': 'MASTERCARD',
            'card_type': 'CREDIT',
            'descriptor': 'XDT*ODOO',
            'authorization_id': '6645aaa3f00da60017cdc66b',
            'bank_reconciliation_id': '7158417004836852803955',
            'issuing_bank_name': 'PT BANK NEGARA INDONESIA TBK',
            'cvn_code': 'M',
            'approval_code': '831000',
            'created': '2024-05-16T06:41:41.176Z',
            'id': '6645aaa5f00da60017cdc66c',
            'card_fingerprint': '652e1897a273b700164639a7'
        }
