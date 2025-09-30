frappe.ui.form.on('Sales Order Item', {
    item_code: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        if (!row.item_code) {
            row.warranty_name = '';
            row.warranty_days = '';
            row.warranty_begins = '';
            frm.refresh_field('items');
            return;
        }

        // Fetch the item
        frappe.db.get_doc('Item', row.item_code).then(item_doc => {
            // Only use sales_warranty
            if (item_doc.sales_warranty) {
                row.warranty_name = item_doc.sales_warranty; // set default

                // Fetch warranty_days and warranty_begins from Warranty doctype
                frappe.db.get_doc('Warranty', item_doc.sales_warranty).then(warranty_doc => {
                    row.warranty_days = warranty_doc.warranty_days || 0;
                    row.warranty_begins = warranty_doc.warranty_begins || '';
                    frm.refresh_field('items'); // refresh row to show values
                });

            } else {
                row.warranty_name = '';
                row.warranty_days = '';
                row.warranty_begins = '';
                frm.refresh_field('items');
            }
        });
    },

    // Optional: if user manually selects warranty_name
    warranty_name: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];
        if (row.warranty_name) {
            frappe.db.get_doc('Warranty', row.warranty_name).then(warranty_doc => {
                row.warranty_days = warranty_doc.warranty_days || 0;
                row.warranty_begins = warranty_doc.warranty_begins || '';
                frm.refresh_field('items');
            });
        } else {
            row.warranty_days = '';
            row.warranty_begins = '';
            frm.refresh_field('items');
        }
    }
});
