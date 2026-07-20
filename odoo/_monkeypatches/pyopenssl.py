from importlib.metadata import version

from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat
from OpenSSL.crypto import FILETYPE_PEM, PKey, X509, load_certificate, load_privatekey
from OpenSSL.SSL import Context

from odoo.tools import parse_version

orig_use_certificate = Context.use_certificate
orig_use_privatekey = Context.use_privatekey


def patch_pyopenssl():
    # pyOpenSSL 24.3.0 started accepting cryptography objects in
    # Context.use_certificate and Context.use_privatekey, and
    # deprecated passing its own X509 and PKey objects.

    if parse_version(version("pyopenssl")) >= parse_version("24.3.0"):
        return  # No need to patch, cryptography objects are supported.

    def use_certificate(self, cert):
        if not isinstance(cert, X509):
            cert = load_certificate(FILETYPE_PEM, cert.public_bytes(Encoding.PEM))
        orig_use_certificate(self, cert)

    def use_privatekey(self, pkey):
        if not isinstance(pkey, PKey):
            pkey = load_privatekey(FILETYPE_PEM, pkey.private_bytes(
                encoding=Encoding.PEM,
                format=PrivateFormat.PKCS8,
                encryption_algorithm=NoEncryption()
            ))
        orig_use_privatekey(self, pkey)

    Context.use_certificate = use_certificate
    Context.use_privatekey = use_privatekey
