frappe.ui.form.on('Sales Order', {
    shipping_address_name: function(frm) {
        set_domestic_export(frm);
    },
    company_address: function(frm) {
        set_domestic_export(frm);
    }
});

var set_domestic_export = function(frm) {
    if (frm.doc.shipping_address_name && frm.doc.company_address) {
        // Fetch Shipping Address Country
        frappe.db.get_value("Address", frm.doc.shipping_address_name, "country", (r) => {
            if (r && r.country) {
                let shipping_country = r.country;
                
                // Fetch Company Address Country
                frappe.db.get_value("Address", frm.doc.company_address, "country", (res) => {
                    if (res && res.country) {
                        let company_country = res.country;
                        if (shipping_country === company_country) {
                            frm.set_value('is_domestic', 1);
                            frm.set_value('is_export', 0);
                        } else {
                            frm.set_value('is_domestic', 0);
                            frm.set_value('is_export', 1);
                        }
                    }
                });
            }
        });
    } else {
         // Reset if either address is missing
         frm.set_value('is_domestic', 0);
         frm.set_value('is_export', 0);
    }
}
