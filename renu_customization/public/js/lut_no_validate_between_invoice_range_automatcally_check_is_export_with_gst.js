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

//         frappe.db.get_doc("Company", frm.doc.company).then(comp => {

//             // CASE 1: Company has NO LUT Number
//             if (!comp.lut_number) {
//                 if (frm.doc.invoice_type === "Product Export") {
//                     frm.set_value("is_export_with_gst", 1);
//                 } else {
//                     frm.set_value("is_export_with_gst", 0);
//                 }
//                 return;
//             }

//             // CASE 2: Company has LUT Number → Validate dates
//             frappe.db.get_doc("LUT Number", comp.lut_number).then(lut => {
//                 let from_date = lut.from_date;
//                 let to_date = lut.to_date;
//                 let posting_date = frm.doc.posting_date;

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

            // CASE 1: Company has NO LUT Number
            if (!comp.lut_number) {
                if (frm.doc.invoice_type === "Product Export") {
                    frm.set_value("is_export_with_gst", 1);   // CHECK
                } else {
                    frm.set_value("is_export_with_gst", 0);   // UNCHECK
                }
                return;
            }

            // CASE 2: Company HAS LUT Number → always uncheck
            frm.set_value("is_export_with_gst", 0);
            return;

        });
    }
});
