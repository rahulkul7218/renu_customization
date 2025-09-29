frappe.ui.form.on('Item', {
    refresh: function(frm) {
        toggle_sales_warranty_fields(frm);
    },
    has_batch_no: function(frm) {
        toggle_sales_warranty_fields(frm);
    },
    has_serial_no: function(frm) {
        toggle_sales_warranty_fields(frm);
    },
    is_sales_item: function(frm) {
        toggle_sales_warranty_fields(frm);
    }
});

function toggle_sales_warranty_fields(frm) {
    const show_fields = (frm.doc.is_sales_item && (frm.doc.has_batch_no || frm.doc.has_serial_no));
    frm.toggle_display(['sales_warranty', 'warranty_days'], show_fields);
}
