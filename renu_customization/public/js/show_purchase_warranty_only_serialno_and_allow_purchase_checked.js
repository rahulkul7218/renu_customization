frappe.ui.form.on('Item', {
    refresh: function(frm) {
        toggle_purchase_warranty_fields(frm);
    },
    has_batch_no: function(frm) {
        toggle_purchase_warranty_fields(frm);
    },
    has_serial_no: function(frm) {
        toggle_purchase_warranty_fields(frm);
    },
    is_purchase_item: function(frm) {
        toggle_purchase_warranty_fields(frm);
    }
});

function toggle_purchase_warranty_fields(frm) {
    const show_fields = (frm.doc.is_purchase_item && (frm.doc.has_batch_no || frm.doc.has_serial_no));

    frm.toggle_display(['purchase_warranty', 'warranty_day'], show_fields);
}
