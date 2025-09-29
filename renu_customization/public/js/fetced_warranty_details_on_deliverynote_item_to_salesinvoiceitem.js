frappe.ui.form.on('Sales Invoice Item', {
    sales_order: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (!row.pick_list) {
            row.warranty_name = '';
            row.warranty_days = '';
            row.warranty_begins = '';
           
            frm.refresh_field('items');
            return;
        }

        // Fetch items from linked Sales Order
        frappe.db.get_doc('Delivery Note', row.sales_order).then(so => {
            const so_item = so.items.find(item => item.item_code === row.item_code);
            
            if (so_item) {
                row.warranty_name = so_item.warranty_name || '';
                row.warranty_days = so_item.warranty_days || '';
                row.warranty_begins = so_item.warranty_begins || '';
                
                frm.refresh_field('items');
            }
        });
    }
});


// frappe.ui.form.on('Sales Invoice Item', {
//     sales_order: function(frm, cdt, cdn) {
//         set_warranty_details(frm, cdt, cdn);
//     },
//     delivery_note: function(frm, cdt, cdn) {
//         set_warranty_details(frm, cdt, cdn);
//     }
// });

// function set_warranty_details(frm, cdt, cdn) {
//     const row = locals[cdt][cdn];

//     row.warranty_name = '';
//     row.warranty_days = '';
//     row.warranty_begins = '';
//     row.warranty_start_date = '';

//     // Case 1: From Sales Order
//     if (row.sales_order) {
//         frappe.db.get_doc('Sales Order', row.sales_order).then(so => {
//             const so_item = so.items.find(item => item.item_code === row.item_code);
//             if (so_item) {
//                 row.warranty_name = so_item.warranty_name || '';
//                 row.warranty_days = so_item.warranty_days || '';
//                 row.warranty_begins = so_item.warranty_begins || '';

//                 // Warranty Start Date Logic
//                 if (row.warranty_begins === "Date of Invoice") {
//                     row.warranty_start_date = frm.doc.posting_date;
//                 }
//                 frm.refresh_field('items');
//             }
//         });
//     }

//     // Case 2: From Delivery Note
//     else if (row.delivery_note) {
//         frappe.db.get_doc('Delivery Note', row.delivery_note).then(dn => {
//             const dn_item = dn.items.find(item => item.item_code === row.item_code);
//             if (dn_item) {
//                 row.warranty_name = dn_item.warranty_name || '';
//                 row.warranty_days = dn_item.warranty_days || '';
//                 row.warranty_begins = dn_item.warranty_begins || '';

//                 // Warranty Start Date Logic
//                 if (row.warranty_begins === "Date of Invoice") {
//                     row.warranty_start_date = frm.doc.posting_date;
//                 } else if (row.warranty_begins === "Date of Dispatch") {
//                     row.warranty_start_date = dn.posting_date || '';
//                 }
//                 frm.refresh_field('items');
//             }
//         });
//     }
// }
