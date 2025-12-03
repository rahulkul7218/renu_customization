frappe.ui.form.on('Sales Order', {
    refresh(frm) {
        frm.set_df_property('currency', 'read_only', 1);
        frm.set_df_property('conversion_rate', 'read_only', 1);
    }
});
