// frappe.ui.form.on('Sales Order', {
//     before_save: function(frm) {
//         let promises = [];

//         frm.doc.items.forEach(row => {
//             if (row.warranty_name) {
//                 promises.push(
//                     frappe.db.get_doc('Warranty', row.warranty_name).then(warranty => {
//                         // use the row.warranty_name directly (since it's a Link field, it's already the warranty name)
//                         let warr_name = row.warranty_name;
//                         let warr_desc = warranty.description || "";
//                         return warr_name + " " + warr_desc;
//                     })
//                 );
//             }
//         });

//         if (promises.length > 0) {
//             return Promise.all(promises).then(results => {
//                 frm.set_value("warr", results.join("\n"));
//             });
//         }
//     }
// });

frappe.ui.form.on('Sales Order', {
    before_save: function(frm) {
        // check if there is at least one item with warranty_name
        if (frm.doc.items && frm.doc.items.length > 0 && frm.doc.items[0].warranty_name) {
            let first_row = frm.doc.items[0];

            return frappe.db.get_doc('Warranty', first_row.warranty_name).then(warranty => {
                let warr_name = first_row.warranty_name;
                let warr_desc = warranty.description || "";
                frm.set_value("warr", warr_name + " " + warr_desc);
            });
        } else {
            // clear if no warranty in first row
            frm.set_value("warr", "");
        }
    }
});
