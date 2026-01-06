// // =================== PACKING SLIP CLIENT SCRIPT (FINAL UPDATED) ===================

// frappe.ui.form.on('Packing Slip', {
//     onload: function(frm) {
//         if (frm.doc.__islocal || frm.doc.docstatus === 0) {
//             if (frm.doc.delivery_note && frm.doc.items) {
//                 setTimeout(() => {
//                     frm.doc.items.forEach(row => {
//                         if (row.item_code) {
//                             fetch_remaining_serials_for_row(frm, 'Packing Slip Item', row.name);
//                         }
//                     });
//                 }, 500);
//             }
//         }
//     },

//     refresh: function(frm) {
//         if (frm.doc.__islocal && frm.doc.delivery_note && frm.doc.items) {
//             frm.doc.items.forEach(row => {
//                 if (row.item_code && !row.serial_no) {
//                     fetch_remaining_serials_for_row(frm, 'Packing Slip Item', row.name);
//                 }
//             });
//         }
//     },

//     delivery_note: function(frm) {
//         if (frm.doc.delivery_note && frm.doc.items) {
//             frm.doc.items.forEach(row => {
//                 if (row.item_code) {
//                     frappe.model.set_value(row.doctype, row.name, 'serial_no', '');
//                     frappe.model.set_value(row.doctype, row.name, 'remaining_serial', '');
//                     setTimeout(() => {
//                         fetch_remaining_serials_for_row(frm, 'Packing Slip Item', row.name);
//                     }, 300);
//                 }
//             });
//         }
//     },

//     // Validate before save
//     before_save: function(frm) {
//         let has_mismatch = false;

//         (frm.doc.items || []).forEach(row => {
//             if (!row.item_code) return;

//             const current_serials = (row.serial_no || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
//             const qty = cint(row.qty);
//             const count = current_serials.length;

//             if (count !== qty && qty > 0) {
//                 has_mismatch = true;
//                 frappe.msgprint({
//                     title: "Serial Number Mismatch",
//                     message: `Item: <b>${row.item_code}</b><br>
//                               Quantity is <b>${qty}</b>, but you have <b>${count}</b> serial numbers.<br>
//                               ${count > qty ? 'Please remove excess serial numbers.' : 'Please add more serial numbers.'}`,
//                     indicator: count > qty ? "red" : "orange"
//                 });
//             }
//         });

//         if (has_mismatch) {
//             frappe.validated = false; // stop save
//         }
//     }
// });

// frappe.ui.form.on('Packing Slip Item', {
//     form_render: function(frm, cdt, cdn) {
//         initialize_row_state(cdt, cdn);
//     },

//     items_add: function(frm, cdt, cdn) {
//         initialize_row_state(cdt, cdn);
//         let row = locals[cdt][cdn];
//         if (frm.doc.delivery_note && row.item_code) {
//             setTimeout(() => {
//                 fetch_remaining_serials_for_row(frm, cdt, cdn);
//             }, 500);
//         }
//     },

//     item_code: function(frm, cdt, cdn) {
//         let row = locals[cdt][cdn];
//         if (frm.doc.delivery_note && row.item_code) {
//             frappe.model.set_value(cdt, cdn, 'serial_no', '');
//             frappe.model.set_value(cdt, cdn, 'remaining_serial', '');
//             setTimeout(() => fetch_remaining_serials_for_row(frm, cdt, cdn), 300);
//         }
//     },

//     qty: function(frm, cdt, cdn) {
//         handle_serial_tracking(frm, cdt, cdn);
//     },

//     serial_no: function(frm, cdt, cdn) {
//         setTimeout(() => handle_serial_tracking(frm, cdt, cdn), 200);
//     }
// });

// // ----------------------------------------------------------
// // Utility functions
// // ----------------------------------------------------------

// function initialize_row_state(cdt, cdn) {
//     const row = locals[cdt][cdn];
//     if (!row) return;

//     row._original_serials = (row.serial_no || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
//     row._remaining_serials_backup = (row.remaining_serial || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
// }

// function handle_serial_tracking(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     if (!row || !row.item_code) return;

//     if (row._original_serials === undefined) {
//         initialize_row_state(cdt, cdn);
//     }

//     const current_serials = (row.serial_no || '').split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
//     const qty = cint(row.qty);

//     const removed_serials = row._original_serials.filter(s => !current_serials.includes(s));
//     let remaining_set = new Set([...row._remaining_serials_backup, ...removed_serials]);

//     current_serials.forEach(s => {
//         if (remaining_set.has(s)) remaining_set.delete(s);
//     });

//     frappe.model.set_value(cdt, cdn, "remaining_serial", Array.from(remaining_set).join('\n'));

//     row._original_serials = [...current_serials];
//     row._remaining_serials_backup = Array.from(remaining_set);
// }

// function fetch_remaining_serials_for_row(frm, cdt, cdn) {
//     let row = locals[cdt][cdn];
//     if (!row || !frm.doc.delivery_note || !row.item_code) return;
//     if (frm.doc.docstatus === 1) return;

//     console.log(`🔍 Fetching remaining serials for ${row.item_code}...`);

//     // Step 1: Get all submitted packing slips for this delivery note
//     frappe.call({
//         method: "frappe.client.get_list",
//         args: {
//             doctype: "Packing Slip",
//             filters: {
//                 delivery_note: frm.doc.delivery_note,
//                 docstatus: 1
//             },
//             fields: ["name"]
//         },
//         callback: function(r) {
//             let all_packed_serials = new Set();

//             if (r.message && r.message.length > 0) {
//                 let processed = 0, total = r.message.length;

//                 r.message.forEach(ps => {
//                     frappe.call({
//                         method: "frappe.client.get",
//                         args: { doctype: "Packing Slip", name: ps.name },
//                         callback: function(ps_res) {
//                             if (ps_res.message && ps_res.message.items) {
//                                 ps_res.message.items.forEach(item => {
//                                     if (item.item_code === row.item_code && item.serial_no) {
//                                         let serials = item.serial_no.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
//                                         serials.forEach(s => all_packed_serials.add(s));
//                                     }
//                                 });
//                             }
//                             processed++;
//                             if (processed === total) {
//                                 // Step 2: Get DN serials and filter
//                                 fetch_dn_serials_and_filter(frm, cdt, cdn, all_packed_serials);
//                             }
//                         }
//                     });
//                 });
//             } else {
//                 fetch_dn_serials_and_filter(frm, cdt, cdn, all_packed_serials);
//             }
//         }
//     });
// }

// // Step 2: Fetch serials from Delivery Note and handle auto-fill
// function fetch_dn_serials_and_filter(frm, cdt, cdn, used_serials) {
//     let row = locals[cdt][cdn];
//     if (!row || !frm.doc.delivery_note || !row.item_code) return;

//     frappe.call({
//         method: "frappe.client.get",
//         args: { doctype: "Delivery Note", name: frm.doc.delivery_note },
//         callback: function(dn_res) {
//             if (dn_res.message && dn_res.message.items) {
//                 let matching_item = dn_res.message.items.find(d => d.item_code === row.item_code);
//                 if (matching_item && matching_item.serial_no) {
//                     let all_dn_serials = matching_item.serial_no
//                         .split(/[\n,]+/)
//                         .map(s => s.trim())
//                         .filter(Boolean);

//                     // Remove serial numbers already used in other packing slips
//                     let remaining_serials = all_dn_serials.filter(s => !used_serials.has(s));

//                     // Update "Remaining Serial"
//                     frappe.model.set_value(cdt, cdn, "remaining_serial", remaining_serials.join('\n'));
//                     row._remaining_serials_backup = [...remaining_serials];

//                     // ✅ Auto-fill logic:
//                     // If remaining serials exist → use them.
//                     // Else → use all DN serials.
//                     let serials_to_fill = remaining_serials.length > 0 ? remaining_serials : all_dn_serials;
//                     frappe.model.set_value(cdt, cdn, "serial_no", serials_to_fill.join('\n'));

//                     // Optional notice when all are already used
//                     if (remaining_serials.length === 0) {
//                         frappe.msgprint(`All serial numbers for item <b>${row.item_code}</b> are already used in previous Packing Slips.`);
//                     }
//                 }
//             }
//         }
//     });
// }
