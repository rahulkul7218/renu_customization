frappe.query_reports["Stock Status Report"] = {
    filters: [
        {
            fieldname: "item",
            label: "Item",
            fieldtype: "Link",
            options: "Item",
            reqd: 0
        },
        {
            fieldname: "report_name",
            label: "Report Name",
            fieldtype: "Data",
            default: "Stock Status Report",
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
 