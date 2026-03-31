import { registry } from "@web/core/registry";
import { useService } from "@web/core/utils/hooks";

registry.category("actions").add("action_send_mail_callback", async (env, action) => {
    const store = useService("mail.store");
    const actionService = useService("action");
    const discuss = store.discuss;
    if (
        !action.params.default_message_id &&
        discuss.isActive &&
        discuss.thread?.model === "mail.box"
    ) {
        store.notifySendFromMailbox(action.params.record_name);
    }
    await actionService.doAction({ type: "ir.actions.act_window_close" });
});
