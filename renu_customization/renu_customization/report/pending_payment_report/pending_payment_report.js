frappe.query_reports["Pending Payment Report"] = {
    filters: [
        
        {
            fieldname: "customer_name",
            label: "Customer Name",
            fieldtype: "Link",
            options: "Customer",
            reqd: 0
        },
        {
            fieldname: "invoice_id",
            label: "Invoice ID",
            fieldtype: "Link",
            options: "Sales Invoice",
            reqd: 0
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
            options: "Currency",
            reqd: 0
        },
         // HIDDEN: Report Name
        {
            fieldname: "report_name",
            label: "Report Name",
            fieldtype: "Data",
            default: "Pending Payment Report",
            read_only: 1,
            hidden: 1
        },
 
        // HIDDEN: Current Live Date-Time
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
    // MERGED ONLOAD
    onload: function (report) {
 
        // --- Set safe datetime without newline ---
        report.set_filter_value(
            "current_datetime",
            frappe.datetime.now_datetime().replace(/\n/g, "").trim()
        );
 
        // --- Auto-select "Include Filters" checkbox in Export Dialog ---
        const observer = new MutationObserver(() => {
            const include_chk = document.querySelector('input[data-fieldname="include_filters"]');
            if (include_chk && !include_chk.checked) {
                include_chk.checked = true;
            }
        });
 
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    },
 
    // Refresh also updates live datetime
    refresh: function (report) {
        report.set_filter_value(
            "current_datetime",
            frappe.datetime.now_datetime().replace(/\n/g, "").trim()
        );
    }
 
};
 
 