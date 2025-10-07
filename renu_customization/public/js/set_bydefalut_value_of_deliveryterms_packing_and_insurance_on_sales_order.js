frappe.ui.form.on("Sales Order", {   // Replace "Sales Order" with your Doctype name
    onload: function(frm) {
        if (!frm.doc.delivery_term) {
            frm.set_value("delivery_term", "Ex-works Pune, India");
            frm.set_value("packing", "Included in unit price");
            frm.set_value("insurance", "To Your account");
            
        }
    }
});
