// frappe.query_reports["Sales Order Report"] = {
//     filters: [
//         {
//             fieldname: "status",
//             label: __("Status"),
//             fieldtype: "MultiSelectList",
//             get_data: function (txt) {
//                 const status_list = [
//                     "Draft",
//                     "On Hold",
//                     "To Deliver and Bill",
//                     "To Bill",
//                     "To Deliver",
//                     "Completed",
//                     "Cancelled",
//                     "Closed",
//                 ];
 
//                 return status_list
//                     .filter(s => !txt || s.toLowerCase().includes(txt.toLowerCase()))
//                     .map(s => ({ value: s, description: s }));
//             },
//         },
           
//         {
//             fieldname: "creation_no",
//             label: "SO No",
//             fieldtype: "Link",
//             options: "Sales Order"
//         },
//         {
//             fieldname: "from_date",
//             label: "From SO Date",
//             fieldtype: "Date",
//         },
//         {
//             fieldname: "to_date",
//             label: "To SO Date",
//             fieldtype: "Date",
//         },
     
//         {
//             fieldname: "customer_name",
//             label: "Customer Name",
//             fieldtype: "Link",
//             options: "Customer"
//         },
//         {
//             fieldname: "item_code",
//             label: "Item Code",
//             fieldtype: "Link",
//             options: "Item"
//         },
//         {
//             fieldname: "currency",
//             label: "Currency",
//             fieldtype: "Link",
//             options: "Currency"
//         },
//         {
//             fieldname: "report_name",
//             label: "Report Name",
//             fieldtype: "Data",
//             default: "Sales Order Report",
//             read_only: 1,
//             hidden: 1
//         },
 
//         // HIDDEN: Current Live Date-Time
//         {
//             fieldname: "current_datetime",
//             label: "Current Date & Time",
//             fieldtype: "Data",
//             read_only: 1,
//             hidden: 1,
//             default: function () {
//                 return frappe.datetime.now_datetime().replace(/\n/g, "").trim();
//             }
//         }
//     ],
//     onload: function (report) {
 
//         // --- Set safe datetime without newline ---
//         report.set_filter_value(
//             "current_datetime",
//             frappe.datetime.now_datetime().replace(/\n/g, "").trim()
//         );
 
//         // --- Auto-select "Include Filters" checkbox in Export Dialog ---
//         const observer = new MutationObserver(() => {
//             const include_chk = document.querySelector('input[data-fieldname="include_filters"]');
//             if (include_chk && !include_chk.checked) {
//                 include_chk.checked = true;
//             }
//         });
 
//         observer.observe(document.body, {
//             childList: true,
//             subtree: true
//         });
//     },
 
//     // Refresh also updates live datetime
//     refresh: function (report) {
//         report.set_filter_value(
//             "current_datetime",
//             frappe.datetime.now_datetime().replace(/\n/g, "").trim()
//         );
//     }
 
 
 
// };
 
 


frappe.query_reports["Sales Order Report"] = {

    filters: [

        {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "MultiSelectList",
            get_data: function (txt) {
                const status_list = [
                    "Draft",
                    "On Hold",
                    "To Deliver and Bill",
                    "To Bill",
                    "To Deliver",
                    "Completed",
                    
                    "Closed",
                ];

                return status_list
                    .filter(s => !txt || s.toLowerCase().includes(txt.toLowerCase()))
                    .map(s => ({ value: s, description: s }));
            },
        },

        {
            fieldname: "so_no",
            label: "SO No",
            fieldtype: "Link",
            options: "Sales Order"
        },
        {
            fieldname: "from_date",
            label: "From SO Date",
            fieldtype: "Date",
        },
        {
            fieldname: "to_date",
            label: "To SO Date",
            fieldtype: "Date",
        },

        // {
        //     fieldname: "customer_code",
        //     label: "Customer Code",
        //     fieldtype: "Link",
        //     options: "Customer"
        // },
        {
            fieldname: "customer_name",
            label: "Customer Name",
            fieldtype: "Link",
            options: "Customer"
        },

        {
            fieldname: "item_code",
            label: "Item Code",
            fieldtype: "Link",
            options: "Item"
        },
        {
            fieldname: "currency",
            label: "Currency",
            fieldtype: "Link",
            options: "Currency"
        }
    ],

    onload: function (report) {
        report.set_filter_value(
            "current_datetime",
            frappe.datetime.now_datetime().replace(/\n/g, "").trim()
        );
    },

    refresh: function (report) {
        report.set_filter_value(
            "current_datetime",
            frappe.datetime.now_datetime().replace(/\n/g, "").trim()
        );
    }
};


// ---------------------------------------------------------
// ----------------- ADDED EXPORT BUTTON -------------------
// ---------------------------------------------------------

frappe.dom.set_style(`
    [data-fieldname="po_qty"],
    [data-fieldname="delivered_qty"],
    [data-fieldname="open_qty"],
    [data-fieldname="item_rate"],
    [data-fieldname="exchange_rate"],
    [data-fieldname="po_total"],
    [data-fieldname="delivered_net_total_inr"],
    [data-fieldname="balance_net_total_inr"],
    [data-fieldname="stock"] {
        text-align: right !important;
    }
        
`);


frappe.query_reports["Sales Order Report"].onload = function (report) {

    report.page.add_inner_button("Export with Formatting", function () {
        const filters = report.get_values();

        let d = new frappe.ui.Dialog({
            title: __("Export Report"),
            fields: [
                {
                    fieldname: 'include_filters',
                    fieldtype: 'Check',
                    label: __('Include Filters'),
                    default: 1,
                    read_only: 1

                }
            ],
            primary_action_label: __('Download'),
            primary_action(values) {

                frappe.call({
                    method: "renu_customization.renu_customization.report.sales_order_report.sales_order_report.download_xlsx",
                    args: { filters },
                    callback(r) {

                        if (r.message) {
                            let a = document.createElement("a");
                            a.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + r.message;
                            a.download = "Sales_Order_Report.xlsx";
                            a.click();
                        }
                    }
                });

                d.hide();
            }
        });

        d.show();
    });
    
};

