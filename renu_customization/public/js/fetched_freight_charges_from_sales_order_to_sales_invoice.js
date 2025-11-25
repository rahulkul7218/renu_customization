// frappe.ui.form.on("Sales Invoice", {
//     refresh(frm) {
//         if (frm.is_new() && frm.doc.items?.length > 0) {
//             fetch_non_stock_items(frm);
//         }
//     }
// });

// function fetch_non_stock_items(frm) {
//     let dn = frm.doc.items[0].delivery_note;
//     if (!dn) return;

//     // Step 1: Get Delivery Note → Sales Order
//     frappe.call({
//         method: "frappe.client.get",
//         args: { doctype: "Delivery Note", name: dn },
//         callback(r) {
//             if (!r.message) return;

//             let so = r.message.items[0]?.against_sales_order;
//             if (!so) return;

//             // Step 2: Get NON-STOCK items from Sales Order
//             frappe.call({
//                 method: "frappe.client.get",
//                 args: { doctype: "Sales Order", name: so },
//                 callback(res) {
//                     if (!res.message) return;

//                     let so_items = res.message.items;

//                     so_items.forEach(row => {

//                         // Check if NON-STOCK by is_stock_item
//                         frappe.call({
//                             method: "frappe.client.get_value",
//                             args: {
//                                 doctype: "Item",
//                                 filters: { name: row.item_code },
//                                 fieldname: ["name", "is_stock_item"]
//                             },
//                             callback(item_res) {
//                                 if (item_res.message && item_res.message.is_stock_item == 0) {

//                                     // ✅ Correct duplicate check (per SO item row)
//                                     let exists = frm.doc.items.some(
//                                         i => i.sales_order_item === row.name
//                                     );

//                                     if (!exists) {
//                                         let child = frm.add_child("items", {
//                                             item_code: row.item_code,
//                                             qty: row.qty,
//                                             rate: row.rate,
//                                             description: row.description,
//                                             sales_order: so,
//                                             sales_order_item: row.name,   // ⭐ important
//                                             uom: row.uom,
//                                             item_name: row.item_name,
//                                             party_item_code: row.party_item_code,
//                                             warranty_name: row.warranty_name,
//                                             warranty_days: row.warranty_days,
//                                             warranty_begins: row.warranty_begins,
//                                         });

//                                         frm.refresh_field("items");
//                                     }
//                                 }
//                             }
//                         });

//                     });
//                 }
//             });
//         }
//     });
// }


frappe.ui.form.on("Sales Invoice", {
    refresh(frm) {
        if (frm.is_new() && frm.doc.items?.length > 0) {
            fetch_non_stock_items(frm);
        }
    }
});

function fetch_non_stock_items(frm) {
    let dn = frm.doc.items[0].delivery_note;
    if (!dn) return;

    // Step 1: Get Delivery Note → Sales Order
    frappe.call({
        method: "frappe.client.get",
        args: { doctype: "Delivery Note", name: dn },
        callback(r) {
            if (!r.message) return;

            let so = r.message.items[0]?.against_sales_order;
            if (!so) return;

            // Step 2: Get Sales Order Items
            frappe.call({
                method: "frappe.client.get",
                args: { doctype: "Sales Order", name: so },
                callback(res) {
                    if (!res.message) return;

                    let so_items = res.message.items;

                    // Step 3: Get Company Default Income Account
                    frappe.call({
                        method: "frappe.client.get",
                        args: { doctype: "Company", name: frm.doc.company },
                        callback(cmp) {
                            let income_acc = cmp.message.default_income_account;

                            // Loop SO items
                            so_items.forEach(row => {

                                // Check if NON-STOCK
                                frappe.call({
                                    method: "frappe.client.get_value",
                                    args: {
                                        doctype: "Item",
                                        filters: { name: row.item_code },
                                        fieldname: ["name", "is_stock_item"]
                                    },
                                    callback(item_res) {
                                        if (item_res.message && item_res.message.is_stock_item == 0) {

                                            // Avoid duplicates based on SO row
                                            let exists = frm.doc.items.some(
                                                i => i.sales_order_item === row.name
                                            );
                                            if (exists) return;

                                            // Add non-stock item
                                            let child = frm.add_child("items", {
                                                item_code: row.item_code,
                                                qty: row.qty,
                                                rate: row.rate,
                                                description: row.description,
                                                sales_order: so,
                                                sales_order_item: row.name,
                                                uom: row.uom,
                                                item_name: row.item_name,
                                                party_item_code: row.party_item_code,
                                                warranty_name: row.warranty_name,
                                                warranty_days: row.warranty_days,
                                                warranty_begins: row.warranty_begins,
                                                income_account: income_acc    // ⭐ only from company
                                            });

                                            frm.refresh_field("items");
                                        }
                                    }
                                });
                            });
                        }
                    });

                }
            });
        }
    });
}
