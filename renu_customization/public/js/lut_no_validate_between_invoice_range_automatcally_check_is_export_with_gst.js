// frappe.ui.form.on("Sales Invoice", {

//     refresh(frm) {
//         frm.trigger("validate_lut_for_invoice");
//     },

//     posting_date(frm) {
//         frm.trigger("validate_lut_for_invoice");
//     },

//     company(frm) {
//         frm.trigger("validate_lut_for_invoice");
//     },

//     invoice_type(frm) {
//         frm.trigger("validate_lut_for_invoice");
//     },

//     validate_lut_for_invoice(frm) {
//         if (!frm.doc.company) return;

//         // Get company details
//         frappe.db.get_doc("Company", frm.doc.company).then(comp => {
//             if (!comp.lut_number) {
//                 frm.set_value("is_export_with_gst", 0);
//                 return;
//             }

//             // Fetch LUT Number record
//             frappe.db.get_doc("LUT Number", comp.lut_number).then(lut => {
//                 let from_date = lut.from_date;
//                 let to_date = lut.to_date;
//                 let posting_date = frm.doc.posting_date;

//                 // Condition check
//                 if (
//                     frm.doc.invoice_type === "Product Export" &&
//                     posting_date >= from_date &&
//                     posting_date <= to_date
//                 ) {
//                     frm.set_value("is_export_with_gst", 1);
//                 } else {
//                     frm.set_value("is_export_with_gst", 0);
//                 }
//             });
//         });
//     }
// });



frappe.ui.form.on("Sales Invoice", {

    refresh(frm) {
        frm.trigger("validate_lut_for_invoice");
    },

    posting_date(frm) {
        frm.trigger("validate_lut_for_invoice");
    },

    company(frm) {
        frm.trigger("validate_lut_for_invoice");
    },

    invoice_type(frm) {
        frm.trigger("validate_lut_for_invoice");
    },

    validate_lut_for_invoice(frm) {
        if (!frm.doc.company) return;

        frappe.db.get_doc("Company", frm.doc.company).then(comp => {

            // --- Updated section ---
            if (!comp.lut_number) {
                // LUT not selected → GST should be 0
                frm.set_value("is_export_with_gst", 0);
                return;   // still end here because no LUT data to validate
            }
            // --- End update ---

            // LUT exists → validate date
            frappe.db.get_doc("LUT Number", comp.lut_number).then(lut => {
                let from_date = lut.from_date;
                let to_date = lut.to_date;
                let posting_date = frm.doc.posting_date;

                if (
                    frm.doc.invoice_type === "Product Export" &&
                    posting_date >= from_date &&
                    posting_date <= to_date
                ) {
                    frm.set_value("is_export_with_gst", 1);
                } else {
                    frm.set_value("is_export_with_gst", 0);
                }
            });
        });
    }
});
