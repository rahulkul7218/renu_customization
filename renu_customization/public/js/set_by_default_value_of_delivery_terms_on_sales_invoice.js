frappe.ui.form.on("Sales Invoice", {   // Replace "Sales Order" with your Doctype name
    onload: function(frm) {
        if (!frm.doc.delivery_term) {
            frm.set_value("delivery_term", "Ex-works Pune, India");
        }
    }
});
