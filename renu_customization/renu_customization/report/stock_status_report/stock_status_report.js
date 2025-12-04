// frappe.query_reports["Stock Status Report"] = {
//     filters: [
//         {
//             fieldname: "item",
//             label: "Item",
//             fieldtype: "Link",
//             options: "Item",
//             reqd: 0
//         },
//         {
//             fieldname: "report_name",
//             label: "Report Name",
//             fieldtype: "Data",
//             default: "Stock Status Report",
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





frappe.query_reports["Stock Status Report"] = {

    filters: [
        {
            fieldname: "item",
            label: "Item",
            fieldtype: "Link",
            options: "Item"
        }
    ],

    // ---------------------------------------------
    // COMMA SEPARATION + RIGHT ALIGN IN UI
    // ---------------------------------------------
    formatter(value, row, column, data, default_formatter) {

        const numeric_fields = [
            "last_purchase_rate",
            "item_available_qty",
            "safety_stock",
            "po_booking_qty",
            "open_qty",
            "free_item_qty",
            "units_sold_last_6_months"
        ];

        if (numeric_fields.includes(column.fieldname)) {

            let num = parseFloat(value || 0);

            let formatted = num.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            return `<div style="text-align:right;">${formatted}</div>`;
        }

        return default_formatter(value, row, column, data);
    },

    // ---------------------------------------------
    // EXPORT BUTTON WITH POPUP
    // ---------------------------------------------
    onload(report) {

        report.page.add_inner_button(__('Export with Formatting'), function () {

            const filters = report.get_values();

            let d = new frappe.ui.Dialog({
                title: __("Export Stock Status Report"),
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
                        method: "renu_customization.renu_customization.report.stock_status_report.stock_status_report.download_xlsx",
                        args: { filters: filters },
                        callback: function (r) {
                            if (r.message) {

                                let a = document.createElement("a");
                                a.href =
                                    "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
                                    r.message;
                                a.download = "Stock_Status_Report.xlsx";

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

