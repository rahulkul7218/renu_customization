# Copyright (c) 2025, Assimilate Technologies Pvt Ltd and contributors
# For license information, please see license.txt


import frappe
 
def execute(filters=None):

    if not filters:

        filters = {}
 
    conditions = ""
 
    
 
    if filters.get("customer_name"):

        filters["customer_name"] = f"%{filters['customer_name']}%"

        conditions += " AND c.customer_name LIKE %(customer_name)s"
 
    if filters.get("invoice_id"):

        conditions += " AND si.name = %(invoice_id)s"
 
    # Date filters

    if filters.get("from_date") and filters.get("to_date"):

        conditions += " AND si.posting_date BETWEEN %(from_date)s AND %(to_date)s"

    elif filters.get("from_date"):

        conditions += " AND si.posting_date >= %(from_date)s"

    elif filters.get("to_date"):

        conditions += " AND si.posting_date <= %(to_date)s"
 
    if filters.get("currency"):

        conditions += " AND si.currency = %(currency)s"
 
    
 
    query = f"""

        SELECT

            IFNULL(c.customer_code, '') AS customer_code,

            c.customer_name AS customer_name,

            si.name AS invoice_id,

            si.posting_date AS invoice_date,
 
            FORMAT(si.grand_total, 2) AS invoice_value,

            si.outstanding_amount * si.conversion_rate AS outstanding,
             
 
            si.currency AS currency,

            si.conversion_rate AS exchange_rate,

            FORMAT(si.base_grand_total, 2) AS inr_value_of_foreign,
 
            si.due_date AS payment_due_date,

            DATEDIFF(CURDATE(), si.posting_date) AS invoice_age,

            si.po_no AS po_no,

            c.business_region_name AS business_region_name,
 
            (

                SELECT GROUP_CONCAT(st.sales_person SEPARATOR ', ')

                FROM `tabSales Team` st

                WHERE st.parent = si.name

            ) AS sales_person,
 
            CASE

                WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic'

                ELSE 'Export'

            END AS domestic_export
 
        FROM `tabSales Invoice` si

        LEFT JOIN `tabCustomer` c ON c.name = si.customer

        LEFT JOIN `tabSales Invoice Item` sii ON sii.parent = si.name

        LEFT JOIN `tabItem` i ON i.name = sii.item_code

        LEFT JOIN `tabCurrency` cu ON cu.name = si.currency

        LEFT JOIN `tabAddress` a ON a.name = si.customer_address
 
        WHERE si.docstatus = 1 {conditions}
 
        GROUP BY si.name
        ORDER BY si.posting_date ASC   --  ✅ CHANGED HERE (ASC)

    """
 
    data = frappe.db.sql(query, filters, as_dict=True)
 
    columns = [

        {"label": "Customer Code", "fieldname": "customer_code", "fieldtype": "Data", "width": 100},

        {"label": "Customer Name", "fieldname": "customer_name", "fieldtype": "Data", "width": 200},

        {"label": "Invoice ID", "fieldname": "invoice_id", "fieldtype": "Link", "options": "Sales Invoice", "width": 150},

        {"label": "Invoice Date", "fieldname": "invoice_date", "fieldtype": "Date", "width": 140},
 
        {"label": "Invoice Value", "fieldname": "invoice_value", "fieldtype": "Float", "width": 150},

        {"label": "Outstanding Amount (INR)", "fieldname": "outstanding", "fieldtype": "Float", "width": 170},
 
        {"label": "Currency", "fieldname": "currency", "fieldtype": "Data", "width": 140},

        {"label": "Exchange Rate", "fieldname": "exchange_rate", "fieldtype": "Data", "width": 140},

        {"label": "INR Value Of Foreign", "fieldname": "inr_value_of_foreign", "fieldtype": "Float", "width": 170},
 
        {"label": "Payment Due Date", "fieldname": "payment_due_date", "fieldtype": "Date", "width": 160},

        {"label": "Invoice Age", "fieldname": "invoice_age", "fieldtype": "Int", "width": 120},

        {"label": "Customer's PO No.", "fieldname": "po_no", "fieldtype": "Data", "width": 160},
 
        {"label": "Business Region Name", "fieldname": "business_region_name", "fieldtype": "Data", "width": 140},

        {"label": "Sales Person", "fieldname": "sales_person", "fieldtype": "Data", "width": 200},

        {"label": "Domestic/Export", "fieldname": "domestic_export", "fieldtype": "Data", "width": 150}

    ]
 
    return columns, data

 