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

// frappe.pages['mrp'].on_page_load = function(wrapper) {
//     var page = frappe.ui.make_app_page({
//         parent: wrapper,
//         title: 'MRP 📋',
//         single_column: true
//     });

//     // 🔥 MAIN ACTION BUTTON → CREATE PO
//     page.set_primary_action("Purchase Order", function () {
//         create_purchase_order_from_mrp();
//     });

//     $(wrapper).find('.layout-main-section')
//         .append(`<div id="mrp-table" style="margin-top:30px"></div>`);

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

//                             <th style="border:1px solid #000; background:#FBEFEF;">On Hand Stock</th>
//                             <th style="border:1px solid #000; background:#FBEFEF;">Available Stock</th>
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

//         <p><b>Final Planned to Purchase Qty = ${planned}</b></p>
//     `;

//     new frappe.ui.Dialog({
//         title:`Planned Purchase Qty Reason – ${item}`,
//         fields:[{ fieldtype:'HTML', fieldname:'logic', options:content }]
//     }).show();
// });


// // ===============================
// // 🚀 CREATE PURCHASE ORDER
// // ===============================
// function create_purchase_order_from_mrp() {

//     let selected_items = [];

//     $(".mrp-select:checked").each(function() {

//         let row = $(this).closest("tr");

//         selected_items.push({
//             item: row.find("td:eq(0)").text(),
//             planned_qty: Number(row.find(".planned-purchase-link").text())
//         });
//     });

//     if(selected_items.length === 0){
//         frappe.msgprint("Please select at least one item");
//         return;
//     }

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

//Add hyperlink to item open pi and so qty below script is working till date
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
                        <!-- ITEM CLICKABLE -->
                        <td style="border:1px solid #000;">
                            <a href="javascript:void(0);"
                               class="item-link"
                               data-item="${row.item}"
                               style="color:#007bff;">
                                ${row.item}
                            </a>
                        </td>

                        <!-- OPEN SO QTY CLICK -->
                        <td style="border:1px solid #000; text-align:right;">
                            <a href="javascript:void(0);" 
                               class="open-so-link" 
                               data-item="${row.item}"
                               style="color:#007bff;">
                                ${row.open_sales_order}
                            </a>
                        </td>

                        <td style="border:1px solid #000; text-align:right;">${row.safety_stock}</td>

                        <td style="border:1px solid #000; text-align:right;">${row.on_hand_qty}</td>
                        <td style="border:1px solid #000; text-align:right;">${row.available_qty}</td>
                        
                        <!-- OPEN PO QTY CLICK -->
                        <td style="border:1px solid #000; text-align:right;">
                            <a href="javascript:void(0);" 
                               class="open-po-link" 
                               data-item="${row.item}"
                               style="color:#007bff;">
                                ${row.po_qty}
                            </a>
                        </td>

                        <!-- GROSS REQUIREMENT CLICK -->
                        <td style="border:1px solid #000; text-align:right;">
                            <a href="javascript:void(0);"
                               class="gross-req-link"
                               data-item="${row.item}"
                               data-so="${row.open_sales_order}"
                               data-avl="${row.available_qty}"
                               data-po="${row.po_qty}"
                               style="color:#007bff;">
                                ${row.gross_requirement}
                            </a>
                        </td>

                        <td style="border:1px solid #000; text-align:right;">${row.moq}</td>

                        <!-- PLANNED PURCHASE CLICK -->
                        <td style="border:1px solid #000; color:#08CB00; text-align:right;">
                            <a href="javascript:void(0);"
                               class="planned-purchase-link"
                               data-item="${row.item}"
                               data-on-hand="${row.on_hand_qty}"
                               data-safety="${row.safety_stock}"
                               data-gross="${row.gross_requirement}"
                               data-moq="${row.moq}"
                               data-planned="${row.planned_purchase_qty}"
                               style="color:#007bff;">
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
//🚀 LOAD SCHEDULER LOG
function load_mrp_scheduler_log() {
    frappe.call({
        method: "frappe.client.get_list",
        args: {
            doctype: "MRP Scheduler Log",
            fields: ["run_date", "status", "item", "reason"],
            order_by: "run_date desc",
            limit_page_length: 20,
            filters: [["reason","!=","Planned Purchase Qty is 0"]]
        },
        callback: function(r) {
            let logs = r.message || [];

            if(!logs.length){
                $("#mrp-scheduler-log").html("<p>No Scheduler Logs Found</p>");
                return;
            }

            let html = `
                <h5>MRP Scheduler Run Status</h5>
                <table class="table table-bordered" style="width:100%; text-align:center;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Status</th>
                            <th>Item</th>
                            <th>Reason</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            logs.forEach(log => {
                html += `
                    <tr>
                        <td>${log.run_date || ""}</td>
                        <td style="color:${log.status==="Success"?"green":"red"}">${log.status}</td>
                        <td>${log.item || "-"}</td>
                        <td>${log.reason || "-"}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            `;

            $("#mrp-scheduler-log").html(html);
        }
    });
}

// Call this after loading MRP table
$(document).ready(function(){
    $("#mrp-table").after('<div id="mrp-scheduler-log" style="margin-top:30px;"></div>');
    load_mrp_scheduler_log();
});

// ITEM CLICK → OPEN ITEM
$(document).on('click', '.item-link', function() {
    const item = $(this).data('item');
    frappe.set_route("Form", "Item", item);
});


// ===============================
// ITEM CLICK → OPEN ITEM
// ===============================
$(document).on('click', '.item-link', function() {
    const item = $(this).data('item');
    frappe.set_route("Form", "Item", item);
});


// ===============================
// OPEN SO QTY POPUP
// ===============================
// $(document).on('click', '.open-so-link', function() {
//     const item = $(this).data('item');

//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_sales_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {

//             let so_list = r.message || [];

//             // Only pending qty
//             so_list = so_list.filter(so => Number(so.pending_qty || so.qty) > 0);

//             if(!so_list.length){
//                 frappe.msgprint("No Open Sales Orders for this Item");
//                 return;
//             }

//             let content = `<ul>`;
//             so_list.forEach(so => {
//                 content += `
//                     <li>
//                         <a href="javascript:void(0);" 
//                            onclick="frappe.set_route('Form','Sales Order','${so.sales_order}')"
//                            style="color:#007bff;">
//                             ${so.sales_order}
//                         </a>
//                         &nbsp; → &nbsp; ${so.pending_qty || so.qty}
//                     </li>`;
//             });
//             content += `</ul>`;
            


//             new frappe.ui.Dialog({
//                 title:`Open Sales Orders for ${item}`,
//                 fields:[{ fieldtype:'HTML', fieldname:'list', options:content }]
//             }).show();
//         }
//     });
// });
$(document).on('click', '.open-so-link', function() {
    const item = $(this).data('item');

    frappe.call({
        method: "renu_customization.renu_customization.page.mrp.mrp.get_sales_orders_for_item",
        args: { item_code: item },
        callback: function(r) {

            let so_list = r.message || [];

            if(!so_list.length){
                frappe.msgprint("No Open Sales Orders for this Item");
                return;
            }

            let content = `
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Sales Order</th>
                            <th style="text-align:right;">Order Qty</th>
                            <th style="text-align:right;">Delivered Qty</th>
                            <th style="text-align:right;">Open Qty</th>
                            <th>Delivery Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            so_list.forEach(so => {
                content += `
                    <tr>
                        <td>
                            <a href="javascript:void(0);" 
                                onclick="frappe.set_route('Form','Sales Order','${so.sales_order}')"
                                style="color:#007bff;">
                                ${so.sales_order}
                            </a>
                        </td>
                        <td style="text-align:right;">${so.qty}</td>
                        <td style="text-align:right;">${so.delivered_qty}</td>
                        <td style="text-align:right;">${so.pending_qty}</td>
                        <td>${so.delivery_date || "-"}</td>
                    </tr>
                `;
            });

            content += `
                    </tbody>
                </table>
            `;

            new frappe.ui.Dialog({
                title:`Open Sales Orders for ${item}`,
                fields:[{ fieldtype:'HTML', fieldname:'list', options:content }],
                size: 'large'
            }).show();
        }
    });
});


// ===============================
// OPEN PO QTY POPUP
// ===============================
// $(document).on('click', '.open-po-link', function() {
//     const item = $(this).data('item');

//     frappe.call({
//         method: "renu_customization.renu_customization.page.mrp.mrp.get_purchase_orders_for_item",
//         args: { item_code: item },
//         callback: function(r) {

//             let po_list = r.message || [];

//             // Only pending qty
//             po_list = po_list.filter(po => Number(po.pending_qty || po.qty) > 0);

//             if(!po_list.length){
//                 frappe.msgprint("No Open Purchase Orders for this Item");
//                 return;
//             }

//             let content = `<ul>`;
//             po_list.forEach(po => {
//                 content += `
//                     <li>
//                         <a href="javascript:void(0);" 
//                            onclick="frappe.set_route('Form','Purchase Order','${po.purchase_order}')"
//                            style="color:#007bff;">
//                             ${po.purchase_order}
//                         </a>
//                         &nbsp; → &nbsp; ${po.pending_qty || po.qty}
//                     </li>`;
//             });
//             content += `</ul>`;

//             new frappe.ui.Dialog({
//                 title:`Open Purchase Orders for ${item}`,
//                 fields:[{ fieldtype:'HTML', fieldname:'list', options:content }]
//             }).show();
//         }
//     });
// });
// ===============================
// OPEN PO QTY POPUP
// ===============================
$(document).on('click', '.open-po-link', function() {
    const item = $(this).data('item');

    frappe.call({
        method: "renu_customization.renu_customization.page.mrp.mrp.get_purchase_orders_for_item",
        args: { item_code: item },
        callback: function(r) {

            let po_list = r.message || [];

            if(!po_list.length){
                frappe.msgprint("No Open Purchase Orders for this Item");
                return;
            }

            let content = `
                <table class="table table-bordered">
                    <thead>
                        <tr>
                            <th>Purchase Order</th>
                            <th style="text-align:right;">Order Qty</th>
                            <th style="text-align:right;">Received Qty</th>
                            <th style="text-align:right;">Open Qty</th>
                            <th>Schedule Date</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            po_list.forEach(po => {
                content += `
                    <tr>
                        <td>
                            <a href="javascript:void(0);"
                                onclick="frappe.set_route('Form','Purchase Order','${po.purchase_order}')"
                                style="color:#007bff;">
                                ${po.purchase_order}
                            </a>
                        </td>
                        <td style="text-align:right;">${po.qty}</td>
                        <td style="text-align:right;">${po.received_qty}</td>
                        <td style="text-align:right;">${po.pending_qty}</td>
                        <td>${po.schedule_date || "-"}</td>
                    </tr>
                `;
            });

            content += `
                    </tbody>
                </table>
            `;

            new frappe.ui.Dialog({
                title:`Open Purchase Orders for ${item}`,
                fields:[{ fieldtype:'HTML', fieldname:'list', options:content }],
                size: 'large'
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
    } 
    else {
        steps.push(`<li>Rule 1: On Hand (${on_hand}) = Safety Stock (${safety}) → FALSE</li>`);
    }

    if(gross <= 0) {
        steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → TRUE → Planned Qty = 0</li>`);
    } 
    else {
        steps.push(`<li>Rule 2: Gross Requirement (${gross}) ≤ 0 → FALSE</li>`);
    }

    if(gross < moq) {
        steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${moq}) → TRUE → Planned Qty = MOQ (${moq})</li>`);
    } 
    else {
        steps.push(`<li>Rule 3: Gross Requirement (${gross}) < MOQ (${gross}) → FALSE</li>`);
    }

    if(gross >= moq) {
        steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → TRUE → Planned Qty = Gross Requirement (${gross})</li>`);
    } else {
        steps.push(`<li>Rule 4: Gross Requirement (${gross}) ≥ MOQ (${moq}) → FALSE</li>`);
    }

    const content = `
        <p><b>Planned Purchase Qty Decision Logic</b></p>
        <ol>${steps.join("")}</ol>

        <p><b>Final Planned to Purchase Qty = ${planned}</b></p>
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
            item: row.find("td:eq(0)").text().trim(),
            planned_qty: Number(row.find(".planned-purchase-link").text())
        });
    });

    if(selected_items.length === 0){
        frappe.msgprint("Please select at least one item");
        return;
    }
     // 🔴 CHECK ITEM RATE BEFORE SENDING TO SERVER
    let zero_rate_items = [];
    selected_items.forEach(d => {
        frappe.call({
            method: "frappe.client.get_value",
            args: {
                doctype: "Item Price",
                filters: { item_code: d.item },
                fieldname: "price_list_rate"
            },
            async: false,
            callback: function(r) {
                let rate = r.message?.price_list_rate || 0;
                if (rate <= 0) zero_rate_items.push(d.item);
            }
        });
    });

    if (zero_rate_items.length > 0) {
        frappe.msgprint(`Cannot create PO. Rate set as 0 or less than 0 in Price List (≤ 0) for: ${zero_rate_items.join(", ")}`);
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

