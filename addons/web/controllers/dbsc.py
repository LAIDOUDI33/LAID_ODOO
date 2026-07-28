from __future__ import annotations

import logging
import secrets
import jwt
from http import HTTPStatus

from werkzeug.exceptions import BadRequest, Forbidden, Unauthorized

from odoo import http
from odoo.http import request
from odoo.http.response import Response
from odoo.http.session import (
    DBSC_COOKIE_ATTRIBUTES,
    DBSC_COOKIE_NAME,
    DBSC_HEADER_REGISTRATION,
    DBSC_HEADER_RESPONSE,
    DBSC_HEADER_SESSION_CHALLENGE,
    DBSC_HEADER_SESSION_ID,
    DBSC_URL_REFRESH,
    DBSC_URL_REGISTRATION,
    SESSION_LIFETIME,
    get_device,
    session_store,
)
from odoo.tools import config
from odoo.tools.misc import consteq
from .home import Home

_logger = logging.getLogger('odoo.dbsc')


def get_jwt_challenge(jw_token: str, jw_key: dict, alg: str) -> str:
    if not (jw_token and jw_key and alg):
        return ''

    try:
        public_key = jwt.PyJWK.from_dict(jw_key).key  # Check `kty`
        payload = jwt.decode(jw_token, key=public_key, algorithms=[alg])
        return payload.get('jti')
    except jwt.PyJWTError as error:
        _logger.warning("Cryptographic verification failed: %s", error)
        return ''


def _rotate_dbsc_challenge(session) -> str:
    current_challenge = session.pop('_dbsc_challenge', '')
    session['_dbsc_challenge'] = secrets.token_urlsafe(16)
    return current_challenge


class DbscAuthController(Home):

    @http.route()
    def web_login(self, *args, **kw):
        response = super().web_login(*args, **kw)
        session = request.session
        if session.uid and config['dbsc']:
            _rotate_dbsc_challenge(session)
            response.headers[DBSC_HEADER_REGISTRATION] = \
                f'(ES256 RS256);path="{DBSC_URL_REGISTRATION}";challenge="{session['_dbsc_challenge']}"'
        return response

    @http.route(DBSC_URL_REGISTRATION, type='http', auth='user', methods=['POST'], csrf=False)
    def dbsc_register(self, **kw):
        session = request.session

        token = request.httprequest.headers.get(DBSC_HEADER_RESPONSE)
        if not token:
            raise BadRequest(f"Missing {DBSC_HEADER_RESPONSE} header")

        jwt_header = jwt.get_unverified_header(token)
        jwk_dict = jwt_header.get('jwk')
        alg = jwt_header.get('alg', 'ES256')

        expected_challenge = _rotate_dbsc_challenge(session)
        challenge = get_jwt_challenge(token, jwk_dict, alg)
        if not consteq(challenge, expected_challenge):
            raise Unauthorized("Invalid or expired challenge")

        session_store().make_public_key(session, jwk=jwk_dict, alg=alg)

        dbsc_id = secrets.token_urlsafe(16)
        response = request.make_json_response({
            "session_identifier": dbsc_id,
            "refresh_url": DBSC_URL_REFRESH,
            "scope": {
                "origin": request.httprequest.host_url.rstrip('/'),
                "include_site": False,
                "scope_specification": [
                    {"type": "include", "path": "/"},
                    # Refresh URL is automatically exclude
                    # to prevent infinite refresh loops (deadlocks)
                ],
            },
            "credentials": [
                {
                    "type": "cookie",
                    "name": DBSC_COOKIE_NAME,
                    "attributes": "Path=/; Secure; HttpOnly; SameSite=Lax",
                },
            ],
        })
        response.set_cookie(
            DBSC_COOKIE_NAME, '1', max_age=SESSION_LIFETIME, **DBSC_COOKIE_ATTRIBUTES,
        )
        _logger.info("[DBSC] Session %s: Creation", session.sid[:8])
        return response

    @http.route(DBSC_URL_REFRESH, type='http', auth='user', methods=['POST'], csrf=False)
    def dbsc_refresh(self, **kw):
        session = request.session
        public_key = session_store().get_public_key(session)
        if not public_key:  # Delete a public key automatically invalid the session
            _logger.warning("[DBSC] Session %s: Termination", session.sid[:8])
            raise Forbidden()

        dbsc_id = request.httprequest.headers.get(DBSC_HEADER_SESSION_ID)
        token = request.httprequest.headers.get(DBSC_HEADER_RESPONSE)
        if not token:  # No challenge signed
            _rotate_dbsc_challenge(session)
            response = Response(status=HTTPStatus.FORBIDDEN)
            response.headers[DBSC_HEADER_SESSION_CHALLENGE] = f'"{session['_dbsc_challenge']}";id="{dbsc_id}"'
            _logger.info("[DBSC] Session %s: Challenge", session.sid[:8])
            return response

        client_challenge = get_jwt_challenge(token, public_key['jwk'], public_key['alg'])
        server_challenge = _rotate_dbsc_challenge(session)

        if not consteq(client_challenge, server_challenge):
            # /!\ No logout -> maybe there is a valid signature in a device bound client side
            # If all bound devices fail the challenge, the cookie is never reset (will be logout)
            _logger.warning("[DBSC] Session %s: Termination", session.sid[:8])
            raise Forbidden()

        current_device = get_device(session, request)
        current_device['trusted'] = True

        response = Response(status=HTTPStatus.OK)
        response.set_cookie(
            DBSC_COOKIE_NAME, '1', max_age=SESSION_LIFETIME, **DBSC_COOKIE_ATTRIBUTES,
        )
        response.headers[DBSC_HEADER_SESSION_CHALLENGE] = f'"{session['_dbsc_challenge']}";id="{dbsc_id}"'
        _logger.info("[DBSC] Session %s: Refresh", session.sid[:8])
        return response
