// function load_xlsx(callback) {
//     if (typeof XLSX !== "undefined") {
//         callback();
//         return;
//     }
//     let script = document.createElement("script");
//     script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
//     script.onload = callback;
//     document.head.appendChild(script);
// }

// // --- Global storage ---
// let uploaded_file_data = null; // temporarily store uploaded file
// let uploaded_po_no = null;     // PO No from uploaded sheet

// frappe.ui.form.on("Purchase Receipt", {
//     refresh(frm) {
//         frm.add_custom_button("Upload Item", () => {
//             load_xlsx(() => {
//                 let input = document.createElement("input");
//                 input.type = "file";
//                 input.accept = ".xlsx,.xls";

//                 input.onchange = (e) => {
//                     let file = e.target.files[0];
//                     if (!file) return;

//                     // Clear empty default row
//                     if (frm.doc.items && frm.doc.items.length === 1 && !frm.doc.items[0].item_code) {
//                         frm.clear_table("items");
//                     }

//                     let reader = new FileReader();

//                     reader.onload = function(e) {
//                         try {
//                             let data = new Uint8Array(e.target.result);
//                             let workbook = XLSX.read(data, { type: "array" });

//                             // Save uploaded file temporarily
//                             uploaded_file_data = {
//                                 name: file.name,
//                                 content: btoa(String.fromCharCode.apply(null, data))
//                             };

//                             // Reset trackers
//                             let global_seen_serials = {};
//                             let serial_map = {};
//                             let duplicate_rows = [];
//                             uploaded_po_no = null;

//                             workbook.SheetNames.forEach(sheetName => {
//                                 let sheet = workbook.Sheets[sheetName];
//                                 let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//                                 let start_idx = 1; // skip header

//                                 for (let idx = start_idx; idx < rows.length; idx++) {
//                                     let r = rows[idx];

//                                     let item_code = r[0] ? r[0].toString().trim() : "";
//                                     let serial_str = r[2] ? r[2].toString().trim() : "";
//                                     let uom = r[3] ? r[3].toString().trim() : "";
//                                     let po_no = r[4] ? r[4].toString().trim() : "";

//                                     if (!item_code) continue;

//                                     // Capture first PO No in the sheet
//                                     if (!uploaded_po_no && po_no) {
//                                         uploaded_po_no = po_no;
//                                     }

//                                     // Split and clean serial numbers
//                                     let serials = [];
//                                     if (serial_str) {
//                                         serials = serial_str
//                                             .split(/[\n,]+/)
//                                             .map(s => s.trim())
//                                             .filter(s => s.length > 0);
//                                     }

//                                     let qty = serials.length;

//                                     if (qty === 0) {
//                                         frappe.msgprint({
//                                             title: "Missing Serials",
//                                             message: `Row ${idx + 1}: Item <b>${item_code}</b> has no serial numbers provided.`,
//                                             indicator: "red"
//                                         });
//                                         return;
//                                     }

//                                     // check duplicate serials
//                                     serials.forEach(sn => {
//                                         if (global_seen_serials[sn]) {
//                                             duplicate_rows.push(idx + 1);
//                                         } else {
//                                             global_seen_serials[sn] = true;
//                                         }
//                                     });

//                                     serial_map[item_code] = { qty: qty, serials: serials, uom: uom };
//                                 }
//                             });

//                             // stop if duplicates found
//                             if (duplicate_rows.length > 0) {
//                                 frappe.msgprint(
//                                     `Duplicate Serial No found in file "<b>${file.name}</b>" at Excel row(s): <b>${duplicate_rows.map(r => "Row No " + r).join(", ")}</b>`
//                                 );
//                                 return;
//                             }

//                             // Populate items table
//                             let promises = [];
//                             Object.keys(serial_map).forEach(item_code => {
//                                 let existing_row = frm.doc.items.find(d => d.item_code === item_code);
//                                 let uploaded_serials = serial_map[item_code].serials;
//                                 let uploaded_qty = uploaded_serials.length;

//                                 if (existing_row) {
//                                     let final_qty = existing_row.qty && existing_row.qty > 0
//                                         ? Math.min(existing_row.qty, uploaded_qty)
//                                         : uploaded_qty;

//                                     let final_serials = uploaded_serials.slice(0, final_qty);

//                                     existing_row.qty = final_qty;
//                                     existing_row.received_qty = final_qty;
//                                     existing_row.accepted_qty = final_qty;
//                                     existing_row.rejected_qty = 0;
//                                     existing_row.serial_no = final_serials.join("\n");
//                                     if (serial_map[item_code].uom) existing_row.uom = serial_map[item_code].uom;

//                                     let p = frappe.db.get_value("Item Price", {
//                                         price_list: "Standard Buying",
//                                         item_code: item_code
//                                     }, "price_list_rate").then(r => {
//                                         if (r && r.message && r.message.price_list_rate) {
//                                             existing_row.rate = r.message.price_list_rate;
//                                         }
//                                         existing_row.amount = (existing_row.qty || 0) * (existing_row.rate || 0);
//                                     });
//                                     promises.push(p);

//                                 } else {
//                                     let item_row = frm.add_child("items");
//                                     let final_qty = uploaded_qty;
//                                     let final_serials = uploaded_serials.slice(0, final_qty);

//                                     item_row.item_code = item_code;
//                                     item_row.qty = final_qty;
//                                     item_row.received_qty = final_qty;
//                                     item_row.accepted_qty = final_qty;
//                                     item_row.rejected_qty = 0;
//                                     item_row.serial_no = final_serials.join("\n");
//                                     item_row.uom = serial_map[item_code].uom || "";

//                                     let p = frappe.db.get_value("Item", item_code, ["item_name", "standard_rate"])
//                                         .then(r => {
//                                             if (r && r.message) {
//                                                 item_row.item_name = r.message.item_name || "";
//                                                 item_row.rate = r.message.standard_rate || 0;
//                                             }
//                                             return frappe.db.get_value("Item Price", {
//                                                 price_list: "Standard Buying",
//                                                 item_code: item_code
//                                             }, "price_list_rate");
//                                         })
//                                         .then(r => {
//                                             if (r && r.message && r.message.price_list_rate) {
//                                                 item_row.rate = r.message.price_list_rate;
//                                             }
//                                             item_row.amount = (item_row.qty || 0) * (item_row.rate || 0);
//                                         });

//                                     promises.push(p);
//                                 }
//                             });

//                             Promise.all(promises).then(() => {
//                                 frm.refresh_field("items");
//                                 frappe.msgprint({
//                                     title: "Success",
//                                     message: `File "<b>${file.name}</b>" uploaded successfully.`,
//                                     indicator: "green"
//                                 });
//                             });

//                         } catch (err) {
//                             frappe.msgprint({
//                                 title: "Error",
//                                 message: "Could not read Excel file. Please check format.",
//                                 indicator: "red"
//                             });
//                             console.error(err);
//                         }
//                     };

//                     reader.readAsArrayBuffer(file);
//                 };

//                 input.click();
//             });
//         }, __("Get Items From"));
//     },

//     // before_submit(frm) {
//     //     if (uploaded_po_no && uploaded_po_no !== frm.doc.supplier_invoice_no) {
//     //         frappe.throw(
//     //             `Cannot submit! Uploaded PO No "<b>${uploaded_po_no}</b>" does not match Supplier Invoice No "<b>${frm.doc.supplier_invoice_no}</b>".`
//     //         );
//     //     }
//     // },
//      before_submit(frm) {
//     if (uploaded_po_no && uploaded_po_no !== frm.doc.purchase_order_no) {
//         frappe.throw(
//             `Cannot submit! Uploaded PO No "<b>${uploaded_po_no}</b>" does not match Custom Purchase Order No "<b>${frm.doc.purchase_order_no}</b>".`
//         );
//     }
// },

//     after_save(frm) {
//         if (uploaded_file_data) {
//             frappe.call({
//                 method: "frappe.client.insert",
//                 args: {
//                     doc: {
//                         doctype: "File",
//                         file_name: uploaded_file_data.name,
//                         is_private: 0,
//                         content: uploaded_file_data.content,
//                         attached_to_doctype: frm.doc.doctype,
//                         attached_to_name: frm.doc.name
//                     }
//                 },
//                 callback: function(res) {
//                     uploaded_file_data = null;
//                     frm.reload_doc();
//                 }
//             });
//         }
//     }
// });


function load_xlsx(callback) {
    if (typeof XLSX !== "undefined") {
        callback();
        return;
    }
    let script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js";
    script.onload = callback;
    document.head.appendChild(script);
}

// --- Global storage ---
let uploaded_file_data = null;
let uploaded_po_no = null;

frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        frm.add_custom_button("Upload Item", () => {
            load_xlsx(() => {
                let input = document.createElement("input");
                input.type = "file";
                input.accept = ".xlsx,.xls";

                input.onchange = (e) => {
                    let file = e.target.files[0];
                    if (!file) return;

                    // Clear default empty row
                    if (frm.doc.items && frm.doc.items.length === 1 && !frm.doc.items[0].item_code) {
                        frm.clear_table("items");
                    }

                    let reader = new FileReader();
                    reader.onload = function(e) {
                        try {
                            let data = new Uint8Array(e.target.result);
                            let workbook = XLSX.read(data, { type: "array" });

                            uploaded_file_data = {
                                name: file.name,
                                content: btoa(String.fromCharCode.apply(null, data))
                            };

                            uploaded_po_no = null;
                            let global_seen_serials = {};
                            let serial_map = {};
                            let duplicate_rows = [];

                            workbook.SheetNames.forEach(sheetName => {
                                let sheet = workbook.Sheets[sheetName];
                                let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
                                let start_idx = 1; // skip header row

                                for (let idx = start_idx; idx < rows.length; idx++) {
                                    let r = rows[idx];

                                    let item_code = r[0] ? r[0].toString().trim() : "";
                                    let serial_str = r[2] ? r[2].toString().trim() : "";
                                    let uom = r[3] ? r[3].toString().trim() : "";
                                    let po_no = r[4] ? r[4].toString().trim() : "";

                                    if (!item_code) continue;

                                    // Capture first PO No
                                    if (!uploaded_po_no && po_no) {
                                        uploaded_po_no = po_no;
                                    }

                                    // Clean serials
                                    let serials = [];
                                    if (serial_str) {
                                        serials = serial_str
                                            .split(/[\n,]+/)
                                            .map(s => s.trim())
                                            .filter(s => s.length > 0);
                                    }

                                    let qty = serials.length;
                                    if (qty === 0) {
                                        frappe.throw(`Row ${idx + 1}: Item <b>${item_code}</b> has no serial numbers.`);
                                    }

                                    // Duplicate check
                                    serials.forEach(sn => {
                                        if (global_seen_serials[sn]) {
                                            duplicate_rows.push(idx + 1);
                                        } else {
                                            global_seen_serials[sn] = true;
                                        }
                                    });

                                    // Merge repeated item codes
                                    if (!serial_map[item_code]) {
                                        serial_map[item_code] = { qty: 0, serials: [], uom: uom };
                                    }
                                    serial_map[item_code].qty += qty;
                                    serial_map[item_code].serials.push(...serials);
                                }
                            });

                            if (duplicate_rows.length > 0) {
                                frappe.throw(
                                    `Duplicate Serial No found in "<b>${file.name}</b>" at Excel row(s): <b>${duplicate_rows.map(r => "Row " + r).join(", ")}</b>`
                                );
                            }

                            let promises = [];
                            Object.keys(serial_map).forEach(item_code => {
                                let uploaded_qty = serial_map[item_code].serials.length;
                                let uploaded_serials = serial_map[item_code].serials;

                                let existing_row = frm.doc.items.find(d => d.item_code === item_code);

                                // Check accepted_qty limit
                                if (existing_row && existing_row.accepted_qty && uploaded_qty > existing_row.accepted_qty) {
                                    frappe.throw(
                                        `Item <b>${item_code}</b> → Uploaded serial count <b>${uploaded_qty}</b> cannot exceed system Accepted Qty <b>${existing_row.accepted_qty}</b>.`
                                    );
                                }

                                if (existing_row) {
                                    let final_qty = uploaded_qty;
                                    existing_row.qty = final_qty;
                                    existing_row.received_qty = final_qty;
                                    existing_row.accepted_qty = final_qty;
                                    existing_row.rejected_qty = 0;

                                    // Store one serial per line
                                    existing_row.serial_no = uploaded_serials.join("\n");
                                    if (serial_map[item_code].uom) existing_row.uom = serial_map[item_code].uom;

                                    let p = frappe.db.get_value("Item Price", {
                                        price_list: "Standard Buying",
                                        item_code: item_code
                                    }, "price_list_rate").then(r => {
                                        if (r?.message?.price_list_rate) {
                                            existing_row.rate = r.message.price_list_rate;
                                        }
                                        existing_row.amount = (existing_row.qty || 0) * (existing_row.rate || 0);
                                    });
                                    promises.push(p);

                                } else {
                                    let item_row = frm.add_child("items");
                                    let final_qty = uploaded_qty;

                                    item_row.item_code = item_code;
                                    item_row.qty = final_qty;
                                    item_row.received_qty = final_qty;
                                    item_row.accepted_qty = final_qty;
                                    item_row.rejected_qty = 0;
                                    item_row.serial_no = uploaded_serials.join("\n"); // one per line
                                    item_row.uom = serial_map[item_code].uom || "";

                                    let p = frappe.db.get_value("Item", item_code, ["item_name", "standard_rate"])
                                        .then(r => {
                                            if (r?.message) {
                                                item_row.item_name = r.message.item_name || "";
                                                item_row.rate = r.message.standard_rate || 0;
                                            }
                                            return frappe.db.get_value("Item Price", {
                                                price_list: "Standard Buying",
                                                item_code: item_code
                                            }, "price_list_rate");
                                        })
                                        .then(r => {
                                            if (r?.message?.price_list_rate) {
                                                item_row.rate = r.message.price_list_rate;
                                            }
                                            item_row.amount = (item_row.qty || 0) * (item_row.rate || 0);
                                        });
                                    promises.push(p);
                                }
                            });

                            Promise.all(promises).then(() => {
                                frm.refresh_field("items");
                                frappe.msgprint({
                                    title: "Success",
                                    message: `File "<b>${file.name}</b>" uploaded successfully.`,
                                    indicator: "green"
                                });
                            });

                        } catch (err) {
                            frappe.msgprint({
                                title: "Error",
                                message: "Could not read Excel file. Please check format.",
                                indicator: "red"
                            });
                            console.error(err);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                };
                input.click();
            });
        }, __("Get Items From"));
    },

    before_submit(frm) {
        if (uploaded_po_no && uploaded_po_no !== frm.doc.purchase_order_no) {
            frappe.throw(
                `Cannot submit! Uploaded PO No "<b>${uploaded_po_no}</b>" does not match Custom Purchase Order No "<b>${frm.doc.purchase_order_no}</b>".`
            );
        }
    },

    after_save(frm) {
        if (uploaded_file_data) {
            frappe.call({
                method: "frappe.client.insert",
                args: {
                    doc: {
                        doctype: "File",
                        file_name: uploaded_file_data.name,
                        is_private: 0,
                        content: uploaded_file_data.content,
                        attached_to_doctype: frm.doc.doctype,
                        attached_to_name: frm.doc.name
                    }
                },
                callback: function() {
                    uploaded_file_data = null;
                    frm.reload_doc();
                }
            });
        }
    }
});
