frappe.ui.form.on("Item", {
    refresh: function(frm) {
        frm.set_query("sales_warranty", function() {
            return {
                filters: {
                    sales_warranty: 1
                }
            };
        });
    }
});
