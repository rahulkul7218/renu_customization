frappe.ui.form.on('Sales Invoice', {
    before_save: function(frm) {
        frm.doc.items.forEach(function(row) {
            if (row.warranty_start_date && row.warranty_days) {
                // Convert start date to Date object
                let start_date = frappe.datetime.str_to_obj(row.warranty_start_date);
                
                // Add warranty days
                start_date.setDate(start_date.getDate() + flt(row.warranty_days));

                // Set warranty_end_date in YYYY-MM-DD format
                row.warranty_end_date = frappe.datetime.obj_to_str(start_date);
            }
        });

        // Refresh the child table to show updated values
        frm.refresh_field('items');
    }
});
