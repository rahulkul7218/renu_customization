


import frappe

from frappe import _
 
def execute(filters=None):

    columns = get_columns()

    data = get_data(filters)

    return columns, data
 
 
def get_columns():

    return [

        _("SO No") + ":Link/Sales Order:150",

        _("SO Date") + ":Date:120",

        _("Sr.No.") + ":Int:70",

        _("Customer's PO No.") + ":Data:170",

        _("Customer's PO Date") + ":Date:170",

        _("Customer Code") + ":Link/Customer:150",

        _("Customer Name") + ":Data:180",

        _("Party Item Code") + ":Link/Item:150",

        _("Item Code") + ":Link/Item:120",

        _("Item Name") + ":Data:180",

        _("Description") + ":Data:250",

        _("PO Quantity") + ":Float:120",

        _("Available Qty") + ":Float:120",

        _("PO Delivered Qty") + ":Float:120",

        _("PO Open Qty") + ":Float:120",

        

        _("Item Rate") + ":Float:120",

        _("Currency") + ":Link/Currency:100",

        _("Exchange Rate") + ":Float:150",

        _("Amount (INR)") + ":Float:120",

        _("Invoice Grand Total (INR)") + ":Float:180",

        _("Outstanding Amount (INR)") + ":Float:170",

        _("Delivery Date") + ":Date:120",

        _("Stock") + ":Float:150",

        _("Business Region Name") + ":Data:190",

        _("Sales Person") + ":Link/Sales Person:150",

        _("Domestic/Export") + ":Data:150"

    ]
 
 
def get_conditions(filters):

    conditions = ""
 
    if filters.get("creation_no"):

        conditions += " AND so.name = %(creation_no)s"
 
    
 
    if filters.get("customer_name"):

        filters["customer_name"] = f"%{filters['customer_name']}%"

        conditions += " AND so.customer_name LIKE %(customer_name)s"
 
    if filters.get("item_code"):

        conditions += " AND soi.item_code = %(item_code)s"
 
    if filters.get("currency"):

        conditions += " AND so.currency = %(currency)s"
 
    # DATE FILTER - FIXED (Using creation date)

    if filters.get("from_date"):

        conditions += " AND DATE(so.creation) >= %(from_date)s"
 
    if filters.get("to_date"):

        conditions += " AND DATE(so.creation) <= %(to_date)s"
 
    return conditions
 
 
def get_data(filters):

    conditions = get_conditions(filters)
 
    sql = f"""

        SELECT

            so.name AS creation_no,

            DATE(so.creation) AS creation_date,
 
            ROW_NUMBER() OVER (PARTITION BY so.name ORDER BY soi.idx) AS sr_no,
 
            si.po_no AS po_no,

            si.po_date AS po_date,

            

            c.customer_code AS customer_code,

            so.customer_name AS customer_name,

            soi.party_item_code AS party_item_code,
 
            soi.item_code AS item_code,

            soi.item_name AS item_name,

            soi.description AS description,

            soi.qty AS po_qty,
            "" AS available_qty,

            soi.delivered_qty AS delivered_qty,
            (soi.qty - soi.delivered_qty) AS open_qty,

            

 
            soi.rate AS item_rate,

            so.currency AS currency,

            so.conversion_rate AS exchange_rate,
 
            soi.base_amount AS po_total,
 
            si.base_grand_total AS invoice_total,

            si.outstanding_amount * si.conversion_rate AS outstanding,
            
 
            so.delivery_date AS delivery_date,
 
            (SELECT IFNULL(SUM(b.actual_qty), 0)

                FROM `tabBin` b

                WHERE b.item_code = soi.item_code

            ) AS stock,
 
            c.business_region_name AS business_region,

            st.sales_person AS sales_person,
 
            CASE

                WHEN IFNULL(a.country, '') = 'India' THEN 'Domestic'

                ELSE 'Export'

            END AS domestic_export
 
        FROM `tabSales Order` so

        INNER JOIN `tabSales Order Item` soi ON soi.parent = so.name

        LEFT JOIN `tabSales Team` st ON st.parent = so.name

        LEFT JOIN `tabCustomer` c ON so.customer = c.name

        LEFT JOIN `tabAddress` a ON a.name = so.customer_address

        LEFT JOIN `tabSales Invoice Item` sii ON sii.so_detail = soi.name

        LEFT JOIN `tabSales Invoice` si ON si.name = sii.parent
 
        WHERE (so.status != "Completed" OR so.status IS NULL)
        {conditions}
 
        GROUP BY soi.name

        ORDER BY so.creation ASC, so.name ASC

    """
 
    return frappe.db.sql(sql, filters, as_list=True)
