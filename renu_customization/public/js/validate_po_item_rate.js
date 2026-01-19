// Client script to validate Purchase Order item rates
// Prevents saving PO if any item has rate <= 0

frappe.ui.form.on('Purchase Order', {
    validate: function(frm) {
        // Check all items in the items table
        let invalid_items = [];
        
        if (frm.doc.items && frm.doc.items.length > 0) {
            frm.doc.items.forEach(function(item) {
                // Check if rate is 0 or less than 0
                if (!item.rate || item.rate <= 0) {
                    invalid_items.push(item.item_code);
                }
            });
        }
        
        // If there are items with invalid rates, prevent save and show error
        if (invalid_items.length > 0) {
            frappe.msgprint({
                title: __('Invalid Item Rate'),
                message: __('Cannot save Purchase Order.Rate should be Greater than zero', 
                    [invalid_items.join(', ')]),
                indicator: 'red'
            });
            frappe.validated = false;
        }
    }
});
