# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import UTC

from odoo.addons.mail.controllers.discuss.rtc import RtcController
from odoo.http import request


class CloudStorageRtcController(RtcController):
    def _get_recording_destination(self, call_history, start_ms, end_ms):
        """
           :param: channel_id: the 'discuss.channel' record that has the attachment field
           :return: the recording destination
        """
        super()._get_recording_destination(call_history, start_ms, end_ms)
        call_start_ms = int(call_history.start_dt.replace(tzinfo=UTC).timestamp() * 1000)
        artifact_sudo = self.env["mail.call.artifact"].sudo().create({
            "discuss_call_history_id": call_history.id,
            "start_ms": int(start_ms) - call_start_ms,
            "end_ms": int(end_ms) - call_start_ms,
        })
        content_type = request.httprequest.content_type or "application/octet-stream"
        attachment_sudo = self.env["ir.attachment"].sudo().create({
            "name": f"media_{call_history.id}",
            "type": "cloud_storage",
            "raw": False,
            "res_model": "mail.call.artifact",
            "res_id": artifact_sudo.id,
            "mimetype": content_type,
        })
        return attachment_sudo._generate_cloud_storage_download_info()["url"]
