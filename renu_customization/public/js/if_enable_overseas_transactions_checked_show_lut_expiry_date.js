frappe.ui.form.on("GST Settings", {
    
    enable_overseas_transactions(frm) {
        frm.trigger("toggle_lut_fields");
    },

    onload(frm) {
        frm.trigger("toggle_lut_fields");
    },

    refresh(frm) {
        frm.trigger("toggle_lut_fields");
    },

    toggle_lut_fields(frm) {
        const show = frm.doc.enable_overseas_transactions ? 1 : 0;

        // Show/Hide fields
        frm.toggle_display("lut_no", show);
        frm.toggle_display("lut_expiry_date", show);

        // Make Mandatory Only When Checked
        frm.set_df_property("lut_no", "reqd", show);
        frm.set_df_property("lut_expiry_date", "reqd", show);
    }
});
