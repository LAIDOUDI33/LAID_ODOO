import datetime
import json

from odoo import fields
from odoo.tools import SQL, json_default

from . import orjson
from .misc import hashable

# How far back (in seconds) notifications are fetched for a channel with no
# known last id (min_id 0).
TIMEOUT = 50


def json_dump(v):
    return json.dumps(v, separators=(",", ":"), default=json_default)


def fetch_bus_notifications(cr, channels_by_last_fetched_id, ignore_ids=None):
    """Fetch notifications from the bus table.

    :param cr: Database cursor.
    :param channels_by_last_fetched_id: Channels grouped by their last fetched
        id, the lower bound for their notifications.
    :param ignore_ids: IDs to exclude.
    :return: List of notifications.

    """
    threshold = fields.Datetime.now() - datetime.timedelta(seconds=TIMEOUT)
    channel_conditions = []
    for last_fetched_id, channels in channels_by_last_fetched_id.items():
        json_channels = tuple(json_dump(channel) for channel in channels)
        since = (
            SQL("create_date > %s", threshold)
            if last_fetched_id == 0
            else SQL("id > %s", last_fetched_id)
        )
        channel_conditions.append(SQL("(channel IN %s AND %s)", json_channels, since))
    where = SQL(" OR ").join(channel_conditions)
    if ignore_ids:
        where = SQL("(%s) AND id NOT IN %s", where, tuple(ignore_ids))
    cr.execute(SQL("SELECT id, message, channel FROM bus_bus WHERE %s ORDER BY id", where))
    return [
        {"id": r[0], "message": orjson.loads(r[1]), "channel": hashable(orjson.loads(r[2]))}
        for r in cr.fetchall()
    ]
