frappe.ui.form.on('Item', {
    under_development: function(frm) {
        if (frm.doc.under_development) {
            frm.set_value('disabled', 1);
        } else {
            frm.set_value('disabled', 0);
        }
    }
});
