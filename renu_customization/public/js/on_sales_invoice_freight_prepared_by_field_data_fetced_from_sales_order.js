// frappe.ui.form.on('Sales Invoice', {
//     sales_order(frm) {
//         if (frm.doc.sales_order) {
//             frappe.db.get_value('Sales Order', frm.doc.sales_order, 'freight_prepared_by')
//                 .then(r => {
//                     if (r.message.freight_prepared_by) {
//                         frm.set_value('freight_prepared_by', r.message.freight_prepared_by);
//                     }
//                 });
//         }
//     }
// });

// frappe.ui.form.on('Sales Invoice', {
//     refresh(frm) {
//         // Try to fetch when form refreshes (cover page load)
//         if (frm.doc.sales_order) {
//             fetch_so_fields(frm);
//         }
//     },
//     sales_order(frm) {
//         // Fetch when user selects/changes the Sales Order
//         fetch_so_fields(frm);
//     }
// });

// function fetch_so_fields(frm) {
//     if (!frm.doc.sales_order) {
//         return;
//     }

//     // Helpful console log for debugging
//     console.log('[fetch_so_fields] fetching fields from Sales Order:', frm.doc.sales_order);

//     frappe.call({
//         method: 'frappe.client.get',
//         args: {
//             doctype: 'Sales Order',
//             name: frm.doc.sales_order,
//             fields: ['port_of_discharge', 'freight_prepared_by', 'port_of_loading']
//         },
//         callback: function (r) {
//             if (!r || !r.message) {
//                 frappe.msgprint(__('Could not fetch Sales Order. Check permissions or Sales Order name.'));
//                 console.warn('[fetch_so_fields] no r.message returned', r);
//                 return;
//             }

//             const so = r.message;
//             console.log('[fetch_so_fields] Sales Order data:', so);

//             // Map Sales Order fields → Sales Invoice fields
//             // NOTE: your Sales Invoice field name is port_of_discharg (no 'e') — using exactly that.
//             frm.set_value('port_of_discharg', so.port_of_discharge || '');
//             frm.set_value('freight_prepared_by', so.freight_prepared_by || '');
//             frm.set_value('port_of_loading', so.port_of_loading || '');

//             // Refresh just to be safe
//             frm.refresh_field('port_of_discharg');
//             frm.refresh_field('freight_prepared_by');
//             frm.refresh_field('port_of_loading');

//             // small UI hint
//             frappe.show_alert({message: __('Fetched fields from Sales Order'), indicator: 'green'});
//         },
//         error: function (err) {
//             console.error('[fetch_so_fields] error', err);
//             frappe.msgprint(__('Error while fetching Sales Order — check browser console for details.'));
//         }
//     });
// }
