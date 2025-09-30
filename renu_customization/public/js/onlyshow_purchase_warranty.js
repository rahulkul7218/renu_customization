frappe.ui.form.on("Item", {
    refresh: function(frm) {
        frm.set_query("purchase_warranty", function() {
            return {
                filters: {
                    purchase_warranty: 1
                }
            };
        });
    }
});
