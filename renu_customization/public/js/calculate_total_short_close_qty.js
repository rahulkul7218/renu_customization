
frappe.ui.form.on('Sales Order Item', {
    custom_short_closed_qty: function (frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        let current_val = flt(row.custom_short_closed_qty || 0);
        let last_val = flt(row._last_short_closed_qty || 0);

        // Initialize total if empty
        if (!row.total_short_close_qty) {
            row.total_short_close_qty = 0;
        }

        // Add only the difference
        let diff = current_val - last_val;
        if (diff !== 0) {
            row.total_short_close_qty += diff;
        }

        // Store current value for next change
        row._last_short_closed_qty = current_val;

        frm.refresh_field("items");
    }
});