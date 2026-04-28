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
                        frappe.call({
                            method: 'renu_customization.api.export_excel.export_to_excel',
                            args: {
                                doctype: frm.doc.doctype,
                                name: frm.doc.name,
                                print_format: values.export_option
                            },
                            callback: function(r) {
                                if (r.message && r.message.filecontent) {
                                    let b64toBlob = (b64Data, contentType='', sliceSize=512) => {
                                        const byteCharacters = atob(b64Data);
                                        const byteArrays = [];
                                        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
                                            const slice = byteCharacters.slice(offset, offset + sliceSize);
                                            const byteNumbers = new Array(slice.length);
                                            for (let i = 0; i < slice.length; i++) {
                                                byteNumbers[i] = slice.charCodeAt(i);
                                            }
                                            const byteArray = new Uint8Array(byteNumbers);
                                            byteArrays.push(byteArray);
                                        }
                                        return new Blob(byteArrays, {type: contentType});
                                    };
                                    let blob = b64toBlob(r.message.filecontent, "application/vnd.ms-excel");
                                    let link = document.createElement("a");
                                    link.href = window.URL.createObjectURL(blob);
                                    link.download = r.message.filename;
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                }
                            }
                        });
                    }
                });
                d.show();
            }, __('Actions'));
        }
    }
});
