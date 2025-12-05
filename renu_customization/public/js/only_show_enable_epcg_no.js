frappe.ui.form.on("Company", {
    refresh: function(frm) {
        frm.set_query("epcg_no", function() {
            return {
                filters: {
                    enable: 1
                }
            };
        });
    }
});
