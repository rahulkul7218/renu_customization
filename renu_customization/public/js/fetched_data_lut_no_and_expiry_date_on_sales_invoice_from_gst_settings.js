frappe.ui.form.on("Sales Invoice", {
    onload(frm) {
        frm.trigger("set_lut_values");
    },

    refresh(frm) {
        frm.trigger("set_lut_values");
    },

    company(frm) {
        frm.trigger("set_lut_values");
    },

    set_lut_values(frm) {
        if (!frm.doc.company) return;

        frappe.db.get_doc("GST Settings", frm.doc.company)
            .then(gst => {
                frm.set_value("lut_no", gst.lut_no || "");
                frm.set_value("lut_expiry_date", gst.lut_expiry_date || "");
            });
    }
});
