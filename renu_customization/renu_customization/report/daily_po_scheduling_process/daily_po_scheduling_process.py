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

#         {"label": "Projected Quantity", "fieldname": "projected_qty", "fieldtype": "Float", "width": 150},
#         {"label": "Safety Stock", "fieldname": "safety_stock", "fieldtype": "Float", "width": 140},
#         {"label": "Minimum Order Qty", "fieldname": "min_order_qty", "fieldtype": "Float", "width": 160},

#         {"label": "Description", "fieldname": "description", "fieldtype": "Data", "width": 150},
        
#         {"label": "Available Quantity", "fieldname": "actual_qty", "fieldtype": "Float", "width": 120},
#         {"label": "Purchase Ordered Quantity", "fieldname": "ordered_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Planned Quantity", "fieldname": "planned_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Sales Order Quantity", "fieldname": "reserved_qty", "fieldtype": "Float", "width": 140},
#         {"label": "Reserved Quantity for Production", "fieldname": "reserved_qty_for_production", "fieldtype": "Float", "width": 200},
#     ]
 
#     return columns, data


import frappe
from frappe.utils import add_days


def execute(filters=None):
    # ---------------------------------------------------------
    # COLUMN STRUCTURE (Same as Excel)
    # ---------------------------------------------------------
    columns = [
        {"label": "Day", "fieldname": "day", "fieldtype": "Data", "width": 90},
        {"label": "Sales Order No", "fieldname": "sales_order", "fieldtype": "Data", "width": 130},
        {"label": "Open Sales Order Qty", "fieldname": "open_so_qty", "fieldtype": "Int", "width": 140},
        {"label": "Delivered Qty", "fieldname": "delivered_qty", "fieldtype": "Int", "width": 110},
        {"label": "GRN Qty", "fieldname": "grn_qty", "fieldtype": "Int", "width": 90},
        {"label": "On hand stock", "fieldname": "on_hand_stock", "fieldtype": "Int", "width": 120},
        {"label": "Safety Stock", "fieldname": "safety_stock", "fieldtype": "Int", "width": 110},
        {"label": "Available Stock", "fieldname": "available_stock", "fieldtype": "Int", "width": 130},
        {"label": "On-Order Qty", "fieldname": "on_order_qty", "fieldtype": "Int", "width": 120},
        {"label": "Gross Requirement", "fieldname": "gross_requirement", "fieldtype": "Int", "width": 140},
        {"label": "Minimum Order Qty", "fieldname": "min_order_qty", "fieldtype": "Int", "width": 140},
        {"label": "Plan To Request Qty", "fieldname": "plan_to_request", "fieldtype": "Int", "width": 150},
        {"label": "Customer Expected Date", "fieldname": "customer_expected_date", "fieldtype": "Date", "width": 160},
        {"label": "Delivery Lead Time (in Days)", "fieldname": "delivery_lead_time", "fieldtype": "Int", "width": 200},
        {"label": "Dispatch Date", "fieldname": "dispatch_date", "fieldtype": "Date", "width": 130},
        {"label": "Dispatch Preparation (in Days)", "fieldname": "dispatch_preparation_days", "fieldtype": "Int", "width": 210},
        {"label": "Expected Receipt Date From Vendor", "fieldname": "expected_receipt_date", "fieldtype": "Date", "width": 220},
        {"label": "Vendor Delivery Lead Time (in Days)", "fieldname": "vendor_lead_time", "fieldtype": "Int", "width": 230},
        {"label": "Expected PO Date", "fieldname": "expected_po_date", "fieldtype": "Date", "width": 160},
        {"label": "Expected Delivery Date", "fieldname": "expected_delivery_date", "fieldtype": "Date", "width": 170},
    ]

    data = []

    # ---------------------------------------------------------
    # FETCH DATA (🔴 CHANGE THIS TO YOUR SOURCE DOCTYPE)
    # ---------------------------------------------------------
    records = frappe.db.sql(
        """
        SELECT
            name as sales_order,
            open_sales_order_qty,
            delivered_qty,
            grn_qty,
            safety_stock,
            min_order_qty,
            on_order_qty,
            customer_expected_date,
            delivery_lead_time,
            dispatch_preparation_days,
            vendor_lead_time
        FROM `tabSales Order Item`
        ORDER BY customer_expected_date ASC
        """,
        as_dict=True,
    )

    cumulative_so = 0

    # ---------------------------------------------------------
    # ROW CALCULATIONS (Same as Excel Logic)
    # ---------------------------------------------------------
    for idx, d in enumerate(records):

        open_so = cint(d.open_sales_order_qty or 0)
        delivered = cint(d.delivered_qty or 0)
        grn = cint(d.grn_qty or 0)
        safety = cint(d.safety_stock or 0)
        moq = cint(d.min_order_qty or 0)
        on_order = cint(d.on_order_qty or 0)

        cumulative_so += open_so

        on_hand = grn - delivered
        available_stock = on_hand - safety

        gross_requirement = cumulative_so - on_order - delivered - grn

        # ---------------------- PLAN TO REQUEST LOGIC ----------------------
        if on_hand == safety:
            plan_req = moq
        elif gross_requirement <= 0:
            plan_req = 0
        elif gross_requirement < moq:
            plan_req = moq
        else:
            plan_req = gross_requirement

        # ---------------------- DATE LOGIC ----------------------
        customer_date = d.customer_expected_date

        dispatch_date = add_days(customer_date, -(d.delivery_lead_time or 0))
        expected_receipt = add_days(dispatch_date, -(d.dispatch_preparation_days or 0))
        expected_po = add_days(expected_receipt, -(d.vendor_lead_time or 0))

        expected_delivery = add_days(
            expected_po,
            (d.delivery_lead_time or 0)
            + (d.dispatch_preparation_days or 0)
            + (d.vendor_lead_time or 0)
        )

        data.append({
            "day": f"Day {idx+1}",
            "sales_order": d.sales_order,
            "open_so_qty": open_so,
            "delivered_qty": delivered,
            "grn_qty": grn,
            "on_hand_stock": on_hand,
            "safety_stock": safety,
            "available_stock": available_stock,
            "on_order_qty": on_order,
            "gross_requirement": gross_requirement,
            "min_order_qty": moq,
            "plan_to_request": plan_req,
            "customer_expected_date": customer_date,
            "delivery_lead_time": d.delivery_lead_time,
            "dispatch_date": dispatch_date,
            "dispatch_preparation_days": d.dispatch_preparation_days,
            "expected_receipt_date": expected_receipt,
            "vendor_lead_time": d.vendor_lead_time,
            "expected_po_date": expected_po,
            "expected_delivery_date": expected_delivery
        })

    return columns, data
