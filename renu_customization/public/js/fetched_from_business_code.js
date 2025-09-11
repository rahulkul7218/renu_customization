frappe.ui.form.on('Customer', {
    business_regions_code: function(frm) {
        if (frm.doc.business_regions_code) {
            frappe.db.get_value('Business Region Code', frm.doc.business_regions_code, 'business_region_name')
                .then(r => {
                    if (r.message) {
                        frm.set_value('business_region_name', r.message.business_region_name);
                    }
                });
        } else {
            frm.set_value('business_region_name', '');
        }
    }
});
