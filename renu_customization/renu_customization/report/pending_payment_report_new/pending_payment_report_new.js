frappe.query_reports["Pending Payment Report-New"] = {

    filters: [
        {
            fieldname: "customer_name",
            label: "Customer Name",
            fieldtype: "Link",
            options: "Customer"
        },
        {
            fieldname: "invoice_id",
            label: "Invoice ID",
            fieldtype: "Link",
            options: "Sales Invoice"
        },
        {
            fieldname: "from_date",
            label: "Invoice From Date",
            fieldtype: "Date"
        },
        {
            fieldname: "to_date",
            label: "Invoice To Date",
            fieldtype: "Date"
        },
        {
            fieldname: "currency",
            label: "Currency",
            fieldtype: "Link",
            options: "Currency"
        }
    ],

    // -------------------------------------------------------
    //  NUMERIC COMMA FORMATTING IN UI
    // -------------------------------------------------------
    formatter: function (value, row, column, data, default_formatter) {

        const numeric_fields = [
            "invoice_value",
            "outstanding",
            "exchange_rate",
            "inr_value_of_foreign",
            "invoice_age"
        ];

        if (numeric_fields.includes(column.fieldname)) {

            let num = parseFloat(value || 0);

            let formatted = num.toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });

            return `<div style="text-align: right;">${formatted}</div>`;
        }

        return default_formatter(value, row, column, data);
    },

    // -------------------------------------------------------
    //  CUSTOM EXPORT BUTTON
    // -------------------------------------------------------
    onload: function (report) {

        report.page.add_inner_button(__('Export with Formatting'), function () {

            const filters = report.get_values();

            let d = new frappe.ui.Dialog({
                title: __("Export Pending Payment Report-New"),
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
                primary_action: function (values) {

                    frappe.call({
                        method: "renu_customization.renu_customization.report.pending_payment_report_new.pending_payment_report_new.download_xlsx",
                        args: {
                            filters: filters
                        },
                        callback: function (r) {
                            if (r.message) {

                                let a = document.createElement("a");
                                a.href =
                                    "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," +
                                    r.message;
                                a.download = "Pending_Payment_Report.xlsx";
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