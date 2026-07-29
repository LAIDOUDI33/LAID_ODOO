# Part of Odoo. See LICENSE file for full copyright and licensing details.

from datetime import UTC

from odoo.addons.mail.controllers.discuss.rtc import RtcController
from odoo.http import request


class CloudStorageRtcController(RtcController):
    def _get_recording_destination(self, call_history, start_ms, end_ms):
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
            "res_model": "mail.call.artifact",
            "res_id": artifact_sudo.id,
            "mimetype": content_type,
        })
        attachment_sudo._post_add_create(cloud_storage=True)
        upload_info = attachment_sudo._generate_cloud_storage_upload_info()
        return {
            "destination": upload_info["url"],
            "method": upload_info["method"],
            "headers": upload_info.get("headers"),
            "response_status": upload_info["response_status"],
        }
