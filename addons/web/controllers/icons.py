# Part of Odoo. See LICENSE file for full copyright and licensing details.

import functools
import json

from odoo import http
from odoo.tools.misc import file_open


@functools.lru_cache(maxsize=1)
def _load_material_symbols():
    """Load the Material Symbols icon metadata once and build a search index.

    The raw file maps each icon name to its ``has_fill`` flag and a long string
    of search ``tags``. The tags are only ever used server-side to filter the
    icons, so they never reach the browser: the search route below returns a
    plain ``{name, has_fill}`` list.

    :returns: a list of ``(name, has_fill, haystack)`` tuples, where ``haystack``
        is the lowercased ``"name tags"`` string used for substring matching.
    """
    with file_open('web/static/src/libs/materialsymbols/ms_icons.json', 'r') as fh:
        icons = json.load(fh)
    return [
        (name, icon['has_fill'], f"{name} {icon['tags']}".lower())
        for name, icon in icons.items()
    ]


class MaterialSymbols(http.Controller):

    @http.route('/web/material_symbols/search', type='jsonrpc', auth='user', readonly=True)
    def search(self, needle=''):
        """Search the Material Symbols icons by name and tags.

        :param str needle: the search term. When empty, every icon is returned,
            which also provides a plain list of all available icons.
        :returns: a list of ``{name, has_fill}`` dicts, tags excluded.
        """
        needle = (needle or '').strip().lower()
        return [
            {'name': name, 'has_fill': has_fill}
            for name, has_fill, haystack in _load_material_symbols()
            if not needle or needle in haystack
        ]
