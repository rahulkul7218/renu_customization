frappe.ui.form.on('Serial No', {
    onload: function(frm) {
        frm.set_df_property('warranty_period', 'hidden', 1);
    },
    refresh: function(frm) {
        frm.set_df_property('warranty_period', 'hidden', 1);
    }
});
