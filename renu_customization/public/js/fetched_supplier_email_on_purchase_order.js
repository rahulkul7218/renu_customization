frappe.ui.form.on("Purchase Order", {
    supplier(frm) {
        if (!frm.doc.supplier) return;

        frappe.call({
            method: "frappe.client.get_list",
            args: {
                doctype: "Address",
                fields: ["name", "email_id"],
                filters: [
                    ["Dynamic Link", "link_doctype", "=", "Supplier"],
                    ["Dynamic Link", "link_name", "=", frm.doc.supplier]
                ],
                limit: 1
            },
            callback(r) {
                if (r.message && r.message.length && r.message[0].email_id) {
                    frm.set_value("add_email_on_purchase_order", r.message[0].email_id);
                } else {
                    frm.set_value("add_email_on_purchase_order", "");
                    frappe.msgprint("No email found in Supplier Address");
                }
            }
        });
    }
});
