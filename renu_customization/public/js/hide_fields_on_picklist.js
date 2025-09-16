frappe.ui.form.on('Pick List', {
    onload: function(frm) {
        // Hide fields
        frm.set_df_property('sales_order', 'hidden', 1);
        frm.set_df_property('invoice_type', 'hidden', 1);
    }
});
