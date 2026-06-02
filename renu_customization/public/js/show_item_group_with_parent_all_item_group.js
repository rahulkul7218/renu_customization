frappe.ui.form.on("Item", {
    refresh: function(frm) {
        frm.set_query("item_group", function() {
            return {
                filters: {
                    parent_item_group: "All Item Groups"
                }
            };
        });
    }
});
