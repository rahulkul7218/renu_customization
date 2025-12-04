// // Copyright (c) 2025, Assimilate Technologies Pvt Ltd and contributors
// // For license information, please see license.txt



 
// frappe.query_reports["Pending Sales Order Report"] = {
//     filters: [
//         {
//             fieldname: "creation_no",
//             label: "SO No",
//             fieldtype: "Link",
//             options: "Sales Order",
//             reqd: 0
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
//               fieldtype: "Link",
//             options: "Customer"
//         },
//        {
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
//             default: "Pending Sales Order Report",
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
 
 
 

frappe.query_reports["Pending Sales Order Report"] = {
    filters: [
        {
            fieldname: "creation_no",
            label: "SO No",
            fieldtype: "Link",
            options: "Sales Order"
        },
        {
            fieldname: "from_date",
            label: "From SO Date",
            fieldtype: "Date"
        },
        {
            fieldname: "to_date",
            label: "To SO Date",
            fieldtype: "Date"
        },
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
        // Add Custom Export Button
        report.page.add_inner_button("Export with Formatting", function () {
            const filters = report.get_values();

            let d = new frappe.ui.Dialog({
                title: __("Export Report"),
                fields: [
                    {
                        fieldname: "include_filters",
                        fieldtype: "Check",
                        label: __("Include Filters"),
                        default: 1,
						read_only: 1
                    }
                ],
                primary_action_label: __("Download"),
                primary_action(values) {

                    frappe.call({
                        method: "renu_customization.renu_customization.report.pending_sales_order_report.pending_sales_order_report.download_xlsx",
                        args: {
                            filters: filters
                        },
                        callback: function (r) {
                            if (r.message) {
                                let a = document.createElement("a");
                                a.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + r.message;
                                a.download = "Pending_Sales_Order_Report.xlsx";
                                document.body.appendChild(a);
                                a.click();
                                document.body.removeChild(a);
                            }
                        }
                    });

                    d.hide();
                }
            });

            d.show();
        });
    }
};


