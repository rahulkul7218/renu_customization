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
//         if (!frm.is_new()) {
//             frm.add_custom_button("Upload Serials", () => {
//                 load_xlsx(() => {
//                     // ❌ Strict stop if system PO No not set
//                     if (!frm.doc.po_no) {
//                         frappe.msgprint({
//                             title: "Validation Failed",
//                             message: "Document PO No is missing. Cannot upload serials.",
//                             indicator: "red"
//                         });
//                         return;
//                     }

//                     let input = document.createElement("input");
//                     input.type = "file";
//                     input.accept = "*/*";

//                     input.onchange = (e) => {
//                         let file = e.target.files[0];
//                         let reader = new FileReader();

//                         reader.onload = function(e) {
//                             try {
//                                 let data = new Uint8Array(e.target.result);
//                                 let workbook = XLSX.read(data, { type: "array" });
//                                 let sheetName = workbook.SheetNames[0];
//                                 let sheet = workbook.Sheets[sheetName];

//                                 let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });
//                                 let current_item = null;
//                                 let serial_map = {};
//                                 let receipt_items = new Set(frm.doc.items.map(i => i.item_code));
//                                 let uploaded_items = new Set();

//                                 for (let idx = 1; idx < rows.length; idx++) {
//                                     let r = rows[idx];
//                                     let item_code = r[0] ? r[0].toString().trim() : "";
//                                     let serial_no = r[1] ? r[1].toString().trim() : "";
//                                     let po_no = r[2] ? r[2].toString().trim() : "";

//                                     if (item_code) {
//                                         current_item = item_code;
//                                         uploaded_items.add(item_code);

//                                         if (!receipt_items.has(item_code)) {
//                                             frappe.msgprint({
//                                                 title: "Validation Failed",
//                                                 message: `Row ${idx + 1}: Item <b>${item_code}</b> not found in Purchase Receipt`,
//                                                 indicator: "red"
//                                             });
//                                             return;
//                                         }
//                                     }

//                                     // ❌ Stop if PO No missing in sheet row
//                                     if (!po_no) {
//                                         frappe.msgprint({
//                                             title: "Validation Failed",
//                                             message: `Row ${idx + 1}: PO No missing in uploaded sheet.`,
//                                             indicator: "red"
//                                         });
//                                         return;
//                                     }

//                                     // ❌ Stop if PO mismatch
//                                     if (po_no !== frm.doc.po_no) {
//                                         frappe.msgprint({
//                                             title: "Validation Failed",
//                                             message: `Row ${idx + 1}: PO No is mismatch. Document PO No = <b>${frm.doc.po_no}</b>, Uploaded PO No = <b>${po_no}</b>`,
//                                             indicator: "red"
//                                         });
//                                         return;
//                                     }

//                                     if (current_item && serial_no) {
//                                         if (!serial_map[current_item]) {
//                                             serial_map[current_item] = [];
//                                         }
//                                         serial_map[current_item].push(serial_no);
//                                     }
//                                 }

//                                 // ❌ Stop if any PR item missing in upload
//                                 for (let item_code of receipt_items) {
//                                     if (!uploaded_items.has(item_code)) {
//                                         frappe.msgprint({
//                                             title: "Validation Failed",
//                                             message: `Item <b>${item_code}</b> from Purchase Receipt is missing in uploaded file`,
//                                             indicator: "red"
//                                         });
//                                         return;
//                                     }
//                                 }

//                                 // --- SERIAL QTY VALIDATION ---
//                                 for (let item of frm.doc.items) {
//                                     if (item.item_code && serial_map[item.item_code]) {
//                                         let qty = parseFloat(item.qty);
//                                         let count = serial_map[item.item_code].length;
//                                         if (qty !== count) {
//                                             frappe.msgprint({
//                                                 title: "Validation Failed",
//                                                 message: `${item.item_code} → Qty = ${qty}, Serials uploaded = ${count}`,
//                                                 indicator: "red"
//                                             });
//                                             return;
//                                         }
//                                     }
//                                 }

//                                 // --- ASSIGN SERIALS ---
//                                 Object.keys(serial_map).forEach(item_code => {
//                                     let serials = serial_map[item_code];
//                                     frm.doc.items.forEach(item => {
//                                         if (item.item_code === item_code) {
//                                             item.serial_no = serials.join("\n");
//                                         }
//                                     });
//                                 });

//                                 frm.refresh_field("items");
//                                 frappe.msgprint("Serials imported successfully!");
//                             } catch (err) {
//                                 frappe.msgprint({
//                                     title: "Error",
//                                     message: "Could not read Excel file. Please check format.",
//                                     indicator: "red"
//                                 });
//                                 console.error(err);
//                             }
//                         };

//                         reader.readAsArrayBuffer(file);
//                     };

//                     input.click();
//                 });
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

frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        if (!frm.is_new()) {
            frm.add_custom_button("Upload Serials", () => {
                load_xlsx(() => {
                    // ❌ Strict stop if system PO No not set
                    if (!frm.doc.po_no) {
                        frappe.msgprint({
                            title: "Validation Failed",
                            message: "Document PO No is missing. Cannot upload serials.",
                            indicator: "red"
                        });
                        return;
                    }

                    let input = document.createElement("input");
                    input.type = "file";
                    input.accept = "*/*";

                    input.onchange = (e) => {
                        let file = e.target.files[0];
                        let reader = new FileReader();

                        reader.onload = function(e) {
                            try {
                                let data = new Uint8Array(e.target.result);
                                let workbook = XLSX.read(data, { type: "array" });
                                let sheetName = workbook.SheetNames[0];
                                let sheet = workbook.Sheets[sheetName];

                                // ✅ Read sheet using headers
                                let rows = XLSX.utils.sheet_to_json(sheet, { defval: "" });

                                let current_item = null;
                                let serial_map = {};
                                let receipt_items = new Set(frm.doc.items.map(i => i.item_code));
                                let uploaded_items = new Set();

                                for (let idx = 0; idx < rows.length; idx++) {
                                    let r = rows[idx];
                                    let item_code = (r["Item Code"] || "").toString().trim();
                                    let serial_no = (r["Serial No"] || "").toString().trim();
                                    let po_no     = (r["PO NO"] || "").toString().trim();

                                    if (item_code) {
                                        current_item = item_code;
                                        uploaded_items.add(item_code);

                                        if (!receipt_items.has(item_code)) {
                                            frappe.msgprint({
                                                title: "Validation Failed",
                                                message: `Row ${idx + 2}: Item <b>${item_code}</b> not found in Purchase Receipt`,
                                                indicator: "red"
                                            });
                                            return;
                                        }
                                    }

                                    // ❌ Stop if PO No missing in sheet row
                                    if (!po_no) {
                                        frappe.msgprint({
                                            title: "Validation Failed",
                                            message: `Row ${idx + 2}: PO No missing in uploaded sheet.`,
                                            indicator: "red"
                                        });
                                        return;
                                    }

                                    // ❌ Stop if PO mismatch
                                    if (po_no !== frm.doc.po_no) {
                                        frappe.msgprint({
                                            title: "Validation Failed",
                                            message: `Row ${idx + 2}: PO No is mismatch. Document PO No = <b>${frm.doc.po_no}</b>, Uploaded PO No = <b>${po_no}</b>`,
                                            indicator: "red"
                                        });
                                        return;
                                    }

                                    if (current_item && serial_no) {
                                        if (!serial_map[current_item]) {
                                            serial_map[current_item] = [];
                                        }
                                        serial_map[current_item].push(serial_no);
                                    }
                                }

                                // ❌ Stop if any PR item missing in upload
                                for (let item_code of receipt_items) {
                                    if (!uploaded_items.has(item_code)) {
                                        frappe.msgprint({
                                            title: "Validation Failed",
                                            message: `Item <b>${item_code}</b> from Purchase Receipt is missing in uploaded file`,
                                            indicator: "red"
                                        });
                                        return;
                                    }
                                }

                                // --- SERIAL QTY VALIDATION ---
                                for (let item of frm.doc.items) {
                                    if (item.item_code && serial_map[item.item_code]) {
                                        let qty = parseFloat(item.qty);
                                        let count = serial_map[item.item_code].length;
                                        if (qty !== count) {
                                            frappe.msgprint({
                                                title: "Validation Failed",
                                                message: `${item.item_code} → Qty = ${qty}, Serials uploaded = ${count}`,
                                                indicator: "red"
                                            });
                                            return;
                                        }
                                    }
                                }

                                // --- ASSIGN SERIALS ---
                                Object.keys(serial_map).forEach(item_code => {
                                    let serials = serial_map[item_code];
                                    frm.doc.items.forEach(item => {
                                        if (item.item_code === item_code) {
                                            item.serial_no = serials.join("\n");
                                        }
                                    });
                                });

                                frm.refresh_field("items");
                                frappe.msgprint("✅ Serials imported successfully!");
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
            });
        }
    }
});
