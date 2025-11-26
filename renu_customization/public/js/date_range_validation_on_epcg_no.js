
frappe.ui.form.on("EPCG License", {
    enable(frm) {
        if (frm.doc.enable == 1) {
            check_enable_allowed(frm);
        }
    }
});

function check_enable_allowed(frm) {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "EPCG License",
            fields: ["name", "from_date", "to_date", "enable"],
            filters: [
                ["name", "!=", frm.doc.name]  
            ]
        },
        callback: function(r) {
            if (!r.message) return;

            let new_from = frm.doc.from_date;
            let new_to = frm.doc.to_date;

            for (let row of r.message) {
                // Only check other enabled records
                if (row.enable == 1) {
                    let overlap =
                        (new_from <= row.to_date && new_to >= row.from_date);

                    if (overlap) {
                        frappe.msgprint({
                            title: "Cannot Enable Record",
                            message: `You cannot enable this record because it overlaps with another enabled record:
                                      <br><b>${row.from_date} → ${row.to_date}</b>`,
                            indicator: "red"
                        });

                        // revert enable checkbox
                        frm.set_value("enable", 0);
                        return;
                    }
                }
            }
        }
    });
}
