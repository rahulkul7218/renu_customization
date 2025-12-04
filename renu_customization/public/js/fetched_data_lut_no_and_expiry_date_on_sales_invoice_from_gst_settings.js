// frappe.ui.form.on("Sales Invoice", {
//     onload(frm) {
//         frm.trigger("set_lut_values");
//     },

//     // refresh(frm) {
//     //     frm.trigger("set_lut_values");
//     // },

//     company(frm) {
//         frm.trigger("set_lut_values");
//     },

//     set_lut_values(frm) {
//         if (!frm.doc.company) return;

//         frappe.db.get_doc("GST Settings", frm.doc.company)
//             .then(gst => {
//                 frm.set_value("lut_no", gst.lut_no || "");
//                 frm.set_value("lut_expiry_date", gst.lut_expiry_date || "");
//             });
//     }
// });


frappe.ui.form.on("Sales Invoice", {
    onload(frm) {
        frm.trigger("set_lut_values");
    },

    company(frm) {
        frm.trigger("set_lut_values");
    },

    set_lut_values(frm) {
        // ❌ Do not update if document is saved/submitted
        if (frm.doc.docstatus > 0) {
            return;
        }

        // If company not selected, skip
        if (!frm.doc.company) return;

        // Fetch LUT values from GST Settings
        frappe.db.get_doc("GST Settings", frm.doc.company)
            .then(gst => {
                if (!gst) return;

                // Set only if fields are empty (so manual values are not overwritten)
                if (!frm.doc.lut_no) {
                    frm.set_value("lut_no", gst.lut_no || "");
                }
                if (!frm.doc.lut_expiry_date) {
                    frm.set_value("lut_expiry_date", gst.lut_expiry_date || "");
                }
            });
    }
});
