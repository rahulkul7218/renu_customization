// frappe.ui.form.on("Sales Invoice", {

//     validate: function(frm) {

//         frm.doc.items.forEach(item => {

//             if (item.warranty_begins === "Date of Invoice" && item.warranty_end_date && item.serials_no) {

//                 const serial_nos = item.serials_no

//                     .split(/\r?\n/)

//                     .map(s => s.trim())

//                     .filter(Boolean);
 
//                 // Parse to integer safely

//                 let warranty_days = parseInt(item.warranty_days || "0", 10);

//                 if (isNaN(warranty_days)) warranty_days = 0;
 
//                 // Update all serial no docs (returns promises)

//                 const updates = serial_nos.map(serial_no => {

//                     return frappe.db.set_value('Serial No', serial_no, {

//                         warranty_expiry_date: item.warranty_end_date,

//                         warranty_period: item.warranty_days,

//                         warranty_begins: item.warranty_begins,
                        
//                         sales_invoice: frm.doc.name 

//                     }).catch(err => {

//                         // show error for that serial if update fails

//                         frappe.msgprint(`⚠️ Failed to update Serial No: ${serial_no}\n${(err && err.message) || err}`);

//                     });

//                 });
 
//                 // optional: wait for all updates to finish (silently)

//                 Promise.all(updates).then(() => {

//                     // Optional success feedback

//                     // frappe.show_alert({message: 'Serial No(s) updated', indicator: 'green'});

//                 });

//             }

//         });

//     }

// });


frappe.ui.form.on("Sales Invoice", {
    validate: function(frm) {
        frm.doc.items.forEach(item => {
            if (item.warranty_begins === "Date of Invoice" && item.warranty_end_date && item.serials_no) {
                let serial_nos = item.serials_no.split("\n").map(s => s.trim()).filter(s => s);

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
                                warranty_start_date: item.warranty_start_date,
                                sales_invoice: frm.doc.name

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