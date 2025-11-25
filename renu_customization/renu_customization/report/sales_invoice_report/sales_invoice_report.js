// Copyright (c) 2025, Assimilate Technologies Pvt Ltd and contributors
// For license information, please see license.txt
 
 
 
frappe.query_reports["Sales Invoice Report"] = {
    "filters": [
 {
            fieldname: "status",
            label: __("Status"),
            fieldtype: "MultiSelectList",
            get_data: function (txt) {
                const status_list = [
                    "Draft",
                    "Return",
                    "Credit Note Issued",
					"Submitted",
					"Paid",
					"Partly Paid",
					"Unpaid",
					"Unpaid and Discounted",
					"Partly Paid and Discounted",
					"Overdue and Discounted",
					"Overdue",
					"Cancelled",
					"Internal Transfer"
                ];
 
                return status_list
                    .filter(s => !txt || s.toLowerCase().includes(txt.toLowerCase()))
                    .map(s => ({ value: s, description: s }));
            },
        },
        {
            fieldname: "invoice_id",
            label: "Invoice ID",
            fieldtype: "Link",
            options: "Sales Invoice",
            width: 200
        },
 
        {
            fieldname: "from_date",
            label: "From Invoice Date",
            fieldtype: "Date"
        },
 
        {
            fieldname: "to_date",
            label: "To Invoice Date",
            fieldtype: "Date"
        },
 
        {
            fieldname: "customer_name",
            label: "Customer Name",
            fieldtype: "Link",
            options: "Customer",
            width: 200
        },
 
        {
            fieldname: "item_code",
            label: "Item Code",
            fieldtype: "Link",
            options: "Item",
            // get_query: function() {
            //     return {
            //         query: "frappe.desk.search.search_link",
            //         filters: {
            //             from_sales_invoice_item: 1
            //         }
            //     }
            // }
        },
 
 
 
        {
            fieldname: "city",
            label: "City",
            fieldtype: "Data",
        },
 
        {
            fieldname: "state",
            label: "State",
            fieldtype: "Data"
        },
 
        {
            fieldname: "country",
            label: "Country",
            fieldtype: "Link",
            options: "Country"
        },
        {
            fieldname: "currency",
            label: "Currency",
            fieldtype: "Link",
            options: "Currency",
            reqd: 0
        }
 
    ]
};