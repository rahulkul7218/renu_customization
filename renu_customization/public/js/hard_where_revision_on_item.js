
frappe.ui.form.on("Item", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button("Revision", () => {

                let old_code = frm.doc.item_code;
                let old_name = frm.doc.item_name; // ✅ preserve original item_name

                // Extract last numeric part
                let match = old_code.match(/(.*?)(\d+)$/);
                if (!match) {
                    frappe.msgprint("Item Code must end with a number");
                    return;
                }

                let prefix = match[1];
                let number = match[2];

                let new_number = (parseInt(number) + 1)
                    .toString()
                    .padStart(number.length, "0");

                let new_code = prefix + new_number;

                // Clone current document
                let new_doc = Object.assign({}, frm.doc);

                // Remove system fields
                delete new_doc.name;
                delete new_doc.creation;
                delete new_doc.modified;
                delete new_doc.modified_by;
                delete new_doc.owner;
                delete new_doc.docstatus;

                // Set new item values
                new_doc.item_code = new_code;     // ✅ new revision code
                new_doc.item_name = old_name;     // ✅ keep previous item_name
                new_doc.custom_revision = old_code;

                // 🌳 Tree logic
                new_doc.parent_item = old_code;

                // 🔒 Ensure parent becomes GROUP automatically
                if (!frm.doc.is_group) {
                    frappe.db.set_value("Item", old_code, "is_group", 1);
                }

                frappe.call({
                    method: "frappe.client.insert",
                    args: { doc: new_doc },
                    callback(r) {
                        if (r.message) {
                            frappe.msgprint({
                                title: "Revision Created",
                                message: `Item <b>${new_code}</b> created under <b>${old_code}</b>`,
                                indicator: "green"
                            });

                            frappe.set_route("Form", "Item", r.message.name);
                        }
                    }
                });
            });
        }
    }
});
