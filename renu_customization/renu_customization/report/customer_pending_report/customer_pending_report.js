// Copyright (c) 2025, Assimilate Technologies Pvt Ltd and contributors
// For license information, please see license.txt


frappe.query_reports["Customer Pending Report"] = {
    filters: [
        {
            fieldname: "creation_no",
            label: "Creation No",
            fieldtype: "Link",
            options: "Sales Order",
            reqd: 0
        },
        {
            fieldname: "from_date",
            label: "From Creation Date",
            fieldtype: "Date",
        },
        {
            fieldname: "to_date",
            label: "To Creation Date",
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
    ]
};
 
