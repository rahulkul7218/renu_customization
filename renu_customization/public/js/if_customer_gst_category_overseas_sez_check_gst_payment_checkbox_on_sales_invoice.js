
frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        frm.trigger("check_lut_expiry");
    },

    customer(frm) {
        frm.trigger("check_lut_expiry");
    },

    posting_date(frm) {
        frm.trigger("check_lut_expiry");
    },

    lut_expiry_date(frm) {
        frm.trigger("check_lut_expiry");
    },

    check_lut_expiry(frm) {
        let doc = frm.doc;

        if (!doc.gst_category || !doc.lut_expiry_date) return;

        // Condition: SEZ or (Overseas + 96-Other Countries)
        let is_export_customer =
            doc.gst_category == "SEZ" ||
            (doc.gst_category == "Overseas" && doc.place_of_supply == "96-Other Countries");

        if (!is_export_customer) return;

        // Compare posting date with LUT expiry date
        if (doc.lut_expiry_date < doc.posting_date) {
            if (!doc.is_export_with_gst) {
                frm.set_value("is_export_with_gst", 1);
                frappe.msgprint("LUT No Expiry Date is over. So 'Is Export With Payment of GST' has been enabled.");
            }
        } else {
            frm.set_value("is_export_with_gst", 0);
        }
    }
});
