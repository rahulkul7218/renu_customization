frappe.ui.form.on("Sales Order", {
    refresh(frm) {
        if (frm.is_new()) {
            frm.set_value("set_warehouse", "Stores - RFAPL");
        }
    }
});
