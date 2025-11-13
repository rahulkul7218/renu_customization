

import frappe
 
def execute(filters=None):
    if not filters:
        filters = {}
 
    supplier = filters.get("supplier")
 
    data = frappe.db.sql(
        """
        WITH supplier_filter AS (
            SELECT
                COALESCE(%(supplier)s, '') AS supplier
        )
        SELECT
           
            b.item_code AS item_code,
            i.description AS description,
            (
                SELECT sii.supplier
                FROM `tabItem Supplier` sii
                WHERE sii.parent = i.name
                LIMIT 1
            ) AS supplier,
            b.actual_qty AS actual_qty,
            b.ordered_qty AS ordered_qty,
            b.planned_qty AS planned_qty,
            b.reserved_qty AS reserved_qty,
            b.reserved_qty_for_production AS reserved_qty_for_production,
            b.projected_qty AS projected_qty
        FROM
            `tabBin` b
        LEFT JOIN
            `tabItem` i ON i.name = b.item_code
        LEFT JOIN
            `tabWarehouse` w ON w.name = b.warehouse,
            supplier_filter sf
        WHERE
            b.projected_qty < 0
            AND (
                sf.supplier = ''
                OR EXISTS (
                    SELECT 1
                    FROM `tabItem Supplier` isup
                    WHERE isup.parent = i.name
                    AND isup.supplier = sf.supplier
                )
            )
        ORDER BY
            b.projected_qty ASC
        """,
        {"supplier": supplier},
        as_dict=True
    )
 
    # SAME COLUMNS as Query Report
    columns = [
        
        {"label": "Supplier", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 150},
        {"label": "Item", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
		
		{"label": "Projected Quantity", "fieldname": "projected_qty", "fieldtype": "Float", "width": 150},
        {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 150},
        
        {"label": "Available Quantity", "fieldname": "actual_qty", "fieldtype": "Float", "width": 120},
        {"label": "Purchase Ordered Quantity", "fieldname": "ordered_qty", "fieldtype": "Float", "width": 140},
        {"label": "Planned Quantity", "fieldname": "planned_qty", "fieldtype": "Float", "width": 140},
        {"label": "Sales Order Quantity", "fieldname": "reserved_qty", "fieldtype": "Float", "width": 140},
        {"label": "Reserved Quantity for Production", "fieldname": "reserved_qty_for_production", "fieldtype": "Float", "width": 200},
        
    ]
 
    return columns, data
 