# Copyright (c) 2025, Assimilate Technologies Pvt Ltd and contributors
# For license information, please see license.txt

# import frappe


import frappe
 
def execute(filters=None):
    if not filters:
        filters = {}
 
    conditions = " WHERE 1=1 "
 
    # Invoice ID Filter
    if filters.get("invoice_id"):
        conditions += " AND si.name = %(invoice_id)s"
 
    # Invoice Date From
    if filters.get("from_date"):
        conditions += " AND si.posting_date >= %(from_date)s"
 
    # Invoice Date To
    if filters.get("to_date"):
        conditions += " AND si.posting_date <= %(to_date)s"
 
    # Customer Name
    if filters.get("customer_name"):
        conditions += " AND si.customer_name LIKE %(customer_name)s"
 
    # Item Code
    if filters.get("item_code"):
        conditions += " AND sii.item_code = %(item_code)s"

    # Currency
    if filters.get("currency"):
        conditions += " AND si.currency = %(currency)s"
 
    
 
    # City
    if filters.get("city"):
        conditions += " AND ad.city LIKE %(city)s"
 
    # State
    if filters.get("state"):
        conditions += " AND ad.state LIKE %(state)s"
 
    # Country
    if filters.get("country"):
        conditions += " AND ad.country LIKE %(country)s"
 
 
    # ---------------------------
    # Define columns (REQUIRED)
    # ---------------------------
    columns = [
        {"label": "Invoice ID", "fieldname": "invoice_id", "fieldtype": "Link", "options": "Sales Invoice", "width": 120},
        {"label": "Invoice Date", "fieldname": "invoice_date", "fieldtype": "Date", "width": 120},
        {"label": "Sr.No.", "fieldname": "sr_no", "fieldtype": "Int", "width": 70},
        {"label": "Customer PO No.", "fieldname": "po_no", "fieldtype": "Data", "width": 150},
        {"label": "Customer PO Date", "fieldname": "po_date", "fieldtype": "Date", "width": 150},
 
        {"label": "Order ID No.", "fieldname": "order_id_no", "fieldtype": "Link", "options": "Sales Order", "width": 150},
        {"label": "Order ID Date", "fieldname": "order_id_date", "fieldtype": "Date", "width": 150},
 
        {"label": "Customer Code", "fieldname": "customer_code", "fieldtype": "Data", "width": 150},
        {"label": "Customer Name", "fieldname": "customer_name", "fieldtype": "Data", "width": 150},
 
        {"label": "Party Item Code", "fieldname": "party_item_code", "fieldtype": "Data", "width": 150},
        {"label": "Item Code", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 120},
        {"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 140},
        {"label": "Item Description", "fieldname": "description", "fieldtype": "Data", "width": 220},
        {"label": "Qty", "fieldname": "qty", "fieldtype": "Float", "width": 80},
 
        {"label": "Item Rate", "fieldname": "item_rate", "fieldtype": "Float", "width": 120},
        {"label": "Amount", "fieldname": "amount", "fieldtype": "Float", "width": 120},
        {"label": "Currency", "fieldname": "currency", "fieldtype": "Data", "width": 120},
        {"label": "Exchange Rate", "fieldname": "exchange_rate", "fieldtype": "Float", "width": 140},
        {"label": "Amount (INR)", "fieldname": "base_amount", "fieldtype": "Float", "width": 120},
 
        {"label": "Delivery Date", "fieldname": "delivery_date", "fieldtype": "Date", "width": 120},
 
        {"label": "Business Region Name", "fieldname": "business_region_name", "fieldtype": "Data", "width": 190},
        {"label": "City", "fieldname": "city", "fieldtype": "Data", "width": 120},
        {"label": "State", "fieldname": "state", "fieldtype": "Data", "width": 120},
        {"label": "Country", "fieldname": "country", "fieldtype": "Data", "width": 120},
        {"label": "Sales Person", "fieldname": "sales_person", "fieldtype": "Data", "width": 150},
 
        {"label": "Domestic/Export", "fieldname": "dom_exp", "fieldtype": "Data", "width": 150},
        {"label": "Item Purchase Rate", "fieldname": "item_purchase_rate", "fieldtype": "Float", "width": 180},
        {"label": "OldNewFlg", "fieldname": "old_new_flg", "fieldtype": "Data", "width": 100},
        {"label": "Business Activity", "fieldname": "business_activity", "fieldtype": "Data", "width": 150},
        {"label": "Business Vertical", "fieldname": "business_vertical", "fieldtype": "Data", "width": 150},
    ]
 
 
    # ---------------------
    # SQL Query
    # ---------------------
    query = f"""
        SELECT
            si.name AS invoice_id,
            si.posting_date AS invoice_date,
           ROW_NUMBER() OVER (PARTITION BY so.name ORDER BY soi.idx) AS sr_no,
 
            si.po_no AS po_no,
            si.po_date AS po_date,
 
            so.name AS order_id_no,
            so.transaction_date AS order_id_date,
 
            c.customer_code AS customer_code,
            si.customer_name AS customer_name,
 
            sii.party_item_code AS party_item_code,
            sii.item_code AS item_code,
            sii.item_name AS item_name,
            sii.description AS description,
            sii.qty AS qty,
 
            FORMAT(sii.rate, 2, 'en_IN') AS item_rate,
            FORMAT(sii.amount, 2, 'en_IN') AS amount,
            si.currency AS currency,
            si.conversion_rate AS exchange_rate,
            FORMAT(sii.base_amount, 2, 'en_IN') AS base_amount,
 
            dn.posting_date AS delivery_date,
 
            c.business_region_name AS business_region_name,
            ad.city AS city,
            ad.state AS state,
            ad.country AS country,
            st.sales_person AS sales_person,
 
            CASE WHEN ad.country = 'India' THEN 'Domestic' ELSE 'Export' END AS dom_exp,
 
            (
            SELECT 
                FORMAT(IFNULL(sle.incoming_rate, 0), 2, 'en_IN')
            FROM `tabStock Ledger Entry` sle
            WHERE sle.item_code = sii.item_code
            AND sle.actual_qty > 0           -- Only incoming entries
            ORDER BY sle.posting_date DESC, sle.posting_time DESC
            LIMIT 1
        ) AS item_purchase_rate,

            '' AS old_new_flg,
            '' AS business_activity,
            '' AS business_vertical
 
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
 
        LEFT JOIN `tabSales Order Item` soi ON soi.name = sii.so_detail
        LEFT JOIN `tabSales Order` so ON so.name = soi.parent
 
        LEFT JOIN `tabDynamic Link` dl ON dl.link_name = si.customer
            AND dl.link_doctype = 'Customer'
            AND dl.parenttype = 'Address'
 
        LEFT JOIN `tabAddress` ad ON ad.name = dl.parent
 
        LEFT JOIN `tabCustomer` c ON c.name = si.customer
 
        LEFT JOIN `tabSales Team` st ON st.parent = si.name
 
        LEFT JOIN `tabItem Price` ip ON ip.item_code = sii.item_code
            AND ip.buying = 1 AND ip.selling = 0
 
        LEFT JOIN `tabDelivery Note Item` dni ON sii.dn_detail = dni.name
        LEFT JOIN `tabDelivery Note` dn ON dn.name = dni.parent
 
        {conditions}
        ORDER BY si.posting_date ASC, si.name ASC
    """
 
    data = frappe.db.sql(query, filters, as_dict=1)
    return columns, data
 
 