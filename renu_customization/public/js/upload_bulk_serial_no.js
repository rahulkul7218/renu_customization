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
//         frm.add_custom_button("Upload Serials", () => {
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

//                             // ✅ Clear existing items
//                             frm.clear_table("items");

//                             let serial_map = {};

//                             for (let idx = 1; idx < rows.length; idx++) {
//                                 let r = rows[idx];

//                                 let item_code = r[0] ? r[0].toString().trim() : "";
//                                 let qty       = r[1] ? parseFloat(r[1]) : 0;   // Accepted Quantity
//                                 let serial_no = r[2] ? r[2].toString().trim() : "";
//                                 let uom       = r[3] ? r[3].toString().trim() : "";
//                                 let po_no     = r[4] ? r[4].toString().trim() : "";  // ✅ PO No column

//                                 if (!item_code) continue;

//                                 if (!serial_map[item_code]) {
//                                     serial_map[item_code] = {
//                                         qty: 0,
//                                         serials: [],
//                                         uom: uom
//                                     };
//                                 }

//                                 // ✅ Add qty directly from column
//                                 serial_map[item_code].qty += qty;

//                                 if (serial_no) {
//                                     serial_map[item_code].serials.push(serial_no);
//                                 }

//                                 // Keep latest UOM if available
//                                 if (uom) serial_map[item_code].uom = uom;

//                                 // ✅ Set PO No at header level (first non-empty value)
//                                 if (po_no && !frm.doc.po_no) {
//                                     frm.set_value("po_no", po_no);
//                                 }
//                             }

//                             // ✅ Add items into child table
//                             Object.keys(serial_map).forEach(item_code => {
//                                 let item_row = frm.add_child("items");
//                                 item_row.item_code = item_code;
//                                 item_row.qty = serial_map[item_code].qty; 
//                                 item_row.serial_no = serial_map[item_code].serials.join("\n");
//                                 item_row.uom = serial_map[item_code].uom || "";
//                             });

//                             frm.refresh_field("items");
//                             frappe.msgprint("Items, serials, UOM, and PO No imported successfully!");
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

frappe.ui.form.on("Purchase Receipt", {
    refresh(frm) {
        frm.add_custom_button("Upload Serials", () => {
            load_xlsx(() => {
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

                            let rows = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                            // ✅ Clear existing items
                            frm.clear_table("items");

                            let serial_map = {};
                            let excel_po_no = "";

                            for (let idx = 1; idx < rows.length; idx++) {
                                let r = rows[idx];

                                let item_code = r[0] ? r[0].toString().trim() : "";
                                let qty       = r[1] ? parseFloat(r[1]) : 0;
                                let serial_no = r[2] ? r[2].toString().trim() : "";
                                let uom       = r[3] ? r[3].toString().trim() : "";
                                let po_no     = r[4] ? r[4].toString().trim() : "";  // ✅ PO No column

                                if (!item_code) continue;

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

                                if (po_no && !excel_po_no) {
                                    excel_po_no = po_no;
                                }
                            }

                            // ✅ Now validate PO No before adding items
                            if (excel_po_no) {
                                frappe.db.exists("Purchase Order", excel_po_no).then(exists => {
                                    if (!exists) {
                                        frappe.msgprint({
                                            title: "Invalid PO No",
                                            message: `The PO No <b>${excel_po_no}</b> does not exist in the system.`,
                                            indicator: "red"
                                        });
                                        return;
                                    }

                                    // ✅ Set PO No at header level
                                    frm.set_value("po_no", excel_po_no);

                                    // ✅ Add items into child table
                                    Object.keys(serial_map).forEach(item_code => {
                                        let item_row = frm.add_child("items");
                                        item_row.item_code = item_code;
                                        item_row.qty = serial_map[item_code].qty;
                                        item_row.serial_no = serial_map[item_code].serials.join("\n");
                                        item_row.uom = serial_map[item_code].uom || "";
                                    });

                                    frm.refresh_field("items");
                                    frappe.msgprint("Items, serials, UOM, and PO No imported successfully!");
                                });
                            } else {
                                frappe.msgprint({
                                    title: "Missing PO No",
                                    message: "No PO No found in the Excel sheet.",
                                    indicator: "red"
                                });
                            }

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
