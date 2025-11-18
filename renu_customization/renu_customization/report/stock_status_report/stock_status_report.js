frappe.query_reports["Stock Status Report"] = {
    filters: [
        {
            fieldname: "item",
            label: "Item",
            fieldtype: "Link",
            options: "Item",
            reqd: 0
        }
    ]
};
 