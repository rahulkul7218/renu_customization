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

// frappe.ui.form.on("Purchase Receipt", {
//     refresh(frm) {
//         frm.add_custom_button("Upload Serial No", () => {
//             load_xlsx(() => {
//                 let input = document.createElement("input");
//                 input.type = "file";
//                 input.accept = "*/*";

//                 input.onchange = (e) => {
//                     let file = e.target.files[0];
//                     let reader = new FileReader();

//                     reader.onload = function(e) {
//                         try {
//                             let data = new Uint8Array(e.target.result);
//                             let workbook = XLSX.read(data, { type: "array" });
//                             let sheetName = workbook.SheetNames[0];
//                             let sheet = workbook.Sheets[sheetName];

//                             let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//                             // Clear existing items
//                             frm.clear_table("items");

//                             let serial_map = {};

//                             for (let idx = 1; idx < rows.length; idx++) {
//                                 let r = rows[idx];

//                                 let item_code = r[0] ? r[0].toString().trim() : "";
//                                 let qty       = r[1] ? parseFloat(r[1]) : 0;   
//                                 let serial_no = r[2] ? r[2].toString().trim() : "";
//                                 let uom       = r[3] ? r[3].toString().trim() : "";
//                                 let po_no     = r[4] ? r[4].toString().trim() : "";

//                                 if (!item_code) continue;

//                                 if (!serial_map[item_code]) {
//                                     serial_map[item_code] = {
//                                         qty: 0,
//                                         serials: [],
//                                         uom: uom
//                                     };
//                                 }

//                                 serial_map[item_code].qty += qty;

//                                 if (serial_no) {
//                                     serial_map[item_code].serials.push(serial_no);
//                                 }

//                                 if (uom) serial_map[item_code].uom = uom;

//                                 // Set PO No at header level (first non-empty value)
//                                 if (po_no && !frm.doc.po_no) {
//                                     frm.set_value("po_no", po_no);
//                                 }
//                             }

//                             // Add items into child table and fetch name + rate
//                             let promises = [];
//                             Object.keys(serial_map).forEach(item_code => {
//                                 let item_row = frm.add_child("items");
//                                 item_row.item_code = item_code;
//                                 item_row.qty = serial_map[item_code].qty; 
//                                 item_row.serial_no = serial_map[item_code].serials.join("\n");
//                                 item_row.uom = serial_map[item_code].uom || "";

//                                 // Step 1: Get item_name from Item
//                                 let p = frappe.db.get_value("Item", item_code, ["item_name", "standard_rate"])
//                                     .then(r => {
//                                         if (r && r.message) {
//                                             item_row.item_name = r.message.item_name || "";
//                                             item_row.rate = r.message.standard_rate || 0; // fallback
//                                         }

//                                         // Step 2: Try fetching rate from Item Price (Standard Buying)
//                                         return frappe.db.get_value("Item Price", {
//                                             price_list: "Standard Buying",
//                                             item_code: item_code
//                                         }, "price_list_rate");
//                                     })
//                                     .then(r => {
//                                         if (r && r.message && r.message.price_list_rate) {
//                                             item_row.rate = r.message.price_list_rate;
//                                         }
//                                         // Calculate amount
//                                         item_row.amount = (item_row.qty || 0) * (item_row.rate || 0);
//                                     });

//                                 promises.push(p);
//                             });

//                             // Wait for all fetches to complete
//                             Promise.all(promises).then(() => {
//                                 frm.refresh_field("items");
//                                 frappe.msgprint("Items, serials, UOM, PO No, Item Name, and Rates (from Standard Buying) imported successfully!");
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
//     }
// });

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

// frappe.ui.form.on("Purchase Receipt", {
//     refresh(frm) {
//         frm.add_custom_button("Upload Serial No", () => {
//             load_xlsx(() => {
//                 let input = document.createElement("input");
//                 input.type = "file";
//                 input.accept = "*/*";

//                 input.onchange = (e) => {
//                     let file = e.target.files[0];
//                     if (!file) return;
//                     if (frm.doc.items && frm.doc.items.length === 1 && !frm.doc.items[0].item_code) {
//                         frm.clear_table("items");
//                     }

//                     let reader = new FileReader();

//                     reader.onload = function(e) {
//                         try {
//                             let data = new Uint8Array(e.target.result);
//                             let workbook = XLSX.read(data, { type: "array" });

//                             // Determine if items table is empty
//                             let table_empty = frm.doc.items.length === 0;

//                             if (table_empty) {
//                                 frm.clear_table("items");
//                             }

//                             let serial_map = {};
//                             let seen_serials = {};   // store serial numbers with row indexes
//                             let duplicate_rows = []; // track duplicates

//                             workbook.SheetNames.forEach(sheetName => {
//                                 let sheet = workbook.Sheets[sheetName];
//                                 let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

//                                 let start_idx = 1; // skip header row
//                                 for (let idx = start_idx; idx < rows.length; idx++) {
//                                     let r = rows[idx];

//                                     let item_code = r[0] ? r[0].toString().trim() : "";
//                                     let qty       = r[1] ? parseFloat(r[1]) : 0;   
//                                     let serial_no = r[2] ? r[2].toString().trim() : "";
//                                     let uom       = r[3] ? r[3].toString().trim() : "";
//                                     let po_no     = r[4] ? r[4].toString().trim() : "";

//                                     if (!item_code) continue;

//                                     // --- Duplicate Serial No Check ---
//                                     if (serial_no) {
//                                         if (seen_serials[serial_no]) {
//                                             duplicate_rows.push(idx + 1); // +1 to match Excel row number
//                                         } else {
//                                             seen_serials[serial_no] = idx + 1;
//                                         }
//                                     }

//                                     if (!serial_map[item_code]) {
//                                         serial_map[item_code] = {
//                                             qty: 0,
//                                             serials: [],
//                                             uom: uom
//                                         };
//                                     }

//                                     serial_map[item_code].qty += qty;
//                                     if (serial_no) serial_map[item_code].serials.push(serial_no);
//                                     if (uom) serial_map[item_code].uom = uom;
//                                     if (po_no && !frm.doc.po_no) {
//                                         frm.set_value("po_no", po_no);
//                                     }
//                                 }
//                             });

//                             // --- If duplicate serial numbers found, stop execution ---
//                             if (duplicate_rows.length > 0) {
//                                 frappe.msgprint(
//                                     `Duplicate Serial No found at Excel row(s): <b>${duplicate_rows.join(", ")}</b>`
//                                 );
//                                 return;
//                             }

//                             let promises = [];
//                             Object.keys(serial_map).forEach(item_code => {
//                                 let existing_row = frm.doc.items.find(d => d.item_code === item_code);

//                                 if (existing_row) {
//                                     existing_row.qty += serial_map[item_code].qty;
//                                     existing_row.serial_no += serial_map[item_code].serials.length
//                                         ? ("\n" + serial_map[item_code].serials.join("\n"))
//                                         : "";
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
//                                     item_row.item_code = item_code;
//                                     item_row.qty = serial_map[item_code].qty; 
//                                     item_row.serial_no = serial_map[item_code].serials.join("\n");
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

//                                 // --- Upload file in File doctype ---
//                                 let file_reader = new FileReader();
//                                 file_reader.onload = function(file_event) {
//                                     let file_data = file_event.target.result;
//                                     frappe.call({
//                                         method: "frappe.client.insert",
//                                         args: {
//                                             doc: {
//                                                 doctype: "File",
//                                                 file_name: file.name,
//                                                 attached_to_doctype: frm.doctype,
//                                                 attached_to_name: frm.docname,
//                                                 content: file_data,
//                                                 is_private: 0
//                                             }
//                                         },
//                                         callback: function(r) {
//                                             if (r.message) {
//                                                 frappe.msgprint(`File uploaded successfully!`);
//                                             }
//                                         }
//                                     });
//                                 };
//                                 file_reader.readAsDataURL(file);
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

// --- Global storage for serial numbers across uploads ---
let global_seen_serials = {};

frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        frm.add_custom_button("Upload Serial No", () => {
            load_xlsx(() => {
                let input = document.createElement("input");
                input.type = "file";
                input.accept = "*/*";

                input.onchange = (e) => {
                    let file = e.target.files[0];
                    if (!file) return;
                    if (frm.doc.items && frm.doc.items.length === 1 && !frm.doc.items[0].item_code) {
                        frm.clear_table("items");
                    }

                    let reader = new FileReader();

                    reader.onload = function(e) {
                        try {
                            let data = new Uint8Array(e.target.result);
                            let workbook = XLSX.read(data, { type: "array" });

                            let serial_map = {};
                            let duplicate_rows = [];

                            workbook.SheetNames.forEach(sheetName => {
                                let sheet = workbook.Sheets[sheetName];
                                let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                                let start_idx = 1; // skip header row
                                for (let idx = start_idx; idx < rows.length; idx++) {
                                    let r = rows[idx];

                                    let item_code = r[0] ? r[0].toString().trim() : "";
                                    let qty       = r[1] ? parseFloat(r[1]) : 0;   
                                    let serial_no = r[2] ? r[2].toString().trim() : "";
                                    let uom       = r[3] ? r[3].toString().trim() : "";
                                    let po_no     = r[4] ? r[4].toString().trim() : "";

                                    if (!item_code) continue;

                                    // --- Duplicate Serial Check across uploads ---
                                    if (serial_no) {
                                        if (global_seen_serials[serial_no]) {
                                            duplicate_rows.push(idx + 1); // Excel row no
                                        } else {
                                            global_seen_serials[serial_no] = true;
                                        }
                                    }

                                    if (!serial_map[item_code]) {
                                        serial_map[item_code] = {
                                            qty: 0,
                                            serials: [],
                                            uom: uom
                                        };
                                    }

                                    serial_map[item_code].qty += qty;
                                    if (serial_no) serial_map[item_code].serials.push(serial_no);
                                    if (uom) serial_map[item_code].uom = uom;
                                    if (po_no && !frm.doc.po_no) {
                                        frm.set_value("po_no", po_no);
                                    }
                                }
                            });

                            // --- Stop if duplicates found ---
                            if (duplicate_rows.length > 0) {
                                frappe.msgprint(
                                    `Duplicate Serial No found in file "<b>${file.name}</b>" at Excel row(s): <b>${duplicate_rows.map(r => "Row No " + r).join(", ")}</b>`
                                );
                                return;
                            }

                            let promises = [];
                            Object.keys(serial_map).forEach(item_code => {
                                let existing_row = frm.doc.items.find(d => d.item_code === item_code);

                                if (existing_row) {
                                    existing_row.qty += serial_map[item_code].qty;
                                    existing_row.serial_no += serial_map[item_code].serials.length
                                        ? ("\n" + serial_map[item_code].serials.join("\n"))
                                        : "";
                                    if (serial_map[item_code].uom) existing_row.uom = serial_map[item_code].uom;

                                    let p = frappe.db.get_value("Item Price", {
                                        price_list: "Standard Buying",
                                        item_code: item_code
                                    }, "price_list_rate").then(r => {
                                        if (r && r.message && r.message.price_list_rate) {
                                            existing_row.rate = r.message.price_list_rate;
                                        }
                                        existing_row.amount = (existing_row.qty || 0) * (existing_row.rate || 0);
                                    });

                                    promises.push(p);
                                } else {
                                    let item_row = frm.add_child("items");
                                    item_row.item_code = item_code;
                                    item_row.qty = serial_map[item_code].qty; 
                                    item_row.serial_no = serial_map[item_code].serials.join("\n");
                                    item_row.uom = serial_map[item_code].uom || "";

                                    let p = frappe.db.get_value("Item", item_code, ["item_name", "standard_rate"])
                                        .then(r => {
                                            if (r && r.message) {
                                                item_row.item_name = r.message.item_name || "";
                                                item_row.rate = r.message.standard_rate || 0;
                                            }
                                            return frappe.db.get_value("Item Price", {
                                                price_list: "Standard Buying",
                                                item_code: item_code
                                            }, "price_list_rate");
                                        })
                                        .then(r => {
                                            if (r && r.message && r.message.price_list_rate) {
                                                item_row.rate = r.message.price_list_rate;
                                            }
                                            item_row.amount = (item_row.qty || 0) * (item_row.rate || 0);
                                        });

                                    promises.push(p);
                                }
                            });

                            Promise.all(promises).then(() => {
                                frm.refresh_field("items");
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
    }
});
