# import frappe
 
# def execute(filters=None):
#     if not filters:
#         filters = {}
 
#     supplier = filters.get("supplier")
 
#     data = frappe.db.sql(
#         """
#         WITH supplier_filter AS (
#             SELECT
#                 COALESCE(%(supplier)s, '') AS supplier
#         )
#         SELECT
#             b.item_code AS item_code,
#             i.description AS description,
            
#             -- Supplier fetched from Item Default
#             (
#                 SELECT idef.default_supplier
#                 FROM `tabItem Default` idef
#                 WHERE idef.parent = i.name
#                 LIMIT 1
#             ) AS supplier,
            
#             b.actual_qty AS actual_qty,
#             b.ordered_qty AS ordered_qty,
#             b.planned_qty AS planned_qty,
#             b.reserved_qty AS reserved_qty,
#             b.reserved_qty_for_production AS reserved_qty_for_production,
#             b.projected_qty AS projected_qty

#         FROM
#             `tabBin` b
#         LEFT JOIN
#             `tabItem` i ON i.name = b.item_code,
#             supplier_filter sf

#         WHERE
#             b.projected_qty < 0
            
#             -- Supplier Filter Condition updated to use Item Default table
#             AND (
#                 sf.supplier = ''
#                 OR EXISTS (
#                     SELECT 1
#                     FROM `tabItem Default` idef
#                     WHERE idef.parent = i.name
#                     AND idef.default_supplier = sf.supplier
#                 )
#             )
        
#         ORDER BY
#             b.projected_qty ASC
#         """,
#         {"supplier": supplier},
#         as_dict=True
#     )
 
#     # SAME COLUMNS as Query Report
#     columns = [
        
#         {"label": "Supplier", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 150},
#         {"label": "Item", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
		
# 		{"label": "Projected Quantity", "fieldname": "projected_qty", "fieldtype": "Float", "width": 150},
#         {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 150},
        
#         {"label": "Available Quantity", "fieldname": "actual_qty", "fieldtype": "Float", "width": 120},
#         {"label": "Purchase Ordered Quantity", "fieldname": "ordered_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Planned Quantity", "fieldname": "planned_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Sales Order Quantity", "fieldname": "reserved_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Reserved Quantity for Production", "fieldname": "reserved_qty_for_production", "fieldtype": "Float", "width": 200},
        
#     ]
 
#     return columns, data



# import frappe
 
# def execute(filters=None):
#     if not filters:
#         filters = {}
 
#     supplier = filters.get("supplier")
 
#     data = frappe.db.sql(
#         """
#         WITH supplier_filter AS (
#             SELECT
#                 COALESCE(%(supplier)s, '') AS supplier
#         )
#         SELECT
#             b.item_code AS item_code,
#             i.description AS description,
            
#             -- Supplier fetched from Item Default
#             (
#                 SELECT idef.default_supplier
#                 FROM `tabItem Default` idef
#                 WHERE idef.parent = i.name
#                 LIMIT 1
#             ) AS supplier,
            
#             -- Newly Added Fields
#             i.safety_stock AS safety_stock,
#             i.min_order_qty AS min_order_qty,

#             b.actual_qty AS actual_qty,
#             b.ordered_qty AS ordered_qty,
#             b.planned_qty AS planned_qty,
#             b.reserved_qty AS reserved_qty,
#             b.reserved_qty_for_production AS reserved_qty_for_production,
#             b.projected_qty AS projected_qty

#         FROM
#             `tabBin` b
#         LEFT JOIN
#             `tabItem` i ON i.name = b.item_code,
#             supplier_filter sf

#         WHERE
#             b.projected_qty < 0
            
#             -- Supplier Filter Condition
#             AND (
#                 sf.supplier = ''
#                 OR EXISTS (
#                     SELECT 1
#                     FROM `tabItem Default` idef
#                     WHERE idef.parent = i.name
#                     AND idef.default_supplier = sf.supplier
#                 )
#             )
        
#         ORDER BY
#             b.projected_qty ASC
#         """,
#         {"supplier": supplier},
#         as_dict=True
#     )
 
#     columns = [
#         {"label": "Supplier", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 150},
#         {"label": "Item", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
#          {"label": "Open Sales Order Quantity", "fieldname": "reserved_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Projected Quantity", "fieldname": "projected_qty", "fieldtype": "Float", "width": 150},
#         {"label": "Safety Stock", "fieldname": "safety_stock", "fieldtype": "Float", "width": 140},
#         {"label": "Minimum Order Qty", "fieldname": "min_order_qty", "fieldtype": "Float", "width": 160},

#         {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 150},
        
#         {"label": "Available Quantity", "fieldname": "actual_qty", "fieldtype": "Float", "width": 120},
#         {"label": "Purchase Ordered Quantity", "fieldname": "ordered_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Planned Quantity", "fieldname": "planned_qty", "fieldtype": "Float", "width": 140},
       
#         {"label": "Reserved Quantity for Production", "fieldname": "reserved_qty_for_production", "fieldtype": "Float", "width": 200},
#     ]
 
#     return columns, data


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
            # i.description AS description,
            
            -- Supplier fetched from Item Default
            (
                SELECT idef.default_supplier
                FROM `tabItem Default` idef
                WHERE idef.parent = i.name
                LIMIT 1
            ) AS supplier,
            
            -- Newly Added Fields
            i.safety_stock AS safety_stock,
            i.min_order_qty AS min_order_qty,

            b.actual_qty AS actual_qty,
            b.ordered_qty AS ordered_qty,
            b.planned_qty AS planned_qty,
            b.reserved_qty AS reserved_qty,

            -- Delivered Quantity
            (
                SELECT SUM(soi.delivered_qty)
                FROM `tabSales Order Item` soi
                INNER JOIN `tabSales Order` so ON so.name = soi.parent
                WHERE soi.item_code = b.item_code
                AND so.docstatus = 1
                AND so.delivery_status IN ('Fully Delivered', 'Partially Delivered', '')
            ) AS delivered_qty,

            -- GRN Quantity
            (
                SELECT SUM(pri.received_qty)
                FROM `tabPurchase Receipt Item` pri
                INNER JOIN `tabPurchase Receipt` pr ON pr.name = pri.parent
                WHERE pri.item_code = b.item_code
                AND pr.docstatus = 1
                AND pr.status NOT IN ('Cancelled', 'Closed', 'Return', 'Return Issued', 'Draft')
            ) AS grn_qty,

            -- On Hand Stock = GRN Qty - Delivered Qty
            (
                COALESCE((
                    SELECT SUM(pri.received_qty)
                    FROM `tabPurchase Receipt Item` pri
                    INNER JOIN `tabPurchase Receipt` pr ON pr.name = pri.parent
                    WHERE pri.item_code = b.item_code
                    AND pr.docstatus = 1
                    AND pr.status NOT IN ('Cancelled', 'Closed', 'Return', 'Return Issued', 'Draft')
                ),0) -
                COALESCE((
                    SELECT SUM(soi.delivered_qty)
                    FROM `tabSales Order Item` soi
                    INNER JOIN `tabSales Order` so ON so.name = soi.parent
                    WHERE soi.item_code = b.item_code
                    AND so.docstatus = 1
                    AND so.delivery_status IN ('Fully Delivered', 'Partially Delivered', '')
                ),0)
            ) AS on_hand_stock,

            b.reserved_qty_for_production AS reserved_qty_for_production,
            b.projected_qty AS projected_qty

        FROM
            `tabBin` b
        LEFT JOIN
            `tabItem` i ON i.name = b.item_code,
            supplier_filter sf

        WHERE
            b.projected_qty < 0
            
            -- Supplier Filter Condition
            AND (
                sf.supplier = ''
                OR EXISTS (
                    SELECT 1
                    FROM `tabItem Default` idef
                    WHERE idef.parent = i.name
                    AND idef.default_supplier = sf.supplier
                )
            )
        
        ORDER BY
            b.projected_qty ASC
        """,
        {"supplier": supplier},
        as_dict=True
    )
 
    columns = [
        {"label": "Supplier", "fieldname": "supplier", "fieldtype": "Link", "options": "Supplier", "width": 150},
        {"label": "Item", "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
        {"label": "Open Sales Order Quantity", "fieldname": "reserved_qty", "fieldtype": "Float", "width": 160},

        {"label": "Delivered Qty", "fieldname": "delivered_qty", "fieldtype": "Float", "width": 140},
        {"label": "GRN Qty", "fieldname": "grn_qty", "fieldtype": "Float", "width": 140},

        # 🔥 New Column
        {"label": "On Hand Stock", "fieldname": "on_hand_stock", "fieldtype": "Float", "width": 140},

        {"label": "Projected Quantity", "fieldname": "projected_qty", "fieldtype": "Float", "width": 150},
        {"label": "Safety Stock", "fieldname": "safety_stock", "fieldtype": "Float", "width": 140},
        {"label": "Minimum Order Qty", "fieldname": "min_order_qty", "fieldtype": "Float", "width": 160},

        # {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 200},
        {"label": "Available Quantity", "fieldname": "actual_qty", "fieldtype": "Float", "width": 120},
        {"label": "Purchase Ordered Quantity", "fieldname": "ordered_qty", "fieldtype": "Float", "width": 160},
        {"label": "Planned Quantity", "fieldname": "planned_qty", "fieldtype": "Float", "width": 140},
        {"label": "Reserved Quantity for Production", "fieldname": "reserved_qty_for_production", "fieldtype": "Float", "width": 200},
    ]
 
    return columns, data
