import frappe

def execute(filters=None):
    filters = filters or {}

    item_filter = filters.get("item")

    conditions = "WHERE it.is_stock_item = 1"
    values = {}

    if item_filter:
        conditions = "WHERE it.item_code = %(item)s"
        values["item"] = item_filter

    query = f"""
        SELECT
            it.item_code,
            it.item_name,
            it.description,
           

            /* Latest Purchase Rate */
            # (
            #     SELECT ip.price_list_rate
            #     FROM `tabItem Price` ip
            #     WHERE ip.item_code = it.item_code
            #       AND ip.buying = 1
            #     ORDER BY ip.modified DESC
            #     LIMIT 1
            # ) AS last_purchase_rate,

            FORMAT((
                SELECT ip.price_list_rate
                FROM `tabItem Price` ip
                WHERE ip.item_code = it.item_code
                  AND ip.buying = 1
                ORDER BY ip.modified DESC
                LIMIT 1
            ), 2, 'en_IN') AS last_purchase_rate,

            /* Available Qty */
            IFNULL(SUM(bin.actual_qty), 0) AS item_available_qty,

            it.safety_stock,

            /* PO Booking Qty = Total ordered qty */
            IFNULL((
                SELECT SUM(IFNULL(poi.qty, 0))
                FROM `tabSales Order Item` poi
                INNER JOIN `tabSales Order` po ON poi.parent = po.name
                WHERE poi.item_code = it.item_code
                AND po.docstatus = 1
                AND po.status NOT IN ('Stopped', 'Cancelled')
            ), 0) AS po_booking_qty,

            /* Open PO Qty FIXED = SUM(poi.open_qty) */
            /* Correct Open PO Qty = SUM(qty - received_qty) */
            IFNULL((
    SELECT SUM(
        (IFNULL(soi.qty, 0) - IFNULL(soi.delivered_qty, 0))
    )
    FROM `tabSales Order Item` soi
    INNER JOIN `tabSales Order` so ON soi.parent = so.name
    WHERE soi.item_code = it.item_code
      AND so.docstatus = 1
      AND so.status NOT IN ('Closed', 'Cancelled', 'Completed')
), 0) AS open_qty,



            /* Free Qty = Stock - Pending purchase orders */
(
    IFNULL(SUM(bin.actual_qty), 0) -
    IFNULL((
        SELECT SUM(GREATEST(0, soi.qty))
        FROM `tabSales Order Item` soi
        INNER JOIN `tabSales Order` so ON soi.parent = so.name
        WHERE soi.item_code = it.item_code
          AND so.docstatus = 1
          AND so.status NOT IN ('Closed', 'Cancelled')
    ), 0)
) AS free_item_qty,


            /* Units Sold (Last 6 Months) */
            IFNULL((
                SELECT SUM(sii.qty)
                FROM `tabSales Invoice Item` sii
                INNER JOIN `tabSales Invoice` si ON sii.parent = si.name
                WHERE sii.item_code = it.item_code
                  AND si.docstatus = 1
                  AND si.posting_date >= (CURDATE() - INTERVAL 6 MONTH)
            ), 0) AS units_sold_last_6_months

        FROM `tabItem` it
        LEFT JOIN `tabBin` bin ON bin.item_code = it.item_code

        {conditions}

        GROUP BY it.item_code, it.item_name, it.description
        ORDER BY it.item_code
    """

    data = frappe.db.sql(query, values, as_dict=True)

    columns = [
        {"label": "Item Code", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
        {"label": "Item Name", "fieldname": "item_name", "fieldtype": "Data", "width": 180},
        {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 250},

        {"label": "Purchase Rate", "fieldname": "last_purchase_rate", "fieldtype": "Float", "width": 120, "show_totals": 1},
        {"label": "Item Available Qty", "fieldname": "item_available_qty", "fieldtype": "Float", "width": 130, "show_totals": 1},
        {"label": "Safety Stock", "fieldname": "safety_stock", "fieldtype": "Float", "width": 120, "show_totals": 1},

        {"label": "PO Booking Qty", "fieldname": "po_booking_qty", "fieldtype": "Float", "width": 120, "show_totals": 1},
        {"label": "Open PO Qty (Supplier End)", "fieldname": "open_qty", "fieldtype": "Float", "width": 140, "show_totals": 1},

        {"label": "Free Item Qty", "fieldname": "free_item_qty", "fieldtype": "Float", "width": 120, "show_totals": 1},
        {"label": "Units Sold (Last 6 Months)", "fieldname": "units_sold_last_6_months", "fieldtype": "Float", "width": 160, "show_totals": 1},
    ]

    return columns, data


