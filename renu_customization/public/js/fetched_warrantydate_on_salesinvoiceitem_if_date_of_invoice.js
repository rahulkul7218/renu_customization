frappe.ui.form.on('Sales Invoice Item', {
    items_add: function(frm, cdt, cdn) {
        let row = locals[cdt][cdn];

        // Only set warranty_date if warranty_begins is already "Date of Dispatch"
        if (row.warranty_begins === "Date of Invoice") {
            row.warranty_start_date = frm.doc.posting_date;
        }

        frm.refresh_field('items');
    }
});

frappe.ui.form.on('Sales Invoice', {
    before_save: function(frm) {
        if (frm.doc.items) {
            frm.doc.items.forEach(function(row) {
                if (row.warranty_begins === "Date of Invoice") {
                    row.warranty_start_date = frm.doc.posting_date;
                }
            });
            frm.refresh_field('items');
        }
    },

    posting_date: function(frm) {
        if (frm.doc.items) {
            frm.doc.items.forEach(function(row) {
                if (row.warranty_begins === "Date of Invoice") {
                    row.warranty_start_date = frm.doc.posting_date;
                }
            });
            frm.refresh_field('items');
        }
    }
});
