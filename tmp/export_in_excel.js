//In path public/js
frappe.ui.form.on('Sales Invoice', {
    refresh: function (frm) {
        if (!frm.is_new()) {
            frm.add_custom_button(__('Export In Excel'), function () {
                let d = new frappe.ui.Dialog({
                    title: __('Export Sales Invoice In Excel'),
                    fields: [
                        {
                            label: __('Select Export Option'),
                            fieldname: 'export_option',
                            fieldtype: 'Select',
                            options: [
                                'RFA Product Export SI',
                                'RFA Service Export INR',
                                'RFA Annexure Export',
                                'RFA Scomet',
                                'RFA SDF'
                            ],
                            reqd: 1
                        }
                    ],
                    primary_action_label: __('Export'),
                    primary_action(values) {
                        d.hide();
                        let url = '/api/method/renu_customization.api.export_excel.export_to_excel?' +
                            $.param({
                                doctype: frm.doc.doctype,
                                name: frm.doc.name,
                                print_format: values.export_option
                            });
                        window.open(url, '_blank');
                    }
                });
                d.show();
            }, __('Actions'));
        }
    }
});
