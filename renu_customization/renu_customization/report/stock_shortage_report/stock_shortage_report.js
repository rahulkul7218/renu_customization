// frappe.query_reports["Stock Shortage Report"] = {
//     formatter: function (value, row, column, data, default_formatter) {
 
//         value = default_formatter(value, row, column, data);
 
//         if (column.fieldname === "action" && data) {
 
//             // Create dataset spans
//             value = `<span style="color:#007bff; background-color: #87CEFA;     /* Light Sky Blue */
//                 border: 1px solid #1E90FF;     /* Border */
//                 padding: 3px 8px;
//                 border-radius: 4px;
//                 font-size: 11px;
//                 color: black;
// "
//                 data-item="${data.item}"
//                 data-warehouse="${data.warehouse}"
//                 data-projected="${data.projected_quantity}">
//                 Create Request
//             </span>`;
 
//             setTimeout(() => {
//                 $("span[data-item='" + data.item + "'][data-warehouse='" + data.warehouse + "']")
//                   .off("click")
//                   .on("click", function () {
 
//                     let item = $(this).attr("data-item");   // ✅ now correct
//                     let warehouse = $(this).attr("data-warehouse");
//                     let projected_qty = parseFloat($(this).attr("data-projected")) || 0;
 
//                     let qty = Math.abs(projected_qty);
 
//                     frappe.prompt(
//                         [
//                             {
//                                 fieldname: "select_type",
//                                 label: "Select Request Type",
//                                 fieldtype: "Select",
//                                 options: "\nMaterial Request\nPurchase Order",
//                                 reqd: 1
//                             },
//                             {
//                                 fieldname: "qty",
//                                 label: "Quantity",
//                                 fieldtype: "Float",
//                                 default: qty,
//                                 read_only:1,
//                                 reqd: 1
//                             }
//                         ],
//                         function (values) {
 
//                             if (values.select_type === "Material Request") {
//                                 frappe.new_doc('Material Request', {
//                                     material_request_type: 'Purchase',
//                                     schedule_date: frappe.datetime.nowdate(),
//                                     items: [
//                                         {
//                                             item_code: item,
//                                             qty: values.qty,
//                                             warehouse: warehouse
//                                         }
//                                     ]
//                                 });
//                             }
 
//                             if (values.select_type === "Purchase Order") {
//                                 frappe.new_doc('Purchase Order', {
//                                     schedule_date: frappe.datetime.nowdate(),
//                                     items: [
//                                         {
//                                             item_code: item,
//                                             qty: values.qty,
//                                             warehouse: warehouse
//                                         }
//                                     ]
//                                 });
//                             }
 
//                         },
//                         "Create Request",
//                         "Proceed"
//                     );
 
//                 });
//             });
//         }
 
//         return value;
//     }
// };



// frappe.query_reports["Stock Shortage Report"] = {
//     formatter: function (value, row, column, data, default_formatter) {

//         value = default_formatter(value, row, column, data);

//         if (column.fieldname === "action" && data) {

//             value = `
//                 <span class="create-request-btn"
//                     data-item="${data.item}"
//                     data-warehouse="${data.warehouse}"
//                     data-projected="${data.projected_quantity}"
//                     style="
//                         cursor: pointer;
//                         padding: 4px 8px;
//                         background: #87CEFA;
//                         border: 1px solid #1E90FF;
//                         border-radius: 4px;
//                         font-size: 11px;
//                         color: black;
//                     ">
//                     Create Request
//                 </span>
//             `;

//             setTimeout(() => {
//                 $(".create-request-btn").off("click").on("click", function () {
//                     let item = $(this).data("item");
//                     let warehouse = $(this).data("warehouse");
//                     let projected_qty = parseFloat($(this).data("projected")) || 0;
//                     let qty = Math.abs(projected_qty);

//                     frappe.prompt(
//                         [
//                             {
//                                 fieldname: "select_type",
//                                 label: "Select Request Type",
//                                 fieldtype: "Select",
//                                 options: "\nMaterial Request\nPurchase Order",
//                                 reqd: 1
//                             },
//                             {
//                                 fieldname: "qty",
//                                 label: "Quantity",
//                                 fieldtype: "Float",
//                                 default: qty,
//                                 read_only: 1,
//                                 reqd: 1
//                             }
//                         ],
//                         function (values) {
//                             if (values.select_type === "Material Request") {
//                                 create_doc("Material Request", item, warehouse, values.qty);
//                             }
//                             if (values.select_type === "Purchase Order") {
//                                 create_doc("Purchase Order", item, warehouse, values.qty);
//                             }
//                         },
//                         "Create Request",
//                         "Proceed"
//                     );

//                 });
//             });
//         }

//         return value;
//     }
// };


// // ------------------------------------
// // ✅ Function to create document SAFELY
// // ------------------------------------
// function create_doc(doctype, item, warehouse, qty) {
//     frappe.new_doc(doctype);

//     frappe.ui.form.on(doctype, {
//         onload: function (frm) {

//             let child = frm.add_child("items");
//             child.item_code = item;
//             child.qty = qty;
//             child.warehouse = warehouse;

//             frm.refresh_field("items");
//         }
//     });
// }






// frappe.query_reports["Stock Shortage Report"] = {
//     formatter: function (value, row, column, data, default_formatter) {

//         value = default_formatter(value, row, column, data);

//         if (column.fieldname === "action" && data) {

//             value = `
//                 <span class="create-request-btn"
//                     data-item="${data.item}"
//                     data-warehouse="${data.warehouse}"
//                     data-projected="${data.projected_quantity}"
//                     style="
//                         cursor: pointer;
//                         padding: 4px 8px;
//                         background: #87CEFA;
//                         border: 1px solid #1E90FF;
//                         border-radius: 4px;
//                         font-size: 11px;
//                         color: black;
//                     ">
//                     Create Request
//                 </span>
//             `;

//             setTimeout(() => {
//                 $(".create-request-btn").off("click").on("click", function () {

//                     let item = $(this).data("item");
//                     let warehouse = $(this).data("warehouse");
//                     let projected_qty = parseFloat($(this).data("projected")) || 0;
//                     let qty = Math.abs(projected_qty);

//                     frappe.prompt(
//                         [
//                             {
//                                 fieldname: "select_type",
//                                 label: "Select Request Type",
//                                 fieldtype: "Select",
//                                 options: "\nMaterial Request\nPurchase Order",
//                                 reqd: 1
//                             },
//                             {
//                                 fieldname: "qty",
//                                 label: "Quantity",
//                                 fieldtype: "Float",
//                                 default: qty,
//                                 read_only: 1,
//                                 reqd: 1
//                             }
//                         ],
//                         function (values) {
//                             if (values.select_type === "Material Request") {
//                                 create_doc("Material Request", item, warehouse, values.qty);
//                             }

//                             if (values.select_type === "Purchase Order") {
//                                 create_doc("Purchase Order", item, warehouse, values.qty);
//                             }
//                         },
//                         "Create Request",
//                         "Proceed"
//                     );

//                 });
//             });
//         }

//         return value;
//     }
// };


// // ------------------------------------------------------------
// // ✅ Function to create document + clear empty row + fetch UOM
// // ------------------------------------------------------------
// function create_doc(doctype, item, warehouse, qty) {

//     frappe.new_doc(doctype);

//     frappe.ui.form.on(doctype, {

//         onload: function (frm) {

//             // 🚫 Remove default empty first row
//             frm.clear_table("items");

//             // ➕ Add new row with item + qty + warehouse
//             let row = frm.add_child("items");
//             row.item_code = item;
//             row.qty = qty;
//             row.warehouse = warehouse;

//             // ✅ Fetch UOM from Item Master and set
//             frappe.call({
//                 method: "frappe.client.get_value",
//                 args: {
//                     doctype: "Item",
//                     filters: { name: item },
//                     fieldname: "stock_uom",
//                 },
//                 callback: function (r) {
//                     if (r.message) {
//                         row.uom = r.message.stock_uom;
//                     }
//                     frm.refresh_field("items");
//                 }
//             });

//             frm.refresh_field("items");
//         }

//     });
// }



frappe.query_reports["Stock Shortage Report"] = {
    formatter: function (value, row, column, data, default_formatter) {

        value = default_formatter(value, row, column, data);

        if (column.fieldname === "action" && data) {

            value = `
                <span class="create-request-btn"
                    data-item="${data.item}"
                    data-warehouse="${data.warehouse}"
                    data-projected="${data.projected_quantity}"
                    style="
                        cursor: pointer;
                        padding: 4px 8px;
                        background: #8CE4FF;
                        border: 1px solid #8CE4FF;
                        border-radius: 4px;
                        font-size: 11px;
                        color: black;
                    ">
                    Create Request
                </span>
            `;

            setTimeout(() => {
                $(".create-request-btn").off("click").on("click", function () {

                    let item = $(this).data("item");
                    let warehouse = $(this).data("warehouse");
                    let projected_qty = parseFloat($(this).data("projected")) || 0;
                    let qty = Math.abs(projected_qty);

                    frappe.prompt(
                        [
                            {
                                fieldname: "select_type",
                                label: "Select Request Type",
                                fieldtype: "Select",
                                options: "\nMaterial Request\nPurchase Order",
                                reqd: 1
                            },
                            {
                                fieldname: "qty",
                                label: "Quantity",
                                fieldtype: "Float",
                                default: qty,
                                read_only: 0,
                                reqd: 1
                            }
                        ],
                        function (values) {
                            if (values.select_type === "Material Request") {
                                create_doc("Material Request", item, warehouse, values.qty);
                            }

                            if (values.select_type === "Purchase Order") {
                                create_doc("Purchase Order", item, warehouse, values.qty);
                            }
                        },
                        "Create Request",
                        "Proceed"
                    );

                });
            });
        }

        return value;
    }
};


// ------------------------------------------------------------
// ✅ function to create Material Request/Purchase Order
//    Ensures: No duplicate item, UOM auto fetched,
//    No “Not Saved” issue after Submit
// ------------------------------------------------------------
function create_doc(doctype, item, warehouse, qty) {

    frappe.new_doc(doctype);

    frappe.ui.form.on(doctype, {
        refresh: function (frm) {

            // ✅ Add only once - ensures Submit does not trigger "Not Saved"
            if (frm.is_new() && !frm.is_item_added) {

                frm.clear_table("items");    // remove default empty row

                let row = frm.add_child("items");
                row.item_code = item;
                row.qty = qty;
                row.warehouse = warehouse;

                // ✅ Fetch UOM from Item Master
                frappe.call({
                    method: "frappe.client.get_value",
                    args: {
                        doctype: "Item",
                        filters: { name: item },
                        fieldname: "stock_uom",
                    },
                    callback: function (r) {
                        if (r.message) {
                            row.uom = r.message.stock_uom;
                        }
                        frm.refresh_field("items");
                    }
                });

                frm.is_item_added = true; // flag to stop re-running
            }
        }
    });
}
