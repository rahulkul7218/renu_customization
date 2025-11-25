 
// Copyright (c) 2025, sagar and contributors
// For license information, please see license.txt
 
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
                    "Cancelled",
                    "Closed",
                ];
 
                return status_list
                    .filter(s => !txt || s.toLowerCase().includes(txt.toLowerCase()))
                    .map(s => ({ value: s, description: s }));
            },
        },
           
        {
            fieldname: "creation_no",
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
 
 
 
};
 
 
 