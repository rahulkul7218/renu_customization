


frappe.query_reports["Customer Pending Report"] = {
    filters: [
        {
            fieldname: "creation_no",
            label: "SO No",
            fieldtype: "Link",
            options: "Sales Order",
            reqd: 0
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
    ]
};
 
