// frappe.ui.form.on("Company", {
//     lut_number: function(frm) {
//         if (!frm.doc.lut_number) return;

//         frappe.db.get_doc("LUT Number", frm.doc.lut_number).then(lut => {
//             let today = frappe.datetime.get_today();

//             // If LUT to_date is greater than today
//             if (lut.to_date && lut.to_date > today) {

//                 // 1. Uncheck 'enable' in LUT Number
//                 frappe.call({
//                     method: "frappe.client.set_value",
//                     args: {
//                         doctype: "LUT Number",
//                         name: lut.name,
//                         fieldname: "enable",
//                         value: 0
//                     }
//                 });

//                 // 2. Clear LUT Number from Company
//                 frm.set_value("lut_number", "");

//                 // 3. Save automatically
//                 frm.save().then(() => {
//                     frappe.msgprint("Invalid LUT Number Removed Automatically.");
//                 });
//             }
//         });
//     }
// });


frappe.ui.form.on("Company", {
    
    // For LUT Number
    lut_number: function(frm) {
        validate_date_and_clear(frm, "lut_number", "LUT Number");
    },

    // For EPCG Number
    epcg_no: function(frm) {
        validate_date_and_clear(frm, "epcg_no", "EPCG License");
    }

});

// Reusable function
function validate_date_and_clear(frm, fieldname, doctype_name) {

    if (!frm.doc[fieldname]) return;

    frappe.db.get_doc(doctype_name, frm.doc[fieldname]).then(doc => {
        let today = frappe.datetime.get_today();

        // If to_date > today → remove + disable
        if (doc.to_date && doc.to_date < today) {

            // 1. Uncheck enable in linked document
            frappe.call({
                method: "frappe.client.set_value",
                args: {
                    doctype: doctype_name,
                    name: doc.name,
                    fieldname: "enable",
                    value: 0
                }
            });

            // 2. Clear field on Company
            frm.set_value(fieldname, "");

            // 3. Auto save
            frm.save().then(() => {
                frappe.msgprint(doctype_name + " is not valid. It has been removed automatically.");
            });
        }
    });
}
