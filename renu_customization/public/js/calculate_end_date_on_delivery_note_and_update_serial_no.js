// frappe.ui.form.on("Delivery Note", {
//     after_save: function(frm) {
//         frm.doc.items.forEach(item => {
//             // --- Step 1: Calculate warranty_end_date ---
//             if (item.warranty_date && item.warranty_days) {
//                 let start_date = frappe.datetime.str_to_obj(item.warranty_date);

//                 // Add warranty days
//                 start_date.setDate(start_date.getDate() + flt(item.warranty_days));

//                 // Set warranty_end_date in YYYY-MM-DD format
//                 item.warranty_end_date = frappe.datetime.obj_to_str(start_date);
//             }

//             // --- Step 2: Update Serial No docs if Date of Dispatch ---
//             if (item.warranty_begins === "Date of Dispatch" && item.serial_no) {
//                 const serial_nos = item.serial_no
//                     .split(/\r?\n/)
//                     .map(s => s.trim())
//                     .filter(Boolean);

//                 let warranty_days = parseInt(item.warranty_days || "0", 10);
//                 if (isNaN(warranty_days)) warranty_days = 0;

//                 const updates = serial_nos.map(serial_no => {
//                     return frappe.db.set_value("Serial No", serial_no, {
//                         warranty_expiry_date: item.warranty_end_date,
//                         warranty_begins: item.warranty_begins,
//                         delivery_note: frm.doc.name
//                     }).catch(err => {
//                         frappe.msgprint(
//                             `⚠️ Failed to update Serial No: ${serial_no}\n${(err && err.message) || err}`
//                         );
//                     });
//                 });

//                 Promise.all(updates);
//             }
//         });

//         // Refresh child table to show updated values
//         frm.refresh_field("items");
//     }
// });



//both serial no update and calculate warranty end date

frappe.ui.form.on("Delivery Note", {
    before_save: function(frm) {
        frm.doc.items.forEach(function(row) {
            if (row.warranty_date && row.warranty_days) {
                // Convert warranty_date to Date object
                let start_date = frappe.datetime.str_to_obj(row.warranty_date);
                
                // Add warranty days
                start_date.setDate(start_date.getDate() + flt(row.warranty_days));

                // Set warranty_end_date in YYYY-MM-DD format
                row.warranty_end_date = frappe.datetime.obj_to_str(start_date);
            }
        });

        // Refresh the child table to show updated values
        frm.refresh_field("items");
    },

    validate: function(frm) {
        frm.doc.items.forEach(item => {
            if (item.warranty_begins === "Date of Dispatch" && item.warranty_end_date && item.serial_no) {
                let serial_nos = item.serial_no
                    .split("\n")
                    .map(s => s.trim())
                    .filter(s => s);

                serial_nos.forEach(serial_no => {
                    frappe.call({
                        method: "frappe.client.set_value",
                        args: {
                            doctype: "Serial No",
                            name: serial_no,
                            fieldname: {
                                warranty_expiry_date: item.warranty_end_date,
                                warranty_days: item.warranty_days,
                                warranty_begins: item.warranty_begins,
                                delivery_note: frm.doc.name
                            }
                        },
                        callback: function(r) {
                            if (r.exc) {
                                frappe.msgprint(`Failed to update Serial No: ${serial_no}`);
                            }
                        }
                    });
                });
            }
        });
    }
});
