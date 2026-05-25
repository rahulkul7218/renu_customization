frappe.query_reports["Purchase Order Report"] = {

    filters: [

        {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "MultiSelectList",
            get_data: function (txt) {
                const status_list = [
                    "On Hold",
                    "To Receive and Bill",
                    "To Bill",
                    "To Receive",
                    "Completed",
                    "Delivered"
                ];

                return status_list
                    .filter(s => !txt || s.toLowerCase().includes(txt.toLowerCase()))
                    .map(s => ({ value: s, description: s }));
            },
        },

        {
            fieldname: "po_no",
            label: "PO No",
            fieldtype: "Link",
            options: "Purchase Order"
        },
        {
            fieldname: "from_date",
            label: "From Date",
            fieldtype: "Date",
        },
        {
            fieldname: "to_date",
            label: "To Date",
            fieldtype: "Date",
        },
        {
            fieldname: "supplier_name",
            label: "Supplier Name",
            fieldtype: "Link",
            options: "Supplier"
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
        },
        {
            fieldname: "current_datetime",
            label: "Current Date & Time",
            fieldtype: "Data",
            read_only: 1,
            hidden: 1,
            default: function () {
                return frappe.datetime.now_datetime().replace(/\n/g, "").trim();
            }
        }
    ],

    onload: function (report) {
        report.set_filter_value(
            "current_datetime",
            frappe.datetime.now_datetime().replace(/\n/g, "").trim()
        );

        // Add custom export button
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
                        method: "renu_customization.renu_customization.report.purchase_order_report.purchase_order_report.download_xlsx",
                        args: { filters },
                        callback(r) {
                            if (r.message) {
                                let a = document.createElement("a");
                                a.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + r.message;
                                a.download = "Purchase_Order_Report.xlsx";
                                a.click();
                            }
                        }
                    });
                    d.hide();
                }
            });

            d.show();
        });
    },

    refresh: function (report) {
        report.set_filter_value(
            "current_datetime",
            frappe.datetime.now_datetime().replace(/\n/g, "").trim()
        );
    }
};

// ---------------------------------------------------------
// ----------------- ADDED CSS STYLES ----------------------
// ---------------------------------------------------------

frappe.dom.set_style(`
    [data-fieldname="order_quantity"],
    [data-fieldname="delivered_qty"],
    [data-fieldname="returned_qty"],
    [data-fieldname="open_qty"],
    [data-fieldname="item_rate"],
    [data-fieldname="exchange_rate"],
    [data-fieldname="total_net_amount_(inr)"],
    [data-fieldname="delivered_net_total"],
    [data-fieldname="balance_net_total"] {
        text-align: right !important;
    }

    /* Hide totals for Item Rate and Exchange Rate */
    .slick-footer-row [data-fieldname="item_rate"],
    .slick-footer-row [data-fieldname="exchange_rate"],
    .slick-footer-row .cell-item_rate,
    .slick-footer-row .cell-exchange_rate,
    .dt-row-total [data-fieldname="item_rate"],
    .dt-row-total [data-fieldname="exchange_rate"],
    .dt-total-row [data-fieldname="item_rate"],
    .dt-total-row [data-fieldname="exchange_rate"] {
        color: transparent !important;
        font-size: 0 !important;
    }
`);
