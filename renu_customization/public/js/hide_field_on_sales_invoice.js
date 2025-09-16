frappe.ui.form.on('Sales Invoice', {
    onload: function(frm) {
        // Hide fields
        frm.set_df_property('delivery_note', 'hidden', 1);
        
    }
});
