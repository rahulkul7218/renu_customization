frappe.ui.form.on('Item', {
    purchase_warranty: function(frm) {
        if(frm.doc.purchase_warranty) {
            // Fetch the linked Warranty document
            frappe.db.get_doc('Warranty', frm.doc.purchase_warranty)
            .then(warranty => {
                // Set the 'warranty_day' field with the value from Warranty
                frm.set_value('warranty_day', warranty.warranty_days);
            });
        } else {
            // Clear the field if no warranty is selected
            frm.set_value('warranty_day', '');
        }
    }
});
