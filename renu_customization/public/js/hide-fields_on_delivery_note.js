frappe.ui.form.on('Delivery Note', {
    onload: function(frm) {
        // Hide fields
        frm.set_df_property('pick_list', 'hidden', 1);
        frm.set_df_property('invoice_type', 'hidden', 1);
    }
});
