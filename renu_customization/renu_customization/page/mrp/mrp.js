// frappe.pages['mrp'].on_page_load = function(wrapper) {
//     var page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'MRP Trading 📋',
//         single_column: true
//     });
//     page.set_primary_action("Purchase Order", function () {
//         frappe.set_route("List", "Purchase Order");
//         // 👉 If you want to directly open NEW PO instead,
//         // uncomment below line and remove List route
//         // frappe.new_doc("Purchase Order");
//     });
//     setTimeout(() => {
//         $(wrapper).find('.btn-primary')
//             .css({
//                 "background-color": "#FFE08F",   // light orange
//                 "border-color": "#ece7e1ee",
//                 "color": "#000",
//                 "font-weight": "600",
//                 "padding": "10px 20px",         // bigger size
//                 "font-size": "14px",
//                 "border-radius": "8px"
//             })
//             .hover(
//                 function () { $(this).css("background-color", "#ffa733"); }, // hover
//                 function () { $(this).css("background-color", "#ffb84d"); }
//             );
//     }, 300);

//     $(wrapper).find('.layout-main-section')
//         .append(`<div id="mrp-table" style="margin-top:20px"></div>`);

//     load_mrp_table();
// };


// // ===============================
// // 🚀 LOAD MRP TABLE
// // ===============================
// function load_mrp_table() {
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_mrp_data",
//         callback: function(r) {
//             if (!r.message) {
//                 $("#mrp-table").html("<p>No Data Found</p>");
//                 return;
//             }

//             let data = r.message;

//             let html = `
//                 <table class="table table-bordered" style="width:100%; text-align:center;">
//                     <thead>
//                         <tr>
                            

//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Demand</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Supply</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Requirement</th>
//                         </tr>

//                         <tr>
// 							<th style="border:1px solid #000; background:#FBEFEF;">Item</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open SO Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Safety Stock</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">On Hand Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Available Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">PO Qty</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">Gross Requirement</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">MOQ</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;" >Planned to Purchase Qty</th>
//                         </tr>
//                     </thead>

//                     <tbody>
//             `;

//             data.forEach(row => {
//                 html += `
//                     <tr>
//                         <td style="border:1px solid #000;">${row.item}</td>

//                         <td style="border:1px solid #000;">${row.open_sales_order}</td>
//                         <td style="border:1px solid #000;">${row.safety_stock}</td>

//                         <td style="border:1px solid #000;">${row.on_hand_qty}</td>
//                         <td style="border:1px solid #000;">${row.available_qty}</td>
//                         <td style="border:1px solid #000;">${row.po_qty}</td>

//                         <td style="border:1px solid #000;">${row.gross_requirement}</td>
//                         <td style="border:1px solid #000;">${row.moq}</td>
//                         <td style="border:1px solid #000;">${row.planned_purchase_qty}</td>
//                     </tr>
//                 `;
//             });

//             html += `
//                     </tbody>
//                 </table>
//             `;

//             $("#mrp-table").html(html);
//         }
//     });
// }

// below code is working
// frappe.pages['mrp'].on_page_load = function(wrapper) {
//     var page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'MRP 📋',
//         single_column: true
//     });

//     page.set_primary_action("Purchase Order", function () {
//         frappe.set_route("List", "Purchase Order");
//         // frappe.new_doc("Purchase Order");
//     });

//     setTimeout(() => {
//         $(wrapper).find('.btn-primary')
//             .css({
//                 "background-color": "#FFE08F",
//                 "border-color": "#ece7e1ee",
//                 "color": "#000",
//                 "font-weight": "600",
//                 "padding": "10px 20px",
//                 "font-size": "14px",
//                 "border-radius": "8px"
//             })
//             .hover(
//                 function () { $(this).css("background-color", "#ffa733"); },
//                 function () { $(this).css("background-color", "#ffb84d"); }
//             );
//     }, 300);

//     $(wrapper).find('.layout-main-section')
//         .append(`<div id="mrp-table" style="margin-top:20px"></div>`);

//     load_mrp_table();
// };


// // ===============================
// // 🚀 LOAD MRP TABLE
// // ===============================
// function load_mrp_table() {
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_mrp_data",
//         callback: function(r) {
//             if (!r.message) {
//                 $("#mrp-table").html("<p>No Data Found</p>");
//                 return;
//             }

//             let data = r.message;

//             let html = `
//                 <table class="table table-bordered" style="width:100%; text-align:center;">
//                     <thead>
//                         <tr>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Demand</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Supply</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Requirement</th>
//                             <th rowspan="2" style="border:1px solid #000; background:#d9d9d9;">Select</th>
//                         </tr>

//                         <tr>
// 							<th style="border:1px solid #000; background:#FBEFEF;">Item</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open SO Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Safety Stock</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">On Hand Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Available Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open PO Qty</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">Gross Requirement</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">MOQ</th>
//                             <th style="border:1px solid #000; background:#8BAE66; ">Planned to Purchase Qty</th>
//                         </tr>
//                     </thead>

//                     <tbody>
//             `;

//             data.forEach(row => {
//                 html += `
//                     <tr>
//                         <td style="border:1px solid #000;">${row.item}</td>

//                         <td style="border:1px solid #000;">${row.open_sales_order}</td>
//                         <td style="border:1px solid #000;">${row.safety_stock}</td>

//                         <td style="border:1px solid #000;">${row.on_hand_qty}</td>
//                         <td style="border:1px solid #000;">${row.available_qty}</td>
//                         <td style="border:1px solid #000;">${row.po_qty}</td>

//                         <td style="border:1px solid #000;">${row.gross_requirement}</td>
//                         <td style="border:1px solid #000;">${row.moq}</td>
//                         <td style="border:1px solid #000; color: #08CB00;">${row.planned_purchase_qty}</td>

//                         <td style="border:1px solid #000;">
//                             <input type="checkbox" class="form-check-input mrp-select" data-item="${row.item}">
//                         </td>
//                     </tr>
//                 `;
//             });

//             html += `
//                     </tbody>
//                 </table>
//             `;

//             $("#mrp-table").html(html);
//         }
//     });
// }

// New logic for dialog box show sales orders

// frappe.pages['mrp'].on_page_load = function(wrapper) {
//     var page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'MRP 📋',
//         single_column: true
//     });

//     page.set_primary_action("Purchase Order", function () {
//         frappe.set_route("List", "Purchase Order");
//         // frappe.new_doc("Purchase Order");
//     });

//     // Style primary button
//     setTimeout(() => {
//         $(wrapper).find('.btn-primary')
//             .css({
//                 "background-color": "#FFE08F",
//                 "border-color": "#ece7e1ee",
//                 "color": "#000",
//                 "font-weight": "600",
//                 "padding": "10px 20px",
//                 "font-size": "14px",
//                 "border-radius": "8px"
//             })
//             .hover(
//                 function () { $(this).css("background-color", "#ffa733"); },
//                 function () { $(this).css("background-color", "#ffb84d"); }
//             );
//     }, 300);

//     $(wrapper).find('.layout-main-section')
//         .append(`<div id="mrp-table" style="margin-top:20px"></div>`);

//     load_mrp_table();
// };

// // ===============================
// // 🚀 LOAD MRP TABLE
// // ===============================
// function load_mrp_table() {
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_mrp_data",
//         callback: function(r) {
//             if (!r.message) {
//                 $("#mrp-table").html("<p>No Data Found</p>");
//                 return;
//             }

//             let data = r.message;

//             let html = `
//                 <table class="table table-bordered" style="width:100%; text-align:center;">
//                     <thead>
//                         <tr>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Demand</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Supply</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Requirement</th>
//                             <th rowspan="2" style="border:1px solid #000; background:#d9d9d9;">Select</th>
//                         </tr>

//                         <tr>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Item</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open SO Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Safety Stock</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">On Hand Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Available Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open PO Qty</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">Gross Requirement</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">MOQ</th>
//                             <th style="border:1px solid #000; background:#8BAE66; ">Planned to Purchase Qty</th>
//                         </tr>
//                     </thead>

//                     <tbody>
//             `;

//             data.forEach(row => {
//                 html += `
//                     <tr>
//                         <td style="border:1px solid #000;">${row.item}</td>

//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);" class="open-so-link" data-item="${row.item}" style="color:#007bff; text-decoration:underline;">
//                                 ${row.open_sales_order}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">${row.safety_stock}</td>
//                         <td style="border:1px solid #000;">${row.on_hand_qty}</td>
//                         <td style="border:1px solid #000;">${row.available_qty}</td>

//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);" class="open-po-link" data-item="${row.item}" style="color:#007bff; text-decoration:underline;">
//                                 ${row.po_qty}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">${row.gross_requirement}</td>
//                         <td style="border:1px solid #000;">${row.moq}</td>
//                         <td style="border:1px solid #000; color: #08CB00;">${row.planned_purchase_qty}</td>

//                         <td style="border:1px solid #000;">
//                             <input type="checkbox" class="form-check-input mrp-select" data-item="${row.item}">
//                         </td>
//                     </tr>
//                 `;
//             });

//             html += `</tbody></table>`;
//             $("#mrp-table").html(html);
//         }
//     });
// }

// // ===============================
// // Click Handler for Open SO Qty
// // ===============================
// $(document).on('click', '.open-so-link', function() {
//     const item = $(this).data('item');

//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_sales_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
//             if(r.message && r.message.length > 0) {
//                 let content = `<ul>`;
//                 r.message.forEach(so => {
//                     content += `<li>${so.sales_order} : ${so.qty}</li>`;
//                 });
//                 content += `</ul>`;

//                 let d = new frappe.ui.Dialog({
//                     title: `Open Sales Orders for ${item}`,
//                     fields: [
//                         { fieldtype: 'HTML', fieldname: 'so_list', options: content }
//                     ]
//                 });
//                 d.show();
//             } else {
//                 frappe.msgprint("No open Sales Orders found for this item.");
//             }
//         }
//     });
// });

// // ===============================
// // Click Handler for Open PO Qty
// // ===============================
// $(document).on('click', '.open-po-link', function() {
//     const item = $(this).data('item');

//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_purchase_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
//             if(r.message && r.message.length > 0) {
//                 let content = `<ul>`;
//                 r.message.forEach(po => {
//                     content += `<li>${po.purchase_order} : ${po.qty}</li>`;
//                 });
//                 content += `</ul>`;

//                 let d = new frappe.ui.Dialog({
//                     title: `Open Purchase Orders for ${item}`,
//                     fields: [
//                         { fieldtype: 'HTML', fieldname: 'po_list', options: content }
//                     ]
//                 });
//                 d.show();
//             } else {
//                 frappe.msgprint("No open Purchase Orders found for this item.");
//             }
//         }
//     });
// });


// frappe.pages['mrp'].on_page_load = function(wrapper) {
//     var page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'MRP 📋',
//         single_column: true
//     });

//     page.set_primary_action("Purchase Order", function () {
//         frappe.set_route("List", "Purchase Order");
//         // frappe.new_doc("Purchase Order");
//     });

//     setTimeout(() => {
//         $(wrapper).find('.btn-primary')
//             .css({
//                 "background-color": "#FFE08F",
//                 "border-color": "#ece7e1ee",
//                 "color": "#000",
//                 "font-weight": "600",
//                 "padding": "10px 20px",
//                 "font-size": "14px",
//                 "border-radius": "8px"
//             })
//             .hover(
//                 function () { $(this).css("background-color", "#ffa733"); },
//                 function () { $(this).css("background-color", "#ffb84d"); }
//             );
//     }, 300);

//     $(wrapper).find('.layout-main-section')
//         .append(`<div id="mrp-table" style="margin-top:20px"></div>`);

//     load_mrp_table();
// };

// // ===============================
// // 🚀 LOAD MRP TABLE
// // ===============================
// function load_mrp_table() {
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_mrp_data",
//         callback: function(r) {
//             if (!r.message) {
//                 $("#mrp-table").html("<p>No Data Found</p>");
//                 return;
//             }

//             let data = r.message;

//             let html = `
//                 <table class="table table-bordered" style="width:100%; text-align:center;">
//                     <thead>
//                         <tr>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Demand</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Supply</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Requirement</th>
//                             <th rowspan="2" style="border:1px solid #000; background:#d9d9d9;">Select</th>
//                         </tr>

//                         <tr>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Item</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open SO Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Safety Stock</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">On Hand Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Available Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open PO Qty</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">Gross Requirement</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">MOQ</th>
//                             <th style="border:1px solid #000; background:#8BAE66;">Planned to Purchase Qty</th>
//                         </tr>
//                     </thead>

//                     <tbody>
//             `;

//             data.forEach(row => {
//                 html += `
//                     <tr>
//                         <td style="border:1px solid #000;">${row.item}</td>

//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);" class="open-so-link" data-item="${row.item}" style="color:#007bff; text-decoration:underline;">
//                                 ${row.open_sales_order}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">${row.safety_stock}</td>
//                         <td style="border:1px solid #000;">${row.on_hand_qty}</td>
//                         <td style="border:1px solid #000;">${row.available_qty}</td>

//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);" class="open-po-link" data-item="${row.item}" style="color:#007bff; text-decoration:underline;">
//                                 ${row.po_qty}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);" class="gross-req-link" data-item="${row.item}" data-open-so="${row.open_sales_order}" data-available="${row.available_qty}" data-open-po="${row.po_qty}" style="color:#FF4500; text-decoration:underline;">
//                                 ${row.gross_requirement}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">${row.moq}</td>
//                         <td style="border:1px solid #000; color: #08CB00;">${row.planned_purchase_qty}</td>

//                         <td style="border:1px solid #000;">
//                             <input type="checkbox" class="form-check-input mrp-select" data-item="${row.item}">
//                         </td>
//                     </tr>
//                 `;
//             });

//             html += `</tbody></table>`;
//             $("#mrp-table").html(html);
//         }
//     });
// }

// // ===============================
// // Click Handlers
// // ===============================

// // Open SO Qty
// $(document).on('click', '.open-so-link', function() {
//     const item = $(this).data('item');
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_sales_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
//             if(r.message && r.message.length > 0) {
//                 let content = `<ul>`;
//                 r.message.forEach(so => { content += `<li>${so.sales_order} : ${so.qty}</li>`; });
//                 content += `</ul>`;
//                 new frappe.ui.Dialog({
//                     title: `Open Sales Orders for ${item}`,
//                     fields: [{ fieldtype: 'HTML', fieldname: 'so_list', options: content }]
//                 }).show();
//             } else frappe.msgprint("No open Sales Orders found for this item.");
//         }
//     });
// });

// // Open PO Qty
// $(document).on('click', '.open-po-link', function() {
//     const item = $(this).data('item');
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_purchase_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
//             if(r.message && r.message.length > 0) {
//                 let content = `<ul>`;
//                 r.message.forEach(po => { content += `<li>${po.purchase_order} : ${po.qty}</li>`; });
//                 content += `</ul>`;
//                 new frappe.ui.Dialog({
//                     title: `Open Purchase Orders for ${item}`,
//                     fields: [{ fieldtype: 'HTML', fieldname: 'po_list', options: content }]
//                 }).show();
//             } else frappe.msgprint("No open Purchase Orders found for this item.");
//         }
//     });
// });

// // Gross Requirement Click
// $(document).on('click', '.gross-req-link', function() {
//     const item = $(this).data('item');
//     const open_so = $(this).data('open-so');
//     const available = $(this).data('available');
//     const open_po = $(this).data('open-po');

//     const gross_formula = `
//         <p><strong>Gross Requirement Calculation for ${item}:</strong></p>
//         <p>Formula: <code>Gross Requirement = Open SO Qty - Available Qty - Open PO Qty</code></p>
//         <p>Values: ${open_so} - ${available} - ${open_po} = ${open_so - available - open_po}</p>
//     `;

//     new frappe.ui.Dialog({
//         title: `Gross Requirement Details for ${item}`,
//         fields: [{ fieldtype: 'HTML', fieldname: 'gross_detail', options: gross_formula }]
//     }).show();
// });

// frappe.pages['mrp'].on_page_load = function(wrapper) {
//     var page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'MRP 📋',
//         single_column: true
//     });

//     page.set_primary_action("Purchase Order", function () {
//         frappe.set_route("List", "Purchase Order");
//     });

//     $(wrapper).find('.layout-main-section')
//         .append(`<div id="mrp-table" style="margin-top:20px"></div>`);

//     load_mrp_table();
// };


// // ===============================
// // 🚀 LOAD MRP TABLE
// // ===============================
// function load_mrp_table() {
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_mrp_data",
//         callback: function(r) {
//             if (!r.message) {
//                 $("#mrp-table").html("<p>No Data Found</p>");
//                 return;
//             }

//             let data = r.message;

//             let html = `
//                 <table class="table table-bordered" style="width:100%; text-align:center;">
//                     <thead>
//                         <tr>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Demand</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Supply</th>
//                             <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Requirement</th>
//                             <th rowspan="2" style="border:1px solid #000; background:#d9d9d9;">Select</th>
//                         </tr>

//                         <tr>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Item</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open SO Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Safety Stock</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">On Hand Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Available Qty</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open PO Qty</th>

//                             <th style="border:1px solid #000; background:#FBEFEF;">Gross Requirement</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">MOQ</th>
//                             <th style="border:1px solid #000; background:#8BAE66;">Planned to Purchase Qty</th>
//                         </tr>
//                     </thead>

//                     <tbody>
//             `;

//             data.forEach(row => {
//                 html += `
//                     <tr>
//                         <td style="border:1px solid #000;">${row.item}</td>

//                         <!-- OPEN SO QTY CLICKABLE -->
//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);" 
//                                class="open-so-link" 
//                                data-item="${row.item}"
//                                style="color:#007bff;text-decoration:underline;">
//                                 ${row.open_sales_order}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">${row.safety_stock}</td>

//                         <td style="border:1px solid #000;">${row.on_hand_qty}</td>
//                         <td style="border:1px solid #000;">${row.available_qty}</td>

//                         <!-- OPEN PO QTY CLICKABLE -->
//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);" 
//                                class="open-po-link" 
//                                data-item="${row.item}"
//                                style="color:#007bff;text-decoration:underline;">
//                                 ${row.po_qty}
//                             </a>
//                         </td>

//                         <!-- GROSS REQUIREMENT CLICK -->
//                         <td style="border:1px solid #000;">
//                             <a href="javascript:void(0);"
//                                class="gross-req-link"
//                                data-item="${row.item}"
//                                data-so="${row.open_sales_order}"
//                                data-avl="${row.available_qty}"
//                                data-po="${row.po_qty}"
//                                style="color:#007bff;text-decoration:underline;">
//                                 ${row.gross_requirement}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">${row.moq}</td>

//                         <!-- PLANNED PURCHASE CLICK -->
//                         <td style="border:1px solid #000; color:#08CB00;">
//                             <a href="javascript:void(0);"
//                                class="planned-purchase-link"
//                                data-item="${row.item}"
//                                data-on-hand="${row.on_hand_qty}"
//                                data-safety="${row.safety_stock}"
//                                data-gross="${row.gross_requirement}"
//                                data-moq="${row.moq}"
//                                data-planned="${row.planned_purchase_qty}"
//                                style="color:#007bff;text-decoration:underline;">
//                                 ${row.planned_purchase_qty}
//                             </a>
//                         </td>

//                         <td style="border:1px solid #000;">
//                             <input type="checkbox" class="form-check-input mrp-select" data-item="${row.item}">
//                         </td>
//                     </tr>
//                 `;
//             });

//             html += `
//                     </tbody>
//                 </table>
//             `;

//             $("#mrp-table").html(html);
//         }
//     });
// }


// // ===============================
// // OPEN SO QTY POPUP
// // ===============================
// $(document).on('click', '.open-so-link', function() {
//     const item = $(this).data('item');

//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_sales_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
//             let content = `<ul>`;
//             (r.message || []).forEach(so => {
//                 content += `<li>${so.sales_order} → ${so.qty}</li>`;
//             });
//             content += `</ul>`;

//             new frappe.ui.Dialog({
//                 title:`Open Sales Orders for ${item}`,
//                 fields:[{ fieldtype:'HTML', fieldname:'list', options:content }]
//             }).show();
//         }
//     });
// });


// // ===============================
// // OPEN PO QTY POPUP
// // ===============================
// $(document).on('click', '.open-po-link', function() {
//     const item = $(this).data('item');

//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_purchase_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
//             let content = `<ul>`;
//             (r.message || []).forEach(po => {
//                 content += `<li>${po.purchase_order} → ${po.qty}</li>`;
//             });
//             content += `</ul>`;

//             new frappe.ui.Dialog({
//                 title:`Open Purchase Orders for ${item}`,
//                 fields:[{ fieldtype:'HTML', fieldname:'list', options:content }]
//             }).show();
//         }
//     });
// });


// // ===============================
// // GROSS REQUIREMENT POPUP
// // ===============================
// $(document).on('click', '.gross-req-link', function() {
//     const item = $(this).data('item');
//     const so = $(this).data('so');
//     const avl = $(this).data('avl');
//     const po = $(this).data('po');

//     const gross = so - avl - po;

//     let content = `
//         <p><b>Gross Requirement Formula</b></p>
//         <p>Gross Requirement = Open SO Qty − Available Qty − Open PO Qty</p>

//         <p>
//             = ${so} − ${avl} − ${po}<br>
//             = <b>${gross}</b>
//         </p>
//     `;

//     new frappe.ui.Dialog({
//         title:`Gross Requirement Calculation – ${item}`,
//         fields:[{ fieldtype:'HTML', fieldname:'calc', options:content }]
//     }).show();
// });


// // ===============================
// // PLANNED PURCHASE – REASON POPUP
// // ===============================
// $(document).on('click', '.planned-purchase-link', function() {
//     const item = $(this).data('item');
//     const on_hand = Number($(this).data('on-hand'));
//     const safety = Number($(this).data('safety'));
//     const gross = Number($(this).data('gross'));
//     const moq = Number($(this).data('moq'));
//     const planned = Number($(this).data('planned'));

//     let steps = [];

//     if(on_hand === safety) {
//         steps.push(`<li>Rule 1: On Hand (${on_hand}) = Safety Stock (${safety}) → TRUE → Planned Qty = MOQ (${moq})</li>`);
//     } else {
//         steps.push(`<li>Rule 1: On Hand (${on_hand}) = Safety Stock (${safety}) → FALSE</li>`);
//     }

//     if(gross <= 0) {
//         steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → TRUE → Planned Qty = 0</li>`);
//     } else {
//         steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → FALSE</li>`);
//     }

//     if(gross > 0 && gross < moq) {
//         steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${moq}) → TRUE → Planned Qty = MOQ (${moq})</li>`);
//     } else {
//         steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${moq}) → FALSE</li>`);
//     }

//     if(gross >= moq) {
//         steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → TRUE → Planned Qty = Gross Requirement (${gross})</li>`);
//     } else {
//         steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → FALSE</li>`);
//     }

//     const content = `
//         <p><b>Planned Purchase Qty Decision Logic</b></p>
//         <ol>${steps.join("")}</ol>

//         <p><b>Final Planned Purchase Qty = ${planned}</b></p>
//     `;

//     new frappe.ui.Dialog({
//         title:`Planned Purchase Qty Reason – ${item}`,
//         fields:[{ fieldtype:'HTML', fieldname:'logic', options:content }]
//     }).show();
// });

// Below code is for auto PO generation

frappe.pages['mrp'].on_page_load = function(wrapper) {
    var page = frappe.ui.make_app_page({
        parent: wrapper,
        title: 'MRP 📋',
        single_column: true
    });

    // 🔥 MAIN ACTION BUTTON → CREATE PO
    page.set_primary_action("Purchase Order", function () {
        create_purchase_order_from_mrp();
    });

    $(wrapper).find('.layout-main-section')
        .append(`<div id="mrp-table" style="margin-top:30px"></div>`);

    load_mrp_table();
};


// ===============================
// 🚀 LOAD MRP TABLE
// ===============================
function load_mrp_table() {
    frappe.call({
        method: "renu_customization.renu_customization.page.mrp.mrp.get_mrp_data",
        callback: function(r) {
            if (!r.message) {
                $("#mrp-table").html("<p>No Data Found</p>");
                return;
            }

            let data = r.message;

            let html = `
                <table class="table table-bordered" style="width:100%; text-align:center;">
                    <thead>
                        <tr>
                            <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Demand</th>
                            <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Supply</th>
                            <th colspan="3" style="border:1px solid #000; background:#d9d9d9;">Requirement</th>
                            <th rowspan="2" style="border:1px solid #000; background:#d9d9d9;">Select</th>
                       


                        </tr>

                        <tr>
                            <th style="border:1px solid #000; background:#FBEFEF;">Item</th>
                            <th style="border:1px solid #000; background:#FBEFEF;">Open SO Qty</th>
                            <th style="border:1px solid #000; background:#FBEFEF;">Safety Stock</th>

                            <th style="border:1px solid #000; background:#FBEFEF;">On Hand Stock</th>
                            <th style="border:1px solid #000; background:#FBEFEF;">Available Stock</th>
                            <th style="border:1px solid #000; background:#FBEFEF;">Open PO Qty</th>

                            <th style="border:1px solid #000; background:#FBEFEF;">Gross Requirement</th>
                            <th style="border:1px solid #000; background:#FBEFEF;">MOQ</th>
                            <th style="border:1px solid #000; background:#8BAE66;">Planned to Purchase Qty</th>
                            
                            
                            
                        </tr>
                    </thead>

                    <tbody>
            `;

            data.forEach(row => {
                html += `
                    <tr>
                        <td style="border:1px solid #000;">${row.item}</td>

                        <!-- OPEN SO QTY CLICKABLE -->
                        <td style="border:1px solid #000;">
                            <a href="javascript:void(0);" 
                               class="open-so-link" 
                               data-item="${row.item}"
                               style="color:#007bff;text-decoration:underline;">
                                ${row.open_sales_order}
                            </a>
                        </td>

                        <td style="border:1px solid #000;">${row.safety_stock}</td>

                        <td style="border:1px solid #000;">${row.on_hand_qty}</td>
                        <td style="border:1px solid #000;">${row.available_qty}</td>
                        
                        <!-- OPEN PO QTY CLICKABLE -->
                        <td style="border:1px solid #000;">
                            <a href="javascript:void(0);" 
                               class="open-po-link" 
                               data-item="${row.item}"
                               style="color:#007bff;text-decoration:underline;">
                                ${row.po_qty}
                            </a>
                        </td>

                        <!-- GROSS REQUIREMENT CLICK -->
                        <td style="border:1px solid #000;">
                            <a href="javascript:void(0);"
                               class="gross-req-link"
                               data-item="${row.item}"
                               data-so="${row.open_sales_order}"
                               data-avl="${row.available_qty}"
                               data-po="${row.po_qty}"
                               style="color:#007bff;text-decoration:underline;">
                                ${row.gross_requirement}
                            </a>
                        </td>

                        <td style="border:1px solid #000;">${row.moq}</td>

                        <!-- PLANNED PURCHASE CLICK -->
                        <td style="border:1px solid #000; color:#08CB00;">
                            <a href="javascript:void(0);"
                               class="planned-purchase-link"
                               data-item="${row.item}"
                               data-on-hand="${row.on_hand_qty}"
                               data-safety="${row.safety_stock}"
                               data-gross="${row.gross_requirement}"
                               data-moq="${row.moq}"
                               data-planned="${row.planned_purchase_qty}"
                               style="color:#007bff;text-decoration:underline;">
                                ${row.planned_purchase_qty}
                            </a>
                        </td>

                        <td style="border:1px solid #000;">
                            <input type="checkbox" class="form-check-input mrp-select" data-item="${row.item}">
                        </td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            $("#mrp-table").html(html);
        }
    });
}


// ===============================
// OPEN SO QTY POPUP
// ===============================
$(document).on('click', '.open-so-link', function() {
    const item = $(this).data('item');

    frappe.call({
        method: "renu_customization.renu_customization.page.mrp.mrp.get_sales_orders_for_item",
        args: { item_code: item },
        callback: function(r) {
            let content = `<ul>`;
            (r.message || []).forEach(so => {
                content += `<li>${so.sales_order} → ${so.qty}</li>`;
            });
            content += `</ul>`;

            new frappe.ui.Dialog({
                title:`Open Sales Orders for ${item}`,
                fields:[{ fieldtype:'HTML', fieldname:'list', options:content }]
            }).show();
        }
    });
});


// ===============================
// OPEN PO QTY POPUP
// ===============================
$(document).on('click', '.open-po-link', function() {
    const item = $(this).data('item');

    frappe.call({
        method: "renu_customization.renu_customization.page.mrp.mrp.get_purchase_orders_for_item",
        args: { item_code: item },
        callback: function(r) {
            let content = `<ul>`;
            (r.message || []).forEach(po => {
                content += `<li>${po.purchase_order} → ${po.qty}</li>`;
            });
            content += `</ul>`;

            new frappe.ui.Dialog({
                title:`Open Purchase Orders for ${item}`,
                fields:[{ fieldtype:'HTML', fieldname:'list', options:content }]
            }).show();
        }
    });
});


// ===============================
// GROSS REQUIREMENT POPUP
// ===============================
$(document).on('click', '.gross-req-link', function() {
    const item = $(this).data('item');
    const so = $(this).data('so');
    const avl = $(this).data('avl');
    const po = $(this).data('po');

    const gross = so - avl - po;

    let content = `
        <p><b>Gross Requirement Formula</b></p>
        <p>Gross Requirement = Open SO Qty − Available Qty − Open PO Qty</p>

        <p>
            = ${so} − ${avl} − ${po}<br>
            = <b>${gross}</b>
        </p>
    `;

    new frappe.ui.Dialog({
        title:`Gross Requirement Calculation – ${item}`,
        fields:[{ fieldtype:'HTML', fieldname:'calc', options:content }]
    }).show();
});


// ===============================
// PLANNED PURCHASE – REASON POPUP
// ===============================
$(document).on('click', '.planned-purchase-link', function() {
    const item = $(this).data('item');
    const on_hand = Number($(this).data('on-hand'));
    const safety = Number($(this).data('safety'));
    const gross = Number($(this).data('gross'));
    const moq = Number($(this).data('moq'));
    const planned = Number($(this).data('planned'));

    let steps = [];

    if(on_hand === safety) {
        steps.push(`<li>Rule 1: On Hand (${on_hand}) = Safety Stock (${safety}) → TRUE → Planned Qty = MOQ (${moq})</li>`);
    } else {
        steps.push(`<li>Rule 1: On Hand (${on_hand}) = Safety Stock (${safety}) → FALSE</li>`);
    }

    if(gross <= 0) {
        steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → TRUE → Planned Qty = 0</li>`);
    } else {
        steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → FALSE</li>`);
    }

    if(gross > 0 && gross < moq) {
        steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${moq}) → TRUE → Planned Qty = MOQ (${moq})</li>`);
    } else {
        steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${moq}) → FALSE</li>`);
    }

    if(gross >= moq) {
        steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → TRUE → Planned Qty = Gross Requirement (${gross})</li>`);
    } else {
        steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → FALSE</li>`);
    }

    const content = `
        <p><b>Planned Purchase Qty Decision Logic</b></p>
        <ol>${steps.join("")}</ol>

        <p><b>Final Planned Purchase Qty = ${planned}</b></p>
    `;

    new frappe.ui.Dialog({
        title:`Planned Purchase Qty Reason – ${item}`,
        fields:[{ fieldtype:'HTML', fieldname:'logic', options:content }]
    }).show();
});


// ===============================
// 🚀 CREATE PURCHASE ORDER
// ===============================
function create_purchase_order_from_mrp() {

    let selected_items = [];

    $(".mrp-select:checked").each(function() {

        let row = $(this).closest("tr");

        selected_items.push({
            item: row.find("td:eq(0)").text(),
            planned_qty: Number(row.find(".planned-purchase-link").text())
        });
    });

    if(selected_items.length === 0){
        frappe.msgprint("Please select at least one item");
        return;
    }

    frappe.call({
        method: "renu_customization.renu_customization.page.mrp.mrp.create_purchase_order",
        args: {
            items: JSON.stringify(selected_items)
        },
        freeze: true,
        freeze_message: "Creating Purchase Order...",
        callback: function(r){
            if(r.message){
                frappe.msgprint({
                    title: "Purchase Order Created",
                    message: `<b>${r.message}</b>`,
                    indicator: "green"
                });

                frappe.set_route("Form", "Purchase Order", r.message);
            }
        }
    });
}
