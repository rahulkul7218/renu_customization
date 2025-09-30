frappe.ui.form.on('Pick List Item', {
    sales_order: function(frm, cdt, cdn) {
        const row = locals[cdt][cdn];

        if (!row.sales_order) {
            row.warranty_name = '';
            row.warranty_days = '';
            row.warranty_begins = '';
            frm.refresh_field('items');
            return;
        }

        // Fetch items from linked Sales Order
        frappe.db.get_doc('Sales Order', row.sales_order).then(so => {
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