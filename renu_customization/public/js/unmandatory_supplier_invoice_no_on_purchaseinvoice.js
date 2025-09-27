frappe.ui.form.on('Purchase Invoice', {
    onload: function(frm) {
        frm.set_df_property('bill_no', 'reqd', 0); // makes it unmandatory
    }
});
