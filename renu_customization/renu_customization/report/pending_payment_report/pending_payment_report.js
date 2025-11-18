// Copyright (c) 2025, Assimilate Technologies Pvt Ltd and contributors
// For license information, please see license.txt

// frappe.query_reports["Pending Payment Report"] = {
// 	"filters": [

// 	]
// };


 
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
        {
            fieldname: "po_no",
            label: "Customer's PO No",
            fieldtype: "Data",
            reqd: 0
        }
    ]
};
 
 