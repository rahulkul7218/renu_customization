frappe.ui.form.on("Company", {
    refresh: function(frm) {
        frm.set_query("lut_number", function() {
            return {
                filters: {
                    enable: 1
                }
            };
        });
    }
});
