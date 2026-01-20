// frappe.pages['mrp-tab'].on_page_load = function (wrapper) {
 
//     const page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'MRP-Tab 📋',
//         single_column: true
//     });
 
//     page.set_primary_action("Purchase Order", () => {
//         create_purchase_order_from_mrp();
//     });
 
   
//     $(wrapper).find(".layout-main-section").html(`
//     <ul class="nav nav-tabs">
//         <li class="nav-item">
//             <a class="nav-link active" id="tab-mrp">MRP</a>
//         </li>
//         <li class="nav-item">
//             <a class="nav-link" id="tab-scheduler">MRP Scheduler Status</a>
//         </li>
//     </ul>
 
//     <div id="mrp-content" style="margin-top:20px;">
//         <div id="mrp-table"></div>
//     </div>
 
//     <div id="scheduler-content" style="margin-top:20px; display:none;">
//         <div id="mrp-scheduler-log"></div>
//     </div>
//     `);
 
// $(wrapper).append(`
// <style>
//     /* Tab bar background */
//     .nav-tabs {
//         background: #FFFFFF;
//         padding: 8px;
//         border-radius: 6px;
//     }
 
//     /* Normal tab */
//     .nav-tabs .nav-link {
//         background: #c8def4;
//         color: #333;
//         margin-right: 5px;
//         border-radius: 5px;
//         font-weight: 600;
//     }
 
//     /* Active tab */
//     .nav-tabs .nav-link.active {
//         background: #007bff;
//         color: #fff;
//     }
 
//     /* Hover effect */
//     .nav-tabs .nav-link:hover {
//         background: #0056b3;
//         color: #fff;
//     }
// </style>
// `);
 
 
//     // Initial Load
//     load_mrp_table();
 
//     // --------------------------------------------------
//     // TAB EVENTS
//     // --------------------------------------------------
//     $("#tab-mrp").on("click", function () {
//         $(".nav-link").removeClass("active");
//         $(this).addClass("active");
 
//         $("#scheduler-content").hide();
//         $("#mrp-content").show();
 
//         page.set_primary_action("Purchase Order", () => {
//             create_purchase_order_from_mrp();
//         });
//     });
 
//     $("#tab-scheduler").on("click", function () {
//         $(".nav-link").removeClass("active");
//         $(this).addClass("active");
 
//         $("#mrp-content").hide();
//         $("#scheduler-content").show();
 
//         page.clear_primary_action();
 
//         load_mrp_scheduler_log(1);
//     });
// };
 
 
 
// function load_mrp_table() {
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_mrp_data",
//         callback: function (r) {
//             if (!r.message) {
//                 $("#mrp-table").html("<p>No Data Found</p>");
//                 return;
//             }
 
//             let data = r.message;
//             // 🔥 SORT: Recently updated items at top
//             data.sort((a, b) => {
//                 if (!a.modified || !b.modified) return 0;
//                 return new Date(b.modified) - new Date(a.modified);
//             });
 
 
//             let page_size = 20;
//             let current_page = 1;
 
//             function render_table(page = 1) {
//                 current_page = page;
//                 let start = (page - 1) * page_size;
//                 let end = start + page_size;
 
//                 let paginated_data = data.slice(start, end);
 
//                 let html = `
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
 
//                             <th style="border:1px solid #000; background:#FBEFEF;">On Hand Stock</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Available Stock</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Open PO Qty</th>
 
//                             <th style="border:1px solid #000; background:#FBEFEF;">Gross Requirement</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">MOQ</th>
//                             <th style="border:1px solid #000; background:#8BAE66;">Planned to Purchase Qty</th>
//                         </tr>
//                     </thead>
 
//                     <tbody>
//                 `;
 
//                 paginated_data.forEach(row => {
//                     html += `
//                         <tr>
//                             <td style="border:1px solid #000;">
//                                 <a href="javascript:void(0);" class="item-link" data-item="${row.item}" style="color:#007bff;">
//                                     ${row.item}
//                                 </a>
//                             </td>
 
//                             <td style="border:1px solid #000; text-align:right;">
//                                 <a href="javascript:void(0);" class="open-so-link" data-item="${row.item}" style="color:#007bff;">
//                                     ${row.open_sales_order}
//                                 </a>
//                             </td>
 
//                             <td style="border:1px solid #000; text-align:right;">${row.safety_stock}</td>
//                             <td style="border:1px solid #000; text-align:right;">${row.on_hand_qty}</td>
//                             <td style="border:1px solid #000; text-align:right;">${row.available_qty}</td>
 
//                             <td style="border:1px solid #000; text-align:right;">
//                                 <a href="javascript:void(0);" class="open-po-link" data-item="${row.item}" style="color:#007bff;">
//                                     ${row.po_qty}
//                                 </a>
//                             </td>
 
//                             <td style="border:1px solid #000; text-align:right;">
//                                 <a href="javascript:void(0);" class="gross-req-link"
//                                    data-item="${row.item}" style="color:#007bff;"
//                                    data-so="${row.open_sales_order}"
//                                    data-avl="${row.available_qty}"
//                                    data-po="${row.po_qty}">
//                                    ${row.gross_requirement}
//                                 </a>
//                             </td>
 
//                             <td style="border:1px solid #000; text-align:right;">${row.moq}</td>
 
//                             <td style="border:1px solid #000; color:#08CB00; text-align:right;">
//                                 <a href="javascript:void(0);" class="planned-purchase-link"
//                                    data-item="${row.item}"
//                                    data-on-hand="${row.on_hand_qty}"
//                                    data-safety="${row.safety_stock}"
//                                    data-gross="${row.gross_requirement}"
//                                    data-moq="${row.moq}"
//                                    data-planned="${row.planned_purchase_qty}">
//                                    ${row.planned_purchase_qty}
//                                 </a>
//                             </td>
 
//                             <td style="border:1px solid #000;">
//                                 <input type="checkbox" class="form-check-input mrp-select" data-item="${row.item}">
//                             </td>
//                         </tr>
//                     `;
//                 });
 
//                 html += `
//                     </tbody>
//                 </table>
//                 `;
 
//                 // Pagination Controls
//                 let total_pages = Math.ceil(data.length / page_size);
 
//                 html += `
//                     <div style="display:flex; justify-content:center; gap:10px; margin-top:10px;">
//                         <button class="btn btn-primary" id="prev_page" ${current_page === 1 ? "disabled" : ""}>
//                             Previous
//                         </button>
 
//                         <span style="padding:3px 5px; ">
//                             Page ${current_page} of ${total_pages}
//                         </span>
 
//                         <button class="btn btn-primary" id="next_page" ${current_page === total_pages ? "disabled" : ""}>
//                             Next
//                         </button>
//                     </div>
//                 `;
 
//                 $("#mrp-table").html(html);
 
//                 $("#prev_page").click(() => render_table(current_page - 1));
//                 $("#next_page").click(() => render_table(current_page + 1));
//             }
 
//             // Initial Render
//             render_table(1);
//         }
//     });
// }
 
 
// let mrpLogPage = 1;          // Start page as 1
// const logPageSize = 10;      // Records per page
// let totalLogPages = 1;
 
// function load_mrp_scheduler_log(page = 1) {
 
//     $("#scheduler-content").html(`<p class="text-muted">Loading...</p>`);
 
//     frappe.call({
//         method: "frappe.client.get_count",
//         args: {
//             doctype: "MRP Scheduler Log",
//             filters: [["reason", "!=", "Planned Purchase Qty is 0"]]
//         },
//         callback(res) {
 
//             const total = res.message || 0;
//             totalLogPages = Math.ceil(total / logPageSize);
 
//             frappe.call({
//                 method: "frappe.client.get_list",
//                 args: {
//                     doctype: "MRP Scheduler Log",
//                     fields: [
//                         "run_date",
//                         "status",
//                         "item",
//                         "reason",
//                         "po_id"
//                     ],
//                     order_by: "run_date desc",
//                     limit_start: (page - 1) * logPageSize,
//                     limit_page_length: logPageSize,
//                     filters: [["reason", "!=", "Planned Purchase Qty is 0"]]
//                 },
//                 callback(r) {
 
//                     const logs = r.message || [];
 
//                     let html = `
//                         <table class="table table-bordered text-center">
//                             <thead>
//                                 <tr>
//                                     <th>Item</th>
//                                     <th>Date</th>
//                                     <th>Status</th>
//                                     <th>PO ID</th>
//                                     <th>Reason</th>
//                                 </tr>
//                             </thead>
//                             <tbody>
//                     `;
 
//                     if (!logs.length) {
//                         html += `<tr><td colspan="5">No Logs Found</td></tr>`;
//                     } else {
//                         logs.forEach(l => {
//     let po_id = "-";
//     let reason_text = l.reason || "-";
 
//     // 🔥 If status is Success and reason is empty, show Success and PO link if exists
//     if (l.status === "Success") {
//         // If reason contains PO ID, extract it
//         if (l.reason) {
//             const match = l.reason.match(/PO-\d+/);
//             if (match) {
//                 po_id = `<a href="/app/purchase-order/${match[0]}" target="_blank">${match[0]}</a>`;
//             }
//             reason_text = ""; // If PO generated, leave reason blank
//         } else if (l.po_id) { // Optional: if you have a separate field storing PO ID
//             po_id = `<a href="/app/purchase-order/${l.po_id}" target="_blank">${l.po_id}</a>`;
//             reason_text = "";
//         }
//     } else {
//         // If not success, extract PO ID from reason if exists
//         if (l.reason) {
//             const match = l.reason.match(/PO-\d+/);
//             if (match) {
//                 po_id = `<a href="/app/purchase-order/${match[0]}" target="_blank">${match[0]}</a>`;
//             }
//         }
//     }
 
//     html += `
//         <tr>
//             <td>${l.item || "-"}</td>
//             <td>${l.run_date || ""}</td>
//             <td style="color:${l.status === "Success" ? "green" : "red"}">
//                 ${l.status}
//             </td>
//             <td>${po_id}</td>
//             <td>${reason_text}</td>
//         </tr>`;
//     });
 
//                     }
 
//     html += `
//                             </tbody>
//                         </table>
 
//                         <div class="text-center">
//                             <button class="btn btn-sm btn-primary"
//                                 ${page === 1 ? "disabled" : ""}
//                                 onclick="load_mrp_scheduler_log(${page - 1})">
//                                 Previous
//                             </button>
 
//                             <span class="mx-2">Page ${page} of ${totalLogPages}</span>
 
//                             <button class="btn btn-sm btn-primary"
//                                 ${page === totalLogPages ? "disabled" : ""}
//                                 onclick="load_mrp_scheduler_log(${page + 1})">
//                                 Next
//                             </button>
//                         </div>
//                     `;
 
//                     $("#scheduler-content").html(html);
//                 }
//             });
//         }
//     });
// }
 
// // Call this after loading MRP table
// $(document).ready(function(){
//     $("#mrp-table").after('<div id="mrp-scheduler-log" style="margin-top:30px;"></div>');
//     load_mrp_scheduler_log();
// });
 
// // ITEM CLICK → OPEN ITEM
// $(document).on('click', '.item-link', function() {
//     const item = $(this).data('item');
//     frappe.set_route("Form", "Item", item);
// });
 
 
// // ===============================
// // ITEM CLICK → OPEN ITEM
// // ===============================
// $(document).on('click', '.item-link', function() {
//     const item = $(this).data('item');
//     frappe.set_route("Form", "Item", item);
// });
 
 
// $(document).on('click', '.open-so-link', function() {
//     const item = $(this).data('item');
 
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_sales_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
 
//             let so_list = r.message || [];
 
//             if(!so_list.length){
//                 frappe.msgprint("No Open Sales Orders for this Item");
//                 return;
//             }
 
//             let content = `
//                 <table class="table table-bordered">
//                     <thead>
//                         <tr>
//                             <th>Sales Order</th>
//                             <th style="text-align:right;">Order Qty</th>
//                             <th style="text-align:right;">Delivered Qty</th>
//                             <th style="text-align:right;">Open Qty</th>
//                             <th>Delivery Date</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//             `;
 
//             so_list.forEach(so => {
//                 content += `
//                     <tr>
//                         <td>
//                             <a href="javascript:void(0);"
//                                 onclick="frappe.set_route('Form','Sales Order','${so.sales_order}')"
//                                 style="color:#007bff;">
//                                 ${so.sales_order}
//                             </a>
//                         </td>
//                         <td style="text-align:right;">${so.qty}</td>
//                         <td style="text-align:right;">${so.delivered_qty}</td>
//                         <td style="text-align:right;">${so.pending_qty}</td>
//                         <td>${so.delivery_date || "-"}</td>
//                     </tr>
//                 `;
//             });
 
//             content += `
//                     </tbody>
//                 </table>
//             `;
 
//             new frappe.ui.Dialog({
//                 title:`Open Sales Orders for ${item}`,
//                 fields:[{ fieldtype:'HTML', fieldname:'list', options:content }],
//                 size: 'large'
//             }).show();
//         }
//     });
// });
 
 
 
// // ===============================
// $(document).on('click', '.open-po-link', function() {
//     const item = $(this).data('item');
 
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_purchase_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {
 
//             let po_list = r.message || [];
 
//             if(!po_list.length){
//                 frappe.msgprint("No Open Purchase Orders for this Item");
//                 return;
//             }
 
//             let content = `
//                 <table class="table table-bordered">
//                     <thead>
//                         <tr>
//                             <th>Purchase Order</th>
//                             <th style="text-align:right;">Order Qty</th>
//                             <th style="text-align:right;">Received Qty</th>
//                             <th style="text-align:right;">Open Qty</th>
//                             <th>Schedule Date</th>
//                         </tr>
//                     </thead>
//                     <tbody>
//             `;
 
//             po_list.forEach(po => {
//                 content += `
//                     <tr>
//                         <td>
//                             <a href="javascript:void(0);"
//                                 onclick="frappe.set_route('Form','Purchase Order','${po.purchase_order}')"
//                                 style="color:#007bff;">
//                                 ${po.purchase_order}
//                             </a>
//                         </td>
//                         <td style="text-align:right;">${po.qty}</td>
//                         <td style="text-align:right;">${po.received_qty}</td>
//                         <td style="text-align:right;">${po.pending_qty}</td>
//                         <td>${po.schedule_date || "-"}</td>
//                     </tr>
//                 `;
//             });
 
//             content += `
//                     </tbody>
//                 </table>
//             `;
 
//             new frappe.ui.Dialog({
//                 title:`Open Purchase Orders for ${item}`,
//                 fields:[{ fieldtype:'HTML', fieldname:'list', options:content }],
//                 size: 'large'
//             }).show();
//         }
//     });
// });
 
 
 
// // ===============================
// // GROSS REQUIREMENT POPUP
 
// $(document).on('click', '.gross-req-link', function() {
 
//     const item = $(this).data('item');
//     const so = Number($(this).data('so') || 0);
//     const avl = Number($(this).data('avl') || 0);
//     const po = Number($(this).data('po') || 0);
 
//     const gross = so - avl - po;
 
//     let content = `
//         <table class="table table-bordered" style="text-align:center;">
//             <thead>
//                 <tr>
//                     <th colspan="5" style="background:#f5f5f5;">
//                         Gross Requirement Calculation
//                     </th>
//                 </tr>
//                 <tr>
//                 <th colspan="5" style="padding:10px;">
//                     <b>
//                         Gross Requirement = Open SO Qty − Available Qty − Open PO Qty
//                     </b>
//                 </th>
//             </tr>
//             </thead>
 
//             <tbody>
 
//                 <!-- Header Row -->
//                 <tr>
//                     <td><b>Gross Requirement</b></td>
//                     <td>=</td>
//                     <td><b>Open SO Qty</b></td>
//                     <td><b>Available Qty</b></td>
//                     <td><b>Open PO Qty</b></td>
//                 </tr>
 
//                 <!-- Value Row -->
//                 <tr>
//                     <td></td>
//                     <td></td>
//                     <td>${so}</td>
//                     <td>${-avl}</td>
//                     <td>${-po}</td>
//                 </tr>
 
//                 <!-- Result Row -->
//                 <tr>
//                     <td><b>Gross Requirement</b></td>
//                     <td>=</td>
//                     <td colspan="3" style="color:blue;"><b>${gross}</b></td>
//                 </tr>
 
//             </tbody>
//         </table>
//     `;
 
//     new frappe.ui.Dialog({
//         title: `Gross Requirement Details — ${item}`,
//         fields:[
//             { fieldtype:'HTML', fieldname:'list', options:content }
//         ],
//         size: 'large'
//     }).show();
// });
// /* ⭐⭐⭐ END — GROSS REQUIREMENT POPUP ⭐⭐⭐ */
 
 
 
// // ===============================
// // PLANNED PURCHASE – REASON POPUP
// // ===============================
// // $(document).on('click', '.planned-purchase-link', function() {
// //     const item = $(this).data('item');
// //     const on_hand = Number($(this).data('on-hand'));
// //     const safety = Number($(this).data('safety'));
// //     const gross = Number($(this).data('gross'));
// //     const moq = Number($(this).data('moq'));
// //     const planned = Number($(this).data('planned'));
 
// //     let steps = [];
 
// //     if(on_hand === safety) {
// //         steps.push(`<li>Rule 1: On Hand (${on_hand}) = Safety Stock (${safety}) → TRUE → Planned Qty = MOQ (${moq})</li>`);
// //     }
// //     else {
// //         steps.push(`<li>Rule 1: On Hand (${on_hand}) = Safety Stock (${safety}) → FALSE</li>`);
// //     }
 
// //     if(gross <= 0) {
// //         steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → TRUE → Planned Qty = 0</li>`);
// //     }
// //     else {
// //         steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → FALSE</li>`);
// //     }
 
// //     if(gross < moq) {
// //         steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${moq}) → TRUE → Planned Qty = MOQ (${moq})</li>`);
// //     }
// //     else {
// //         steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${gross}) → FALSE</li>`);
// //     }
 
// //     if(gross >= moq) {
// //         steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → TRUE → Planned Qty = Gross Requirement (${gross})</li>`);
// //     } else {
// //         steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → FALSE</li>`);
// //     }
 
// //     const content = `
// //         <p><b>Planned Purchase Qty Decision Logic</b></p>
// //         <ol>${steps.join("")}</ol>
 
// //         <p><b>Final Planned to Purchase Qty = ${planned}</b></p>
// //     `;
 
// //     new frappe.ui.Dialog({
// //         title:`Planned Purchase Qty Reason – ${item}`,
// //         fields:[{ fieldtype:'HTML', fieldname:'logic', options:content }]
// //     }).show();
// // });
 
 
// // ===============================
// // 🚀 CREATE PURCHASE ORDER
// // ===============================
// function create_purchase_order_from_mrp() {
 
//     let selected_items = [];
 
//     $(".mrp-select:checked").each(function() {
 
//         let row = $(this).closest("tr");
 
//         selected_items.push({
//             item: row.find("td:eq(0)").text().trim(),
//             planned_qty: Number(row.find(".planned-purchase-link").text())
//         });
//     });
 
//     if(selected_items.length === 0){
//         frappe.msgprint("Please select at least one item");
//         return;
//     }
//     // 🔴 Validation removed to prioritize server-side checks and logging
 
//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.create_purchase_order",
//         args: {
//             items: JSON.stringify(selected_items)
//         },
//         freeze: true,
//         freeze_message: "Creating Purchase Order...",
//         callback: function(r){
//             if(r.message){
//                 frappe.msgprint({
//                     title: "Purchase Order Created",
//                     message: `<b>${r.message}</b>`,
//                     indicator: "green"
//                 });
 
//                 frappe.set_route("Form", "Purchase Order", r.message);
//             }
//         }
//     });
// }

