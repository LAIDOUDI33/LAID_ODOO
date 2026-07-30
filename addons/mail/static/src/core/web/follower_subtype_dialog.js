import { rpc } from "@web/core/network/rpc";
import { Component, computed, onWillStart, props, signal, types } from "@odoo/owl";

import { Dialog } from "@web/core/dialog/dialog";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

export class FollowerSubtypeDialog extends Component {
    static components = { Dialog };
    static template = "mail.FollowerSubtypeDialog";

    setup() {
        super.setup();
        this.store = useService("mail.store");
        this.props = props({
            close: types.function([types.instanceOf(MouseEvent)]),
            follower: types.instanceOf(this.store["mail.followers"].Class),
            onFollowerChanged: types.function([]),
        });
        const MailMessageSubtypeType = types.instanceOf(this.store["mail.message.subtype"].Class);
        this.subtypes = signal(null, { type: types.array(MailMessageSubtypeType) });
        this.parentSubtypes = signal(null, { type: types.array(MailMessageSubtypeType) });
        this.selectedParentSubtypes = signal.Set(new Set(), { type: MailMessageSubtypeType });
        this.isSoleChild = computed(() =>
            this.parentSubtypes()
                ?.filter((s) => s.parent_id)
                // check if parent record controls auto subscriptions of models other than the current
                .every((s) => s.parent_id.res_model === this.props.follower.thread.model)
        );
        this.parentSubtypeByChildSubtypeId = computed(() =>
            Object.fromEntries(
                this.parentSubtypes()
                    ?.filter((s) => s.parent_id)
                    .map((s) => [s.parent_id.id, s]) ?? []
            )
        );
        onWillStart(async () => {
            const {
                store_data,
                subtype_ids,
                parent_field,
                parent_follower_id,
                parent_subtype_ids,
            } = await rpc("/mail/read_subscription_data", { follower_id: this.props.follower.id });
            this.store.insert(store_data);
            this.subtypes.set(subtype_ids.map((id) => this.store["mail.message.subtype"].get(id)));
            this.parentSubtypes.set(
                parent_subtype_ids?.map((id) => this.store["mail.message.subtype"].get(id))
            );
            this.parent_field = parent_field;
            const parentFollower = this.store["mail.followers"].get(parent_follower_id);
            parentFollower?.subtype_ids.forEach((s) => this.selectedParentSubtypes().add(s));
        });
    }

    /**
     * @param {Event} ev
     * @param {Set<import("models").MailMessageSubtype>} targetSubtypes
     * @param {import("models").MailMessageSubtype} subtype
     */
    onChangeCheckbox(ev, targetSubtypes, subtype) {
        if (ev.target.checked) {
            targetSubtypes.add(subtype);
        } else {
            targetSubtypes.delete(subtype);
        }
    }

    /**
     * @param {Object} [param0={}]
     * @param {string} [param0.all] whether to update all siblings or only this record
     */
    async onClickApply({ all }) {
        const thread = this.props.follower.thread;
        const selectedSubtypes = this.subtypes().filter((s) =>
            s.in(this.props.follower.subtype_ids)
        );
        const route = all
            ? "/mail/thread/update_sibling_subscription"
            : "/mail/thread/update_subscription";
        const data = await rpc(route, {
            partner_ids: [this.props.follower.partner_id.id],
            res_model: thread.model,
            res_id: thread.id,
            subtype_ids: selectedSubtypes.map((subtype) => subtype.id),
            parent_field: this.parent_field,
            parent_subtype_ids: Array.from(this.selectedParentSubtypes(), (subtype) => subtype.id),
        });
        this.store.insert(data);
        if (this.store.mt_comment.notIn(selectedSubtypes)) {
            this.props.follower.removeRecipient();
        }
        this.env.services.notification.add(_t("Notification preferences updated."), {
            type: "success",
        });
        this.props.onFollowerChanged(thread);
        this.props.close();
    }

    get title() {
        return _t("Notification Preferences");
    }
}
