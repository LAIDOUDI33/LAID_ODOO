import base64
import binascii
import hashlib
import os

from odoo.addons.base.models.res_users import KEY_CRYPT_CONTEXT

# 16 Hex chars (8 bytes) of the secret kept in plaintext as a lookup index
OAUTH_SECRET_INDEX_SIZE = 16


def _generate_secret(n_bytes=32):
    return binascii.hexlify(os.urandom(n_bytes)).decode()


def verifier_matches_challenge(code_verifier, code_challenge):
    if not code_verifier or not code_challenge:
        return False
    return challenge_from_verifier(code_verifier) == code_challenge


def challenge_from_verifier(code_verifier):
    """Compute the S256 PKCE code_challenge for a given code_verifier."""
    # RFC 7636 §4.2: challenge = BASE64URL-ENCODE(SHA256(ASCII(verifier))), and the padding '=' from the base64 must be stripped.
    digest = hashlib.sha256(code_verifier.encode()).digest()
    return base64.urlsafe_b64encode(digest).rstrip(b'=').decode()


def _generate_hash(input):
    return KEY_CRYPT_CONTEXT.hash(input)


def _verify_hash(input, hash):
    return KEY_CRYPT_CONTEXT.verify(input, hash)


def oauth_base_url(env) -> str:
    return env['ir.config_parameter'].sudo().get_str('web.base.url')
