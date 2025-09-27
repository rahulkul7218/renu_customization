// frappe.ui.form.on('Sales Invoice', {
//     onload(frm) {
//         if (frm.doc.invoice_type) {
//             frm.set_value('invoice_typ', frm.doc.invoice_type);
//         } else if (frm.doc.invoice_typ) {
//             frm.set_value('invoice_type', frm.doc.invoice_typ);
//         }
//     },

//     refresh(frm) {
//         if (frm.doc.invoice_type) {
//             if (frm.doc.invoice_typ !== frm.doc.invoice_type) {
//                 frm.set_value('invoice_typ', frm.doc.invoice_type);
//             }
//         } else if (frm.doc.invoice_typ) {
//             frm.set_value('invoice_type', frm.doc.invoice_typ);
//         }
//     },

//     invoice_type(frm) {
//         console.log('invoice_type changed ->', frm.doc.invoice_type);
//         frm.set_value('invoice_typ', frm.doc.invoice_type || '');
//     },

//     invoice_typ(frm) {
//         console.log('invoice_typ changed ->', frm.doc.invoice_typ);
//         if (!frm.doc.invoice_type && frm.doc.invoice_typ) {
//             frm.set_value('invoice_type', frm.doc.invoice_typ);
//         }
//     },

//     validate(frm) {
//         if (frm.doc.invoice_type) {
//             if (frm.doc.invoice_typ !== frm.doc.invoice_type) {
//                 frm.set_value('invoice_typ', frm.doc.invoice_type);
//             }
//         } else if (frm.doc.invoice_typ) {
//             frm.set_value('invoice_type', frm.doc.invoice_typ);
//         }
//     }
// });

frappe.ui.form.on('Sales Invoice', {
    onload(frm) {
        if (frm.doc.invoice_type) {
            frm.set_value('invoice_typ', frm.doc.invoice_type);
        } else if (frm.doc.invoice_typ) {
            frm.set_value('invoice_type', frm.doc.invoice_typ);
        }
    },

    refresh(frm) {
        if (frm.doc.invoice_type) {
            if (frm.doc.invoice_typ !== frm.doc.invoice_type) {
                frm.set_value('invoice_typ', frm.doc.invoice_type);
            }
        } else if (frm.doc.invoice_typ) {
            frm.set_value('invoice_type', frm.doc.invoice_typ);
        }
    },

    invoice_type(frm) {
        console.log('invoice_type changed ->', frm.doc.invoice_type);
        frm.set_value('invoice_typ', frm.doc.invoice_type || '');
    },

    invoice_typ(frm) {
        console.log('invoice_typ changed ->', frm.doc.invoice_typ);
        // always update invoice_type based on invoice_typ
        frm.set_value('invoice_type', frm.doc.invoice_typ || '');
    },

    validate(frm) {
        if (frm.doc.invoice_type) {
            if (frm.doc.invoice_typ !== frm.doc.invoice_type) {
                frm.set_value('invoice_typ', frm.doc.invoice_type);
            }
        } else if (frm.doc.invoice_typ) {
            frm.set_value('invoice_type', frm.doc.invoice_typ);
        }
    }
});
