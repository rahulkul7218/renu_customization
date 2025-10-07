frappe.ui.form.on("Serial No", {
    refresh: function(frm) {
        frm.set_df_property("warranty_expiry_date", "read_only", 1);
        frm.set_df_property("warranty_days", "read_only", 1);
    },
    onload: function(frm) {
        frm.set_df_property("warranty_expiry_date", "read_only", 1);
        frm.set_df_property("warranty_days", "read_only", 1);
    }
});
