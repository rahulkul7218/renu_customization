# import frappe

# @frappe.whitelist()
# def get_mrp_data():
#     # Fetch items with MRP checked
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty"]
#     )

#     result = []

#     for item in items:
#         # On-hand and available qty per item (sum across all warehouses)
#         bin_data = frappe.db.get_all(
#             "Bin",
#             filters={"item_code": item.name},
#             fields=["SUM(actual_qty) as on_hand_qty", "SUM(projected_qty) as available_qty"]
#         )
#         on_hand_qty = bin_data[0].on_hand_qty or 0
#         available_qty = bin_data[0].available_qty or 0

#         # Open sales orders
#         open_so = frappe.db.sql("""
#             SELECT SUM(sii.qty - sii.delivered_qty)
#             FROM `tabSales Order Item` sii
#             JOIN `tabSales Order` so ON so.name = sii.parent
#             WHERE sii.item_code=%s AND so.docstatus=1
#         """, item.name)[0][0] or 0

#         # Open purchase orders
#         po_qty = frappe.db.sql("""
#             SELECT SUM(poi.qty - poi.received_qty)
#             FROM `tabPurchase Order Item` poi
#             JOIN `tabPurchase Order` po ON po.name = poi.parent
#             WHERE poi.item_code=%s AND po.docstatus=1
#         """, item.name)[0][0] or 0

#         # Planned purchase / gross requirement (can be from Material Request or computed)
#         gross_requirement = frappe.db.sql("""
#             SELECT SUM(mri.qty)
#             FROM `tabMaterial Request Item` mri
#             JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#             WHERE mri.item_code=%s AND mr.docstatus=1 AND mr.status='Pending'
#         """, item.name)[0][0] or 0

#         planned_purchase_qty = frappe.db.sql("""
#             SELECT SUM(mri.qty)
#             FROM `tabMaterial Request Item` mri
#             JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#             WHERE mri.item_code=%s AND mr.docstatus=1 AND mr.status='Ordered'
#         """, item.name)[0][0] or 0


#         result.append({
#             "item": item.name,
#             "safety_stock": item.safety_stock or 0,
#             "open_sales_order": open_so,
#             "on_hand_qty": on_hand_qty,
#             "available_qty": available_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": item.min_order_qty or 0,
#             "planned_purchase_qty": planned_purchase_qty
#         })

#     return result


# import frappe

# @frappe.whitelist()
# def get_mrp_data():
#     # Fetch items with MRP checked
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty"]
#     )

#     result = []

#     for item in items:

#         # -------------------------
#         # On-hand Qty = GRN Qty - Delivered Qty
#         # -------------------------
#         grn_qty = frappe.db.sql("""
#             SELECT SUM(pri.received_qty)
#             FROM `tabPurchase Receipt Item` pri
#             JOIN `tabPurchase Receipt` pr ON pr.name = pri.parent
#             WHERE pri.item_code=%s AND pr.docstatus=1
#         """, item.name)[0][0] or 0

#         delivered_qty = frappe.db.sql("""
#             SELECT SUM(dni.qty)
#             FROM `tabDelivery Note Item` dni
#             JOIN `tabDelivery Note` dn ON dn.name = dni.parent
#             WHERE dni.item_code=%s AND dn.docstatus=1
#         """, item.name)[0][0] or 0

#         on_hand_qty = grn_qty - delivered_qty

#         # -------------------------
#         # Available Qty = On-hand Qty - Open Sales Orders
#         # -------------------------
#         # open_so = frappe.db.sql("""
#         #     SELECT SUM(sii.qty - sii.delivered_qty)
#         #     FROM `tabSales Order Item` sii
#         #     JOIN `tabSales Order` so ON so.name = sii.parent
#         #     WHERE sii.item_code=%s AND so.docstatus=1
#         # """, item.name)[0][0] or 0
#         open_so = frappe.db.sql("""
#         SELECT SUM(sii.qty - IFNULL(sii.delivered_qty, 0))
#         FROM `tabSales Order Item` sii
#         JOIN `tabSales Order` so ON so.name = sii.parent
#         WHERE sii.item_code=%s
#         AND so.docstatus IN (0,1)     -- Draft + Submitted
#         AND so.status NOT IN ('Closed', 'Cancelled')
#     """, item.name)[0][0] or 0


#         available_qty = on_hand_qty - open_so

#         # -------------------------
#         # Open purchase orders
#         # -------------------------
#         po_qty = frappe.db.sql("""
#             SELECT SUM(poi.qty - poi.received_qty)
#             FROM `tabPurchase Order Item` poi
#             JOIN `tabPurchase Order` po ON po.name = poi.parent
#             WHERE poi.item_code=%s 
#             AND po.docstatus IN (0,1)
#             AND po.status NOT IN ('Closed', 'Cancelled')
#         """, item.name)[0][0] or 0

#         # -------------------------
#         # Planned purchase / gross requirement
#         # -------------------------
#         gross_requirement = frappe.db.sql("""
#             SELECT SUM(mri.qty)
#             FROM `tabMaterial Request Item` mri
#             JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#             WHERE mri.item_code=%s AND mr.docstatus=1 AND mr.status='Pending'
#         """, item.name)[0][0] or 0

#         planned_purchase_qty = frappe.db.sql("""
#             SELECT SUM(mri.qty)
#             FROM `tabMaterial Request Item` mri
#             JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#             WHERE mri.item_code=%s AND mr.docstatus=1 AND mr.status='Ordered'
#         """, item.name)[0][0] or 0

#         result.append({
#             "item": item.name,
#             "safety_stock": item.safety_stock or 0,
#             "open_sales_order": open_so,
#             "on_hand_qty": on_hand_qty,
#             "available_qty": available_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": item.min_order_qty or 0,
#             "planned_purchase_qty": planned_purchase_qty
#         })

#     return result

# below script is working till Gross requirement column
# import frappe

# @frappe.whitelist()
# def get_mrp_data():
#     # Fetch items with MRP checked
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty"]
#     )

#     result = []

#     for item in items:

#         # ======================================================
#         # ⭐⭐ UPDATED PART — Fetch Real On-hand Stock ⭐⭐
#         # On-hand Qty = Actual Qty from Warehouse Stock (tabBin)
#         # ======================================================
#         on_hand_qty = frappe.db.sql("""
#             SELECT SUM(actual_qty)
#             FROM `tabBin`
#             WHERE item_code = %s
#         """, item.name)[0][0] or 0
#         # ======================================================


#         # -------------------------
#         # Available Qty = On-hand Qty - Open Sales Orders
#         # -------------------------
#         open_so = frappe.db.sql("""
#             SELECT SUM(sii.qty - IFNULL(sii.delivered_qty, 0))
#             FROM `tabSales Order Item` sii
#             JOIN `tabSales Order` so ON so.name = sii.parent
#             WHERE sii.item_code=%s
#             AND so.docstatus IN (0,1)     -- Draft + Submitted
#             AND so.status NOT IN ('Closed', 'Cancelled')
#         """, item.name)[0][0] or 0

#         # available_qty = on_hand_qty - open_so
#         safety_stock = item.safety_stock or 0
#         available_qty = on_hand_qty - safety_stock


#         # -------------------------
#         # Open purchase orders
#         # -------------------------
#         po_qty = frappe.db.sql("""
#             SELECT SUM(poi.qty - poi.received_qty)
#             FROM `tabPurchase Order Item` poi
#             JOIN `tabPurchase Order` po ON po.name = poi.parent
#             WHERE poi.item_code=%s 
#             AND po.docstatus IN (0,1)
#             AND po.status NOT IN ('Closed', 'Cancelled')
#         """, item.name)[0][0] or 0


#         # -------------------------
#         # Gross Requirement (Pending MR)
#         # -------------------------
#         # gross_requirement = frappe.db.sql("""
#         #     SELECT SUM(mri.qty)
#         #     FROM `tabMaterial Request Item` mri
#         #     JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#         #     WHERE mri.item_code=%s 
#         #     AND mr.docstatus=1 
#         #     AND mr.status='Pending'
#         # """, item.name)[0][0] or 0
#         gross_requirement = (open_so - available_qty - po_qty)


#         # -------------------------
#         # Planned Purchase (Ordered MR)
#         # -------------------------
#         planned_purchase_qty = frappe.db.sql("""
#             SELECT SUM(mri.qty)
#             FROM `tabMaterial Request Item` mri
#             JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#             WHERE mri.item_code=%s 
#             AND mr.docstatus=1 
#             AND mr.status='Ordered'
#         """, item.name)[0][0] or 0


#         result.append({
#             "item": item.name,
#             "safety_stock": item.safety_stock or 0,
#             "open_sales_order": open_so,
#             "on_hand_qty": on_hand_qty,
#             "available_qty": available_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": item.min_order_qty or 0,
#             "planned_purchase_qty": planned_purchase_qty
#         })

#     return result



# New logic script for calculating planned to request qty
# import frappe

# @frappe.whitelist()
# def get_mrp_data():
#     # Fetch items with MRP checked
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty"]
#     )

#     result = []

#     for item in items:

#         # ======================================================
#         # ⭐⭐ Fetch Real On-hand Stock from tabBin ⭐⭐
#         # ======================================================
#         on_hand_qty = frappe.db.sql("""
#             SELECT SUM(actual_qty)
#             FROM `tabBin`
#             WHERE item_code = %s
#         """, item.name)[0][0] or 0
#         on_hand_qty = float(on_hand_qty)

#         # ======================================================
#         # Open Sales Order Qty
#         # ======================================================
#         open_so = frappe.db.sql("""
#             SELECT SUM(sii.qty - IFNULL(sii.delivered_qty, 0))
#             FROM `tabSales Order Item` sii
#             JOIN `tabSales Order` so ON so.name = sii.parent
#             WHERE sii.item_code=%s
#             AND so.docstatus IN (0,1)     -- Draft + Submitted
#             AND so.status NOT IN ('Closed', 'Cancelled')
#         """, item.name)[0][0] or 0
#         open_so = float(open_so)

#         # ======================================================
#         # Safety Stock
#         # ======================================================
#         safety_stock = item.safety_stock or 0
#         safety_stock = float(safety_stock)

#         # ======================================================
#         # Available Qty = On-hand - Safety Stock
#         # ======================================================
#         available_qty = on_hand_qty - safety_stock

#         # ======================================================
#         # Open Purchase Orders
#         # ======================================================
#         po_qty = frappe.db.sql("""
#             SELECT SUM(poi.qty - IFNULL(poi.received_qty, 0))
#             FROM `tabPurchase Order Item` poi
#             JOIN `tabPurchase Order` po ON po.name = poi.parent
#             WHERE poi.item_code=%s 
#             AND po.docstatus IN (0,1)
#             AND po.status NOT IN ('Closed', 'Cancelled')
#         """, item.name)[0][0] or 0
#         po_qty = float(po_qty)

#         # ======================================================
#         # Gross Requirement
#         # ======================================================
#         gross_requirement = open_so - available_qty - po_qty
#         gross_requirement = float(gross_requirement)

#         # ======================================================
#         # Planned Purchase Qty from Ordered Material Requests
#         # ======================================================
#         planned_purchase_qty = frappe.db.sql("""
#             SELECT SUM(mri.qty)
#             FROM `tabMaterial Request Item` mri
#             JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#             WHERE mri.item_code=%s 
#             AND mr.docstatus=1 
#             AND mr.status='Ordered'
#         """, item.name)[0][0] or 0
#         planned_purchase_qty = float(planned_purchase_qty)

#         # ======================================================
#         # Minimum Order Qty (MOQ)
#         # ======================================================
#         moq = item.min_order_qty or 0
#         moq = float(moq)

#         # ======================================================
#         # Planned to Purchase Qty Calculation
#         # ======================================================
#         if on_hand_qty == safety_stock:
#             planned_purchase_qty = moq
#         elif gross_requirement <= 0:
#             planned_purchase_qty = 0
#         elif gross_requirement < moq:
#             planned_purchase_qty = moq
#         else:
#             planned_purchase_qty = gross_requirement

#         # ======================================================
#         # Append Result
#         # ======================================================
#         result.append({
#             "item": item.name,
#             "safety_stock": safety_stock,
#             "open_sales_order": open_so,
#             "on_hand_qty": on_hand_qty,
#             "available_qty": available_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": moq,
#             "planned_purchase_qty": planned_purchase_qty
           
#         })

#     return result


# New logic for dialog box show sales orders

# import frappe

# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty"]
#     )

#     result = []

#     for item in items:
#         # On-hand Qty
#         on_hand_qty = frappe.db.sql("""SELECT SUM(actual_qty) FROM `tabBin` WHERE item_code=%s""", item.name)[0][0] or 0
#         on_hand_qty = float(on_hand_qty)

#         # Open SO Qty
#         open_so = frappe.db.sql("""
#             SELECT SUM(sii.qty - IFNULL(sii.delivered_qty,0))
#             FROM `tabSales Order Item` sii
#             JOIN `tabSales Order` so ON so.name = sii.parent
#             WHERE sii.item_code=%s
#             AND so.docstatus IN (0,1)
#             AND so.status NOT IN ('Closed','Cancelled')
#         """, item.name)[0][0] or 0
#         open_so = float(open_so)

#         # Safety Stock
#         safety_stock = float(item.safety_stock or 0)

#         # Available Qty
#         available_qty = on_hand_qty - safety_stock

#         # Open PO Qty
#         po_qty = frappe.db.sql("""
#             SELECT SUM(poi.qty - IFNULL(poi.received_qty,0))
#             FROM `tabPurchase Order Item` poi
#             JOIN `tabPurchase Order` po ON po.name = poi.parent
#             WHERE poi.item_code=%s
#             AND po.docstatus IN (0,1)
#             AND po.status NOT IN ('Closed','Cancelled')
#         """, item.name)[0][0] or 0
#         po_qty = float(po_qty)

#         # Gross Requirement
#         gross_requirement = float(open_so - available_qty - po_qty)

#         # Planned Purchase Qty
#         planned_purchase_qty = frappe.db.sql("""
#             SELECT SUM(mri.qty)
#             FROM `tabMaterial Request Item` mri
#             JOIN `tabMaterial Request` mr ON mr.name = mri.parent
#             WHERE mri.item_code=%s
#             AND mr.docstatus=1
#             AND mr.status='Ordered'
#         """, item.name)[0][0] or 0
#         planned_purchase_qty = float(planned_purchase_qty)

#         # MOQ
#         moq = float(item.min_order_qty or 0)

#         # Planned to Purchase Qty
#         if on_hand_qty == safety_stock:
#             planned_purchase_qty = moq
#         elif gross_requirement <= 0:
#             planned_purchase_qty = 0
#         elif gross_requirement < moq:
#             planned_purchase_qty = moq
#         else:
#             planned_purchase_qty = gross_requirement

#         result.append({
#             "item": item.name,
#             "safety_stock": safety_stock,
#             "open_sales_order": open_so,
#             "on_hand_qty": on_hand_qty,
#             "available_qty": available_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": moq,
#             "planned_purchase_qty": planned_purchase_qty
#         })

#     return result


# # Open SO Function
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     sales_orders = frappe.db.sql("""
#         SELECT so.name AS sales_order,
#                sii.qty - IFNULL(sii.delivered_qty,0) AS qty
#         FROM `tabSales Order Item` sii
#         JOIN `tabSales Order` so ON so.name = sii.parent
#         WHERE sii.item_code=%s
#         AND so.docstatus IN (0,1)
#         AND so.status NOT IN ('Closed','Cancelled')
#     """, item_code, as_dict=1)
#     return sales_orders


# # ✅ New: Open PO Function
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     purchase_orders = frappe.db.sql("""
#         SELECT po.name AS purchase_order,
#                poi.qty - IFNULL(poi.received_qty,0) AS qty
#         FROM `tabPurchase Order Item` poi
#         JOIN `tabPurchase Order` po ON po.name = poi.parent
#         WHERE poi.item_code=%s
#         AND po.docstatus IN (0,1)
#         AND po.status NOT IN ('Closed','Cancelled')
#     """, item_code, as_dict=1)
#     return purchase_orders


# Below code is for auto PO generation
# import frappe


# # =========================================
# # ⭐ FETCH MRP DATA FOR TABLE
# # =========================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE QTY ----------------
#         # available = frappe.db.sql("""
#         #     SELECT IFNULL(SUM(actual_qty - reserved_qty),0)
#         #     FROM `tabBin`
#         #     WHERE item_code=%s
#         # """, item_code)[0][0]
#         # ---------------- AVAILABLE QTY ----------------
#         available = on_hand - (item.safety_stock or 0)

#         # ---------------- OPEN SALES ORDER ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         planned = 0
#         safety = item.safety_stock or 0
#         moq = item.moq or 0

#         # Rule 1
#         if on_hand == safety and moq > 0:
#             planned = moq

#         # Rule 2
#         elif gross_requirement <= 0:
#             planned = 0

#         # Rule 3
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned = moq

#         # Rule 4
#         elif gross_requirement >= moq:
#             planned = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "moq": moq,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "planned_purchase_qty": planned
#         })

#     return result



# # =========================================
# # ⭐ SALES ORDER POPUP DATA
# # =========================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     data = frappe.db.sql("""
#         SELECT parent, qty
#         FROM `tabSales Order Item`
#         WHERE item_code=%s
#         AND docstatus = 1
#     """, item_code, as_dict=True)

#     result = []
#     for d in data:
#         result.append({
#             "sales_order": d.parent,
#             "qty": d.qty
#         })

#     return result



# # =========================================
# # ⭐ PURCHASE ORDER POPUP DATA
# # =========================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     data = frappe.db.sql("""
#         SELECT parent, qty
#         FROM `tabPurchase Order Item`
#         WHERE item_code=%s
#         AND docstatus = 1
#     """, item_code, as_dict=True)

#     result = []
#     for d in data:
#         result.append({
#             "purchase_order": d.parent,
#             "qty": d.qty
#         })

#     return result



# # =========================================
# # ⭐ CREATE PURCHASE ORDER
# # =========================================
# import json

# @frappe.whitelist()
# def create_purchase_order(items):
#     items = json.loads(items)

#     if not items:
#         frappe.throw("No items selected")

#     po = frappe.new_doc("Purchase Order")

#     # Supplier from first item
#     first_item = items[0]["item"]
#     supplier = get_default_supplier(first_item)

#     if not supplier:
#         frappe.throw(f"No Default Supplier found for item: {first_item}")

#     po.supplier = supplier

#     # Add Items
#     for row in items:
#         supplier = get_default_supplier(row["item"])
#         if not supplier:
#             frappe.throw(f"No Default Supplier for {row['item']}")

#         po.append("items", {
#             "item_code": row["item"],
#             "qty": row["planned_qty"],
#             "schedule_date": frappe.utils.nowdate()
#         })

#     po.insert()
#     po.submit()

#     return po.name


# def get_default_supplier(item_code):
#     return frappe.db.get_value(
#         "Item Default",
#         {"parent": item_code},
#         "default_supplier"
#     )




# import frappe
# from frappe.utils import nowdate


# # =========================================
# # ⭐ FETCH MRP DATA FOR TABLE
# # =========================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE QTY ----------------
#         available = on_hand - (item.safety_stock or 0)

#         # ---------------- OPEN SALES ORDER ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         planned = 0
#         safety = item.safety_stock or 0
#         moq = item.moq or 0

#         # Rule 1
#         if on_hand == safety and moq > 0:
#             planned = moq

#         # Rule 2
#         elif gross_requirement <= 0:
#             planned = 0

#         # Rule 3
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned = moq

#         # Rule 4
#         elif gross_requirement >= moq:
#             planned = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "moq": moq,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "planned_purchase_qty": planned
#         })

#     return result



# # =========================================
# # ⭐ MANUAL BUTTON CREATE PURCHASE ORDER
# # (Your Existing Function)
# # =========================================
# @frappe.whitelist()
# def create_purchase_order(items):
#     items = frappe.parse_json(items)

#     if not items:
#         return

#     supplier_map = {}

#     for row in items:
#         item_code = row.get("item")
#         qty = row.get("planned_qty")

#         if qty <= 0:
#             continue

#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item_code},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item {item_code}")

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item_code,
#             "qty": qty,
#             "schedule_date": nowdate()
#         })

#     last_po = None

#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po



# # =========================================
# # ⭐ AUTO DAILY PURCHASE ORDER JOB
# # (Runs every day 12AM)
# # =========================================
# @frappe.whitelist()
# def auto_create_purchase_orders():

#     mrp_data = get_mrp_data()
#     supplier_map = {}

#     for row in mrp_data:

#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         # ❌ Skip if no requirement
#         if planned_qty <= 0:
#             continue

#         # ✅ Get Default Supplier
#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.log_error(
#                 f"No Default Supplier for Item {item}",
#                 "MRP Auto PO"
#             )
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#     created = []

#     for supplier, po_items in supplier_map.items():

#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()

#         created.append(po.name)

#     return created


# Testing popup message

# import frappe
# from frappe.utils import nowdate


# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE STOCK ----------------
#         available = on_hand - (item.safety_stock or 0)

#         # ---------------- OPEN SALES ORDER ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         planned = 0
#         safety = item.safety_stock or 0
#         moq = item.moq or 0

#         # RULE 1
#         if on_hand == safety and moq > 0:
#             planned = moq

#         # RULE 2
#         elif gross_requirement <= 0:
#             planned = 0

#         # RULE 3
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned = moq

#         # RULE 4
#         elif gross_requirement >= moq:
#             planned = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "moq": moq,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "planned_purchase_qty": planned
#         })

#     return result



# # =====================================================
# # ⭐ MANUAL PURCHASE ORDER BUTTON
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items):
#     items = frappe.parse_json(items)

#     if not items:
#         return

#     supplier_map = {}

#     for row in items:
#         item_code = row.get("item")
#         qty = row.get("planned_qty")

#         if qty <= 0:
#             continue

#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item_code},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item {item_code}")

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item_code,
#             "qty": qty,
#             "schedule_date": nowdate()
#         })

#     last_po = None

#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po



# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB (12AM)
# # =====================================================
# @frappe.whitelist()
# def auto_create_purchase_orders():

#     mrp_data = get_mrp_data()
#     supplier_map = {}

#     for row in mrp_data:

#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue

#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.log_error(f"No Default Supplier for Item {item}", "MRP Auto PO")
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#     created = []

#     for supplier, po_items in supplier_map.items():

#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()

#         created.append(po.name)

#     return created



# # =====================================================
# # ⭐ OPEN SALES ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             soi.delivered_qty,
#             (soi.qty - soi.delivered_qty) AS pending_qty
#         FROM `tabSales Order Item` soi
#         WHERE soi.item_code = %s
#         AND soi.docstatus = 1
#     """, item_code, as_dict=True)



# # =====================================================
# # ⭐ OPEN PURCHASE ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             poi.received_qty,
#             (poi.qty - poi.received_qty) AS pending_qty
#         FROM `tabPurchase Order Item` poi
#         WHERE poi.item_code = %s
#         AND poi.docstatus = 1
#     """, item_code, as_dict=True)

# if purchase order already generate and no values change then not allow to create double purchase order
# import frappe
# from frappe.utils import nowdate


# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE STOCK ----------------
#         available = on_hand - (item.safety_stock or 0)

#         # ---------------- OPEN SALES ORDER ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         planned = 0
#         safety = item.safety_stock or 0
#         moq = item.moq or 0

#         # RULE 1
#         if on_hand == safety and moq > 0:
#             planned = moq

#         # RULE 2
#         elif gross_requirement <= 0:
#             planned = 0

#         # RULE 3
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned = moq

#         # RULE 4
#         elif gross_requirement >= moq:
#             planned = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "moq": moq,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "planned_purchase_qty": planned
#         })

#     return result



# # =====================================================
# # ⭐ MANUAL PURCHASE ORDER BUTTON
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items):
#     items = frappe.parse_json(items)

#     if not items:
#         return

#     supplier_map = {}

#     for row in items:
#         item_code = row.get("item")
#         qty = row.get("planned_qty")

#         if qty <= 0:
#             continue

#         # ---------------- RE-CHECK LIVE MRP VALUES ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s AND docstatus = 1
#         """, item_code)[0][0]

#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s AND docstatus = 1
#         """, item_code)[0][0]

#         safety_stock = frappe.db.get_value("Item", item_code, "safety_stock") or 0
#         available = on_hand - safety_stock
#         gross_req = so_qty - available - po_qty

#         # ---------------- SNAPSHOT CHECK ----------------
#         state = f"{so_qty}|{on_hand}|{po_qty}|{gross_req}"
#         last_state = frappe.db.get_value("Item", item_code, "last_mrp_snapshot")

#         if last_state == state:
#             frappe.throw(
#                 f"Purchase Order NOT allowed for Item {item_code} because MRP values "
#                 f"have not changed since last PO."
#             )

#         # ---------------- SUPPLIER ----------------
#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item_code},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item {item_code}")

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item_code,
#             "qty": qty,
#             "schedule_date": nowdate()
#         })

#         # SAVE NEW SNAPSHOT
#         frappe.db.set_value("Item", item_code, "last_mrp_snapshot", state)


#     last_po = None

#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po



# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB (12AM)
# # =====================================================
# @frappe.whitelist()
# def auto_create_purchase_orders():

#     mrp_data = get_mrp_data()
#     supplier_map = {}

#     for row in mrp_data:
#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue

#         # BUILD SNAPSHOT STRING
#         state = f"{row.get('open_sales_order')}|{row.get('on_hand_qty')}|{row.get('po_qty')}|{row.get('gross_requirement')}"
#         last_state = frappe.db.get_value("Item", item, "last_mrp_snapshot")

#         # 🚫 BLOCK IF NOTHING CHANGED
#         if last_state == state:
#             continue

#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.log_error(f"No Default Supplier for Item {item}", "MRP Auto PO")
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#         # UPDATE SNAPSHOT
#         frappe.db.set_value("Item", item, "last_mrp_snapshot", state)


#     created = []

#     for supplier, po_items in supplier_map.items():

#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()

#         created.append(po.name)

#     return created



# # =====================================================
# # ⭐ OPEN SALES ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             soi.delivered_qty,
#             (soi.qty - soi.delivered_qty) AS pending_qty
#         FROM `tabSales Order Item` soi
#         WHERE soi.item_code = %s
#         AND soi.docstatus = 1
#     """, item_code, as_dict=True)



# # =====================================================
# # ⭐ OPEN PURCHASE ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             poi.received_qty,
#             (poi.qty - poi.received_qty) AS pending_qty
#         FROM `tabPurchase Order Item` poi
#         WHERE poi.item_code = %s
#         AND poi.docstatus = 1
#     """, item_code, as_dict=True)


# import frappe
# from frappe.utils import nowdate


# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE STOCK ----------------
#         available = on_hand - (item.safety_stock or 0)

#         # ---------------- OPEN SALES ORDER (Only Pending) ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabSales Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER (Only Pending) ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabPurchase Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         planned = 0
#         safety = item.safety_stock or 0
#         moq = item.moq or 0

#         # RULE 1
#         if on_hand == safety and moq > 0:
#             planned = moq

#         # RULE 2
#         elif gross_requirement <= 0:
#             planned = 0

#         # RULE 3
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned = moq

#         # RULE 4
#         elif gross_requirement >= moq:
#             planned = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "moq": moq,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "planned_purchase_qty": planned
#         })

#     return result



# # =====================================================
# # ⭐ MANUAL PURCHASE ORDER BUTTON
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items):
#     items = frappe.parse_json(items)

#     if not items:
#         return

#     supplier_map = {}

#     for row in items:
#         item_code = row.get("item")
#         qty = row.get("planned_qty")

#         if qty <= 0:
#             continue

#         # ---------------- RE-CHECK LIVE MRP VALUES ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s AND docstatus = 1
#         """, item_code)[0][0]

#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s AND docstatus = 1
#         """, item_code)[0][0]

#         safety_stock = frappe.db.get_value("Item", item_code, "safety_stock") or 0
#         available = on_hand - safety_stock
#         gross_req = so_qty - available - po_qty

#         # ---------------- SNAPSHOT CHECK ----------------
#         state = f"{so_qty}|{on_hand}|{po_qty}|{gross_req}"
#         last_state = frappe.db.get_value("Item", item_code, "last_mrp_snapshot")

#         if last_state == state:
#             frappe.throw(
#                 f"Purchase Order NOT allowed for Item {item_code} because MRP values "
#                 f"have not changed since last PO."
#             )

#         # ---------------- SUPPLIER ----------------
#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item_code},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item {item_code}")

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item_code,
#             "qty": qty,
#             "schedule_date": nowdate()
#         })

#         # SAVE NEW SNAPSHOT
#         frappe.db.set_value("Item", item_code, "last_mrp_snapshot", state)


#     last_po = None

#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po



# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB (12AM)
# # =====================================================
# @frappe.whitelist()
# def auto_create_purchase_orders():

#     mrp_data = get_mrp_data()
#     supplier_map = {}

#     for row in mrp_data:
#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue

#         # BUILD SNAPSHOT STRING
#         state = f"{row.get('open_sales_order')}|{row.get('on_hand_qty')}|{row.get('po_qty')}|{row.get('gross_requirement')}"
#         last_state = frappe.db.get_value("Item", item, "last_mrp_snapshot")

#         # 🚫 BLOCK IF NOTHING CHANGED
#         if last_state == state:
#             continue

#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.log_error(f"No Default Supplier for Item {item}", "MRP Auto PO")
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#         # UPDATE SNAPSHOT
#         frappe.db.set_value("Item", item, "last_mrp_snapshot", state)


#     created = []

#     for supplier, po_items in supplier_map.items():

#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()

#         created.append(po.name)

#     return created



# # =====================================================
# # ⭐ OPEN SALES ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             soi.delivered_qty,
#             (soi.qty - soi.delivered_qty) AS pending_qty
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so
#             ON so.name = soi.parent
#         WHERE 
#             soi.item_code = %s
#             AND soi.docstatus = 1
#             AND so.status NOT IN ('Cancelled','Closed')
#             AND (soi.qty - soi.delivered_qty) > 0
#         ORDER BY so.transaction_date DESC
#     """, item_code, as_dict=True)



# # =====================================================
# # ⭐ OPEN PURCHASE ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             poi.received_qty,
#             (poi.qty - poi.received_qty) AS pending_qty
#         FROM `tabPurchase Order Item` poi
#         INNER JOIN `tabPurchase Order` po
#             ON po.name = poi.parent
#         WHERE 
#             poi.item_code = %s
#             AND poi.docstatus = 1
#             AND po.status NOT IN ('Cancelled','Closed')
#             AND (poi.qty - poi.received_qty) > 0
#         ORDER BY po.transaction_date DESC
#     """, item_code, as_dict=True)


# import frappe
# from frappe.utils import nowdate


# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE STOCK ----------------
#         available = on_hand - (item.safety_stock or 0)

#         # ---------------- OPEN SALES ORDER (Only Pending) ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabSales Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER (Only Pending) ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabPurchase Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         planned = 0
#         safety = item.safety_stock or 0
#         moq = item.moq or 0

#         # RULE 1
#         if on_hand == safety and moq > 0:
#             planned = moq

#         # RULE 2
#         elif gross_requirement <= 0:
#             planned = 0

#         # RULE 3
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned = moq

#         # RULE 4
#         elif gross_requirement >= moq:
#             planned = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "moq": moq,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "planned_purchase_qty": planned
#         })

#     return result



# # =====================================================
# # ⭐ MANUAL PURCHASE ORDER BUTTON
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items):
#     items = frappe.parse_json(items)

#     if not items:
#         return

#     # Check if all planned_qty are 0
#     if not any((row.get("planned_qty") or 0) > 0 for row in items):
#         frappe.throw("Purchase Order cannot be created because all 'Planned to Purchase Qty' values are 0.")

#     supplier_map = {}

#     for row in items:
#         item_code = row.get("item")
#         qty = row.get("planned_qty")

#         if qty <= 0:
#             frappe.throw(
#                 f"Cannot create Purchase Order for Item <b>{item_code}</b> because "
#                 f"<b>Planned to Purchase Qty is 0</b>."
#             )

#         # ---------------- RE-CHECK LIVE MRP VALUES ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s AND docstatus = 1
#         """, item_code)[0][0]

#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s AND docstatus = 1
#         """, item_code)[0][0]

#         safety_stock = frappe.db.get_value("Item", item_code, "safety_stock") or 0
#         available = on_hand - safety_stock
#         gross_req = so_qty - available - po_qty

#         # ---------------- SNAPSHOT CHECK ----------------
#         state = f"{so_qty}|{on_hand}|{po_qty}|{gross_req}"
#         last_state = frappe.db.get_value("Item", item_code, "last_mrp_snapshot")

#         if last_state == state:
#             frappe.throw(
#                 f"Purchase Order NOT allowed for Item {item_code} because MRP values "
#                 f"have not changed since last PO."
#             )

#         # ---------------- SUPPLIER ----------------
#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item_code},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item {item_code}")

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item_code,
#             "qty": qty,
#             "schedule_date": nowdate()
#         })

#         # SAVE NEW SNAPSHOT
#         frappe.db.set_value("Item", item_code, "last_mrp_snapshot", state)


#     last_po = None

#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po



# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB (12AM)
# # =====================================================
# @frappe.whitelist()
# def auto_create_purchase_orders():

#     mrp_data = get_mrp_data()
#     supplier_map = {}

#     for row in mrp_data:
#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue

#         # BUILD SNAPSHOT STRING
#         state = f"{row.get('open_sales_order')}|{row.get('on_hand_qty')}|{row.get('po_qty')}|{row.get('gross_requirement')}"
#         last_state = frappe.db.get_value("Item", item, "last_mrp_snapshot")

#         # 🚫 BLOCK IF NOTHING CHANGED
#         if last_state == state:
#             continue

#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.log_error(f"No Default Supplier for Item {item}", "MRP Auto PO")
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#         # UPDATE SNAPSHOT
#         frappe.db.set_value("Item", item, "last_mrp_snapshot", state)


#     created = []

#     for supplier, po_items in supplier_map.items():

#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()

#         created.append(po.name)

#     return created



# # =====================================================
# # ⭐ OPEN SALES ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             soi.delivered_qty,
#             (soi.qty - soi.delivered_qty) AS pending_qty
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so
#             ON so.name = soi.parent
#         WHERE 
#             soi.item_code = %s
#             AND soi.docstatus = 1
#             AND so.status NOT IN ('Cancelled','Closed')
#             AND (soi.qty - soi.delivered_qty) > 0
#         ORDER BY so.transaction_date DESC
#     """, item_code, as_dict=True)



# # =====================================================
# # ⭐ OPEN PURCHASE ORDER POPUP DATA
# # =====================================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             poi.received_qty,
#             (poi.qty - poi.received_qty) AS pending_qty
#         FROM `tabPurchase Order Item` poi
#         INNER JOIN `tabPurchase Order` po
#             ON po.name = poi.parent
#         WHERE 
#             poi.item_code = %s
#             AND poi.docstatus = 1
#             AND po.status NOT IN ('Cancelled','Closed')
#             AND (poi.qty - poi.received_qty) > 0
#         ORDER BY po.transaction_date DESC
#     """, item_code, as_dict=True)

# below script is working till date
# import frappe
# from frappe.utils import nowdate


# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE STOCK ----------------
#         available = on_hand - (item.safety_stock or 0)

#         # ---------------- OPEN SALES ORDER ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabSales Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabPurchase Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         planned = 0
#         safety = item.safety_stock or 0
#         moq = item.moq or 0

#         if on_hand == safety and moq > 0:
#             planned = moq
#         elif gross_requirement <= 0:
#             planned = 0
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned = moq
#         elif gross_requirement >= moq:
#             planned = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "moq": moq,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "planned_purchase_qty": planned
#         })

#     return result



# # =====================================================
# # ⭐ MANUAL PURCHASE ORDER BUTTON
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items):
#     items = frappe.parse_json(items)

#     if not items:
#         return

#     # Block if all qty = 0
#     if not any((row.get("planned_qty") or 0) > 0 for row in items):
#         frappe.throw("Purchase Order cannot be created because all 'Planned to Purchase Qty' values are 0.")

#     supplier_map = {}

#     for row in items:
#         item_code = row.get("item")
#         qty = row.get("planned_qty")

#         if qty <= 0:
#             frappe.throw(
#                 f"Cannot create Purchase Order for Item <b>{item_code}</b> because "
#                 f"<b>Planned to Purchase Qty is 0</b>."
#             )

#         # SUPPLIER
#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item_code},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item {item_code}")

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item_code,
#             "qty": qty,
#             "schedule_date": nowdate()
#         })

#     last_po = None

#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po



# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB (12AM)
# # =====================================================
# @frappe.whitelist()
# def auto_create_purchase_orders():

#     mrp_data = get_mrp_data()
#     supplier_map = {}

#     for row in mrp_data:
#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue

#         supplier = frappe.db.get_value(
#             "Item Default",
#             {"parent": item},
#             "default_supplier"
#         )

#         if not supplier:
#             frappe.log_error(f"No Default Supplier for Item {item}", "MRP Auto PO")
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#     created = []

#     for supplier, po_items in supplier_map.items():

#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()

#         created.append(po.name)

#     return created



# # =====================================================
# # ⭐ SALES ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             soi.delivered_qty,
#             (soi.qty - soi.delivered_qty) AS pending_qty
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so
#             ON so.name = soi.parent
#         WHERE 
#             soi.item_code = %s
#             AND soi.docstatus = 1
#             AND so.status NOT IN ('Cancelled','Closed')
#             AND (soi.qty - soi.delivered_qty) > 0
#         ORDER BY so.transaction_date DESC
#     """, item_code, as_dict=True)



# # =====================================================
# # ⭐ PURCHASE ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             poi.received_qty,
#             (poi.qty - poi.received_qty) AS pending_qty
#         FROM `tabPurchase Order Item` poi
#         INNER JOIN `tabPurchase Order` po
#             ON po.name = poi.parent
#         WHERE 
#             poi.item_code = %s
#             AND poi.docstatus = 1
#             AND po.status NOT IN ('Cancelled','Closed')
#             AND (poi.qty - poi.received_qty) > 0
#         ORDER BY po.transaction_date DESC
#     """, item_code, as_dict=True)


# if scheduler is not run then show in table

# import frappe
# from frappe.utils import nowdate


# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE STOCK ----------------
#         safety = item.safety_stock or 0
#         available = on_hand - safety

#         # ---------------- OPEN SALES ORDER ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabSales Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus = 1
#             AND parent IN (
#                 SELECT name FROM `tabPurchase Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         moq = item.moq or 0
#         planned_purchase_qty = 0

#         if gross_requirement <= 0:
#             planned_purchase_qty = 0
#         elif gross_requirement > 0 and gross_requirement < moq:
#             planned_purchase_qty = moq
#         elif gross_requirement >= moq:
#             planned_purchase_qty = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": moq,
#             "planned_purchase_qty": planned_purchase_qty
#         })

#     return result


# # =====================================================
# # 🚀 CREATE PURCHASE ORDER
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items, send_email_on_mrp=None):
#     items = frappe.parse_json(items)

#     if not items:
#         frappe.throw("No items received")

#     # ❌ Do not allow PO if any planned qty = 0
#     zero_items = [d["item"] for d in items if not d["planned_qty"] or d["planned_qty"] <= 0]
#     if zero_items:
#         frappe.throw(f"Planned Qty is 0 for: {', '.join(zero_items)}. Cannot create PO.")

#     # GROUP ITEMS BY SUPPLIER
#     supplier_map = {}
#     for d in items:
#         supplier = frappe.db.get_value("Item Default", {"parent": d["item"]}, "default_supplier")
#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item: {d['item']}")
#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": d["item"],
#             "qty": d["planned_qty"],
#             "schedule_date": nowdate()
#         })

#     last_po = None
#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         if send_email_on_mrp:
#             po.send_email_on_mrp = 1

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po


# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB (12AM)
# # =====================================================
# @frappe.whitelist()


# def auto_create_purchase_orders():
#     mrp_data = get_mrp_data()
#     supplier_map = {}
#     log_entries = []

#     for row in mrp_data:
#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue  

#         supplier = frappe.db.get_value("Item Default", {"parent": item}, "default_supplier")
#         if not supplier:
#             log_entries.append({
#                 "item": item,
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "reason": "Default Supplier not set"
#             })
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#     created_pos = []

#     for supplier, po_items in supplier_map.items():

#         # 🔴🔴 NEW VALIDATION → CHECK RATE BEFORE MAKING PO
#         zero_rate_items = []
#         for i in po_items:
#             rate = frappe.db.get_value(
#                 "Item Price",
#                 {"item_code": i["item_code"]},
#                 "price_list_rate"
#             )

#             if not rate or float(rate) == 0:
#                 zero_rate_items.append(i["item_code"])

#         if zero_rate_items:
#             for itm in zero_rate_items:
#                 log_entries.append({
#                     "item": itm,
#                     "run_date": nowdate(),
#                     "status": "Failed",
#                     "reason": "Rate not set in Price List (Rate = 0)"
#                 })
            
#             continue   # 🔴 Skip PO creation for this supplier


#         # ==========================
#         # CREATE PURCHASE ORDER
#         # ==========================
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items,
#             "send_email_on_mrp": 1
#         })

#         po.insert(ignore_permissions=True)
#         po.submit()
#         created_pos.append(po.name)


#     # ==========================
#     # LOG FAILED ENTRIES
#     # ==========================
#     for log in log_entries:
#         frappe.get_doc({
#             "doctype": "MRP Scheduler Log",
#             "run_date": log["run_date"],
#             "status": log["status"],
#             "item": log.get("item"),
#             "reason": log["reason"]
#         }).insert(ignore_permissions=True)

#     return created_pos


# # =====================================================
# # ⭐ SALES ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []
#     return frappe.db.sql("""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             soi.delivered_qty,
#             (soi.qty - soi.delivered_qty) AS pending_qty
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so
#             ON so.name = soi.parent
#         WHERE 
#             soi.item_code = %s
#             AND soi.docstatus = 1
#             AND so.status NOT IN ('Cancelled','Closed')
#             AND (soi.qty - soi.delivered_qty) > 0
#         ORDER BY so.transaction_date DESC
#     """, item_code, as_dict=True)


# # =====================================================
# # ⭐ PURCHASE ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []
#     return frappe.db.sql("""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             poi.received_qty,
#             (poi.qty - poi.received_qty) AS pending_qty
#         FROM `tabPurchase Order Item` poi
#         INNER JOIN `tabPurchase Order` po
#             ON po.name = poi.parent
#         WHERE 
#             poi.item_code = %s
#             AND poi.docstatus = 1
#             AND po.status NOT IN ('Cancelled','Closed')
#             AND (poi.qty - poi.received_qty) > 0
#         ORDER BY po.transaction_date DESC
#     """, item_code, as_dict=True)


# below script added if item price is is 0 or less than 0 not allow po generation
# import frappe
# from frappe.utils import nowdate

# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

#         # ---------------- AVAILABLE STOCK ----------------
#         safety = item.safety_stock or 0
#         available = on_hand - safety

#         # ---------------- OPEN SALES ORDER ----------------
#         so_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
            
#             AND docstatus IN (1)
#             AND parent IN (
#                 SELECT name FROM `tabSales Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_qty = frappe.db.sql("""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
           
#             AND docstatus IN (1)
#             AND parent IN (
#                 SELECT name FROM `tabPurchase Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         moq = item.moq or 0
#         planned_purchase_qty = 0

#         # if gross_requirement <= 0:
#         #     planned_purchase_qty = 0
#         # elif gross_requirement > 0 and gross_requirement < moq:
#         #     planned_purchase_qty = moq
#         # elif gross_requirement >= moq:
#         #     planned_purchase_qty = gross_requirement
#         if on_hand == safety:
#              planned_purchase_qty = moq
#         elif gross_requirement <= 0:
#              planned_purchase_qty = 0
#         elif gross_requirement < moq:
#              planned_purchase_qty = moq
#         else:
#              planned_purchase_qty = gross_requirement

#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": moq,
#             "planned_purchase_qty": planned_purchase_qty
#         })

#     return result

# # =====================================================
# # 🚀 CREATE PURCHASE ORDER
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items, send_email_on_mrp=None):
#     items = frappe.parse_json(items)

#     if not items:
#         frappe.throw("No items received")

#     # ❌ Do not allow PO if any planned qty = 0
#     zero_items = [d["item"] for d in items if not d["planned_qty"] or d["planned_qty"] <= 0]
#     if zero_items:
#         frappe.throw(f"Planned Qty is 0 for: {', '.join(zero_items)}. Cannot create PO.")

#     # 🔴 CHECK ITEM PRICE BEFORE CREATING PO
#     for d in items:
#         rate = frappe.db.get_value(
#             "Item Price",
#             {"item_code": d["item"]},
#             "price_list_rate"
#         )
#         if rate is None or float(rate) <= 0:
#             # Log failed item
#             frappe.get_doc({
#                 "doctype": "MRP Scheduler Log",
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "item": d["item"],
#                 "reason": "Rate not set in Price List (≤ 0)"
#             }).insert(ignore_permissions=True)

#             frappe.throw(f"Cannot create PO for Item {d['item']}: Rate not set in Price List (≤ 0)")

#     # GROUP ITEMS BY SUPPLIER
#     supplier_map = {}
#     for d in items:
#         supplier = frappe.db.get_value("Item Default", {"parent": d["item"]}, "default_supplier")
#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item: {d['item']}")
#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": d["item"],
#             "qty": d["planned_qty"],
#             "schedule_date": nowdate()
#         })

#     last_po = None
#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         if send_email_on_mrp:
#             po.send_email_on_mrp = 1

#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po

# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB (12AM)
# # =====================================================
# @frappe.whitelist()
# def auto_create_purchase_orders():
#     mrp_data = get_mrp_data()
#     supplier_map = {}
#     log_entries = []

#     for row in mrp_data:
#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue  

#         supplier = frappe.db.get_value("Item Default", {"parent": item}, "default_supplier")
#         if not supplier:
#             log_entries.append({
#                 "item": item,
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "reason": "Default Supplier not set"
#             })
#             continue

#         # 🔴 CHECK ITEM RATE
#         rate = frappe.db.get_value("Item Price", {"item_code": item}, "price_list_rate")
#         if rate is None or float(rate) <= 0:
#             log_entries.append({
#                 "item": item,
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "reason": "Rate not set in Price List (≤ 0)"
#             })
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "schedule_date": nowdate()
#         })

#     created_pos = []

#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "schedule_date": nowdate(),
#             "items": po_items,
#             "send_email_on_mrp": 1
#         })
#         po.insert(ignore_permissions=True)
#         po.submit()
#         created_pos.append(po.name)

#     # LOG FAILED ENTRIES
#     for log in log_entries:
#         frappe.get_doc({
#             "doctype": "MRP Scheduler Log",
#             "run_date": log["run_date"],
#             "status": log["status"],
#             "item": log.get("item"),
#             "reason": log["reason"]
#         }).insert(ignore_permissions=True)

#     return created_pos

# # =====================================================
# # ⭐ SALES ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# # def get_sales_orders_for_item(item_code):
# #     if not item_code:
# #         return []
# #     return frappe.db.sql("""
# #         SELECT 
# #             soi.parent AS sales_order,
# #             soi.qty,
# #             soi.delivered_qty,
# #             (soi.qty - soi.delivered_qty) AS pending_qty
# #         FROM `tabSales Order Item` soi
# #         INNER JOIN `tabSales Order` so
# #             ON so.name = soi.parent
# #         WHERE 
# #             soi.item_code = %s
# #             AND soi.docstatus IN (0,1)
# #             AND so.status NOT IN ('Cancelled','Closed')
# #             AND (soi.qty - soi.delivered_qty) > 0
# #         ORDER BY so.transaction_date DESC
# #     """, item_code, as_dict=True)
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             IFNULL(soi.delivered_qty,0) AS delivered_qty,
#             (soi.qty - IFNULL(soi.delivered_qty,0)) AS pending_qty,
#             soi.delivery_date
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so
#             ON so.name = soi.parent
#         WHERE 
#             soi.item_code = %s
#             AND soi.docstatus IN (1)
#             AND so.status NOT IN ('Cancelled','Closed')
#             AND (soi.qty - IFNULL(soi.delivered_qty,0)) > 0
#         ORDER BY soi.delivery_date ASC
#     """, item_code, as_dict=True)

# # =====================================================
# # ⭐ PURCHASE ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# # def get_purchase_orders_for_item(item_code):
# #     if not item_code:
# #         return []
# #     return frappe.db.sql("""
# #         SELECT 
# #             poi.parent AS purchase_order,
# #             poi.qty,
# #             poi.received_qty,
# #             (poi.qty - poi.received_qty) AS pending_qty
# #         FROM `tabPurchase Order Item` poi
# #         INNER JOIN `tabPurchase Order` po
# #             ON po.name = poi.parent
# #         WHERE 
# #             poi.item_code = %s
# #             AND poi.docstatus IN (0,1)
# #             AND po.status NOT IN ('Cancelled','Closed')
# #             AND (poi.qty - poi.received_qty) > 0
# #         ORDER BY po.transaction_date DESC
# #     """, item_code, as_dict=True)
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []

#     return frappe.db.sql("""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             IFNULL(poi.received_qty,0) AS received_qty,
#             (poi.qty - IFNULL(poi.received_qty,0)) AS pending_qty,
#             poi.schedule_date
#         FROM `tabPurchase Order Item` poi
#         INNER JOIN `tabPurchase Order` po
#             ON po.name = poi.parent
#         WHERE 
#             poi.item_code = %s
#             AND poi.docstatus IN (1)
#             AND po.status NOT IN ('Cancelled','Closed','Completed')
#             AND (poi.qty - IFNULL(poi.received_qty,0)) > 0
#         ORDER BY poi.schedule_date ASC
#     """, item_code, as_dict=True)

# Comment below code
# import frappe
# from frappe.utils import nowdate

# # =====================================================
# # ⭐ FETCH MRP TABLE DATA
# # =====================================================
# @frappe.whitelist()
# def get_mrp_data():
#     # ---------------- READ STOCK SETTINGS ----------------
#     settings = frappe.get_single("Stock Settings")
#     include_draft_so = 1 if settings.consider_draft_so_mrp else 0
#     include_draft_po = 1 if settings.consider_draft_po_mrp else 0

#     items = frappe.get_all(
#         "Item",
#         filters={"is_stock_item": 1, "mrp": 1},
#         fields=["name", "safety_stock", "min_order_qty as moq", "modified"]
#     )

#     result = []

#     for item in items:
#         item_code = item.name

#         # ---------------- ON HAND STOCK ----------------
#         # on_hand = frappe.db.sql("""
#         #     SELECT IFNULL(SUM(actual_qty),0)
#         #     FROM `tabBin`
#         #     WHERE item_code=%s
#         # """, item_code)[0][0]
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty), 0)
#             FROM `tabBin`
#             WHERE item_code = %s
#             AND warehouse = %s
#         """, (item_code, "Stores - RFAPL"))[0][0]


#         # ---------------- AVAILABLE STOCK ----------------
#         safety = item.safety_stock or 0
#         available = on_hand - safety

#         # ---------------- OPEN SALES ORDER ----------------
#         so_docstatus = "(0,1)" if include_draft_so else "(1)"
#         so_qty = frappe.db.sql(f"""
#             SELECT IFNULL(SUM(qty - delivered_qty),0)
#             FROM `tabSales Order Item`
#             WHERE item_code=%s
#             AND docstatus IN {so_docstatus}
#             AND parent IN (
#                 SELECT name FROM `tabSales Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- OPEN PURCHASE ORDER ----------------
#         po_docstatus = "(0,1)" if include_draft_po else "(1)"
#         po_qty = frappe.db.sql(f"""
#             SELECT IFNULL(SUM(qty - received_qty),0)
#             FROM `tabPurchase Order Item`
#             WHERE item_code=%s
#             AND docstatus IN {po_docstatus}
#             AND parent IN (
#                 SELECT name FROM `tabPurchase Order`
#                 WHERE status NOT IN ('Cancelled','Closed')
#             )
#         """, item_code)[0][0]

#         # ---------------- GROSS REQUIREMENT ----------------
#         gross_requirement = so_qty - available - po_qty

#         # ---------------- PLANNED PURCHASE LOGIC ----------------
#         moq = item.moq or 0
#         planned_purchase_qty = 0

#         # if on_hand == safety:
#         #     planned_purchase_qty = moq
#         # elif gross_requirement <= 0:
#         #     planned_purchase_qty = 0
#         # elif gross_requirement < moq:
#         #     planned_purchase_qty = moq
#         # else:
#         #     planned_purchase_qty = gross_requirement


#         if so_qty == 0 and safety == 0:
#             planned_purchase_qty = 0
#         elif so_qty > 0 and moq <= 0:
#             planned_purchase_qty = gross_requirement
#         # elif so_qty <= 0:
#         #     planned_purchase_qty = 0
#         elif so_qty >0 and safety == 0 and available == 0 and moq == 0:
#             planned_purchase_qty = so_qty
#         elif so_qty >0 and safety == 0 and available == 0 and moq > 0 and so_qty < moq:
#             planned_purchase_qty = moq
#         elif so_qty >0 and safety == 0 and available == 0:
#             planned_purchase_qty = so_qty
#         elif safety == 0 and available == 0:
#             planned_purchase_qty = so_qty
#         elif gross_requirement <= 0:
#             planned_purchase_qty = 0
        
#         elif on_hand == safety:
#             planned_purchase_qty = moq
#         elif gross_requirement <= 0:
#             planned_purchase_qty = 0
#         elif gross_requirement < moq:
#             planned_purchase_qty = moq
#         else:
#             planned_purchase_qty = gross_requirement



#         result.append({
#             "item": item_code,
#             "safety_stock": safety,
#             "on_hand_qty": on_hand,
#             "available_qty": available,
#             "open_sales_order": so_qty,
#             "po_qty": po_qty,
#             "gross_requirement": gross_requirement,
#             "moq": moq,
#             "planned_purchase_qty": planned_purchase_qty
#         })

#     return result



# # =====================================================
# # 🚀 CREATE PURCHASE ORDER
# # =====================================================
# @frappe.whitelist()
# def create_purchase_order(items, send_email_on_mrp=None):
#     items = frappe.parse_json(items)

#     if not items:
#         frappe.throw("No items received")

#     zero_items = [d["item"] for d in items if not d["planned_qty"] or d["planned_qty"] <= 0]
#     if zero_items:
#         for item_code in zero_items:
#             frappe.get_doc({
#                 "doctype": "MRP Scheduler Log",
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "item": item_code,
#                 "reason": f"Planned Qty is 0 for: {item_code}. Cannot create PO."
#             }).insert(ignore_permissions=True)
#         frappe.throw(f"Planned Qty is 0 for: {', '.join(zero_items)}. Cannot create PO.")

#     # 🔴 CHECK ITEM PRICE BEFORE CREATING PO
#     for d in items:
#         item_code = d["item"]
#         rate = frappe.db.get_value("Item Price", {
#             "item_code": item_code,
#             "price_list": "Standard Buying"
#         }, "price_list_rate")

#         if rate is None:
#             # Missing Price List entry
#             frappe.get_doc({
#                 "doctype": "MRP Scheduler Log",
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "item": item_code,
#                 "reason": "Price list not set"
#             }).insert(ignore_permissions=True)
#             frappe.throw(f"Cannot create PO for Item {item_code}: Price list not set")

#         if float(rate) <= 0:
#             # Zero or Negative Rate
#             frappe.get_doc({
#                 "doctype": "MRP Scheduler Log",
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "item": item_code,
#                 "reason": "Rate is not set in the Price List. The rate must be greater than 0."
#             }).insert(ignore_permissions=True)
#             frappe.throw(f"Cannot create PO for Item {item_code}: Rate is not set in the Price List. The rate must be greater than 0.")
        
#         d["rate"] = rate

#     supplier_map = {}
#     for d in items:
#         supplier = frappe.db.get_value("Item Default", {"parent": d["item"]}, "default_supplier")
#         if not supplier:
#             frappe.throw(f"No Default Supplier found for Item: {d['item']}")
#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": d["item"],
#             "qty": d["planned_qty"],
#             "rate": d.get("rate"),
#             "schedule_date": nowdate()
#         })

#     default_company = frappe.db.get_single_value('Global Defaults', 'default_company') or frappe.db.get_value('Company', {}, 'name')

#     last_po = None
#     for supplier, po_items in supplier_map.items():
#         po = frappe.get_doc({
#             "doctype": "Purchase Order",
#             "supplier": supplier,
#             "company": default_company,
#             "schedule_date": nowdate(),
#             "items": po_items
#         })

#         if send_email_on_mrp:
#             po.send_email_on_mrp = 1

#         po.run_method("set_missing_values")
#         po.insert(ignore_permissions=True)
#         po.submit()
#         last_po = po.name

#     return last_po


# # =====================================================
# # ⭐ HELPER: ENSURE MRP SCHEDULER SYSTEM USER EXISTS
# # =====================================================
# def ensure_mrp_scheduler_user():
#     """Create or get the MRP Scheduler system user"""
#     user_email = "mrp.scheduler@system.local"
    
#     if frappe.db.exists("User", user_email):
#         return user_email
    
#     try:
#         user = frappe.get_doc({
#             "doctype": "User",
#             "email": user_email,
#             "first_name": "Auto Generated Through System",
#             "enabled": 1,
#             "user_type": "System User",
#             "send_welcome_email": 0
#         })
#         user.insert(ignore_permissions=True)
#         frappe.db.commit()
#         return user_email
#     except Exception as e:
#         frappe.log_error(f"Failed to create MRP Scheduler user: {str(e)}")
#         return "Administrator"


# # =====================================================
# # ⭐ AUTO DAILY MRP PURCHASE JOB
# # =====================================================
# @frappe.whitelist()
# def auto_create_purchase_orders():
#     # Set user context to MRP Scheduler system user
#     mrp_user = ensure_mrp_scheduler_user()
#     frappe.set_user(mrp_user)
    
#     mrp_data = get_mrp_data()
#     supplier_map = {}
#     log_entries = []

#     for row in mrp_data:
#         item = row.get("item")
#         planned_qty = row.get("planned_purchase_qty") or 0

#         if planned_qty <= 0:
#             continue  

#         supplier = frappe.db.get_value("Item Default", {"parent": item}, "default_supplier")
#         if not supplier:
#             log_entries.append({
#                 "item": item,
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "reason": "Default Supplier not set"
#             })
#             continue

#         rate = frappe.db.get_value("Item Price", {
#             "item_code": item,
#             "price_list": "Standard Buying"
#         }, "price_list_rate")

#         if rate is None:
#             log_entries.append({
#                 "item": item,
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "reason": "Price list not set"
#             })
#             continue

#         if float(rate) <= 0:
#             log_entries.append({
#                 "item": item,
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "reason": "Rate is not set in the Price List. The rate must be greater than 0."
#             })
#             continue

#         supplier_map.setdefault(supplier, [])
#         supplier_map[supplier].append({
#             "item_code": item,
#             "qty": planned_qty,
#             "rate": rate,
#             "schedule_date": nowdate()
#         })

#     default_company = frappe.db.get_single_value('Global Defaults', 'default_company') or frappe.db.get_value('Company', {}, 'name')
#     created_pos = []

#     for supplier, po_items in supplier_map.items():
#         try:
#             po = frappe.get_doc({
#                 "doctype": "Purchase Order",
#                 "supplier": supplier,
#                 "company": default_company,
#                 "schedule_date": nowdate(),
#                 "items": po_items,
#                 "send_email_on_mrp": 1
#             })
#             po.run_method("set_missing_values")
#             po.insert(ignore_permissions=True)
            
#             # Add comment to indicate auto-generation
#             po.add_comment("Info", "Auto-generated by MRP Scheduler at " + frappe.utils.now())
            
#             po.submit()
#             created_pos.append(po.name)
            
#             # Create success log for each item in this PO
#             for po_item in po_items:
#                 log_entries.append({
#                     "item": po_item["item_code"],
#                     "run_date": nowdate(),
#                     "status": "Success",
#                     "po_id": po.name,
#                     "reason": ""
#                 })
#         except Exception as e:
#             # Log failure if PO creation/submission fails
#             for po_item in po_items:
#                 log_entries.append({
#                     "item": po_item["item_code"],
#                     "run_date": nowdate(),
#                     "status": "Failed",
#                     "reason": f"PO creation failed: {str(e)}"
#                 })

#     # Insert all log entries (both success and failure)
#     for log in log_entries:
#         frappe.get_doc({
#             "doctype": "MRP Scheduler Log",
#             "run_date": log["run_date"],
#             "status": log["status"],
#             "item": log.get("item"),
#             "po_id": log.get("po_id"),
#             "reason": log.get("reason", "")
#         }).insert(ignore_permissions=True)
    
#     # Commit to ensure logs are saved
#     frappe.db.commit()

#     return created_pos


# # =====================================================
# # ⭐ SALES ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# def get_sales_orders_for_item(item_code):
#     if not item_code:
#         return []

#     settings = frappe.get_single("Stock Settings")
#     docstatus_condition = "(0,1)" if settings.consider_draft_so_mrp else "(1)"

#     return frappe.db.sql(f"""
#         SELECT 
#             soi.parent AS sales_order,
#             soi.qty,
#             IFNULL(soi.delivered_qty,0) AS delivered_qty,
#             (soi.qty - IFNULL(soi.delivered_qty,0)) AS pending_qty,
#             soi.delivery_date
#         FROM `tabSales Order Item` soi
#         INNER JOIN `tabSales Order` so
#             ON so.name = soi.parent
#         WHERE 
#             soi.item_code = %s
#             AND soi.docstatus IN {docstatus_condition}
#             AND so.status NOT IN ('Cancelled','Closed')
#             AND (soi.qty - IFNULL(soi.delivered_qty,0)) > 0
#         ORDER BY soi.delivery_date ASC
#     """, item_code, as_dict=True)


# # =====================================================
# # ⭐ PURCHASE ORDER POPUP
# # =====================================================
# @frappe.whitelist()
# def get_purchase_orders_for_item(item_code):
#     if not item_code:
#         return []

#     settings = frappe.get_single("Stock Settings")
#     docstatus_condition = "(0,1)" if settings.consider_draft_po_mrp else "(1)"

#     return frappe.db.sql(f"""
#         SELECT 
#             poi.parent AS purchase_order,
#             poi.qty,
#             IFNULL(poi.received_qty,0) AS received_qty,
#             (poi.qty - IFNULL(poi.received_qty,0)) AS pending_qty,
#             poi.schedule_date
#         FROM `tabPurchase Order Item` poi
#         INNER JOIN `tabPurchase Order` po
#             ON po.name = poi.parent
#         WHERE 
#             poi.item_code = %s
#             AND poi.docstatus IN {docstatus_condition}
#             AND po.status NOT IN ('Cancelled','Closed','Completed')
#             AND (poi.qty - IFNULL(poi.received_qty,0)) > 0
#         ORDER BY poi.schedule_date ASC
#     """, item_code, as_dict=True)

# add uat script
import frappe
from frappe.utils import nowdate

# =====================================================
# ⭐ FETCH MRP TABLE DATA
# =====================================================
@frappe.whitelist()
def get_mrp_data():
    # ---------------- READ STOCK SETTINGS ----------------
    settings = frappe.get_single("Stock Settings")
    include_draft_so = 1 if settings.consider_draft_so_mrp else 0
    include_draft_po = 1 if settings.consider_draft_po_mrp else 0

    items = frappe.get_all(
        "Item",
        filters={"is_stock_item": 1, "mrp": 1},
        fields=["name", "safety_stock", "min_order_qty as moq", "modified"]
    )

    result = []

    for item in items:
        item_code = item.name

        # ---------------- ON HAND STOCK ----------------
        # on_hand = frappe.db.sql("""
        #     SELECT IFNULL(SUM(actual_qty),0)
        #     FROM `tabBin`
        #     WHERE item_code=%s
        # """, item_code)[0][0]
        on_hand = frappe.db.sql("""
            SELECT IFNULL(SUM(actual_qty), 0)
            FROM `tabBin`
            WHERE item_code = %s
            AND warehouse = %s
        """, (item_code, "Stores - RFAPL"))[0][0]


        # ---------------- AVAILABLE STOCK ----------------
        safety = item.safety_stock or 0
        available = on_hand - safety

        # ---------------- OPEN SALES ORDER ----------------
        so_docstatus = "(0,1)" if include_draft_so else "(1)"
        so_qty = frappe.db.sql(f"""
            SELECT IFNULL(SUM(qty - delivered_qty),0)
            FROM `tabSales Order Item`
            WHERE item_code=%s
            AND docstatus IN {so_docstatus}
            AND parent IN (
                SELECT name FROM `tabSales Order`
                WHERE status NOT IN ('Cancelled','Closed')
            )
        """, item_code)[0][0]

        # ---------------- OPEN PURCHASE ORDER ----------------
        po_docstatus = "(0,1)" if include_draft_po else "(1)"
        po_qty = frappe.db.sql(f"""
            SELECT IFNULL(SUM(qty - received_qty),0)
            FROM `tabPurchase Order Item`
            WHERE item_code=%s
            AND docstatus IN {po_docstatus}
            AND parent IN (
                SELECT name FROM `tabPurchase Order`
                WHERE status NOT IN ('Cancelled','Closed')
            )
        """, item_code)[0][0]

        # ---------------- GROSS REQUIREMENT ----------------
        gross_requirement = so_qty - available - po_qty

        # ---------------- PLANNED PURCHASE LOGIC ----------------
        moq = item.moq or 0
        planned_purchase_qty = 0

        # if on_hand == safety:
        #     planned_purchase_qty = moq
        # elif gross_requirement <= 0:
        #     planned_purchase_qty = 0
        # elif gross_requirement < moq:
        #     planned_purchase_qty = moq
        # else:
        #     planned_purchase_qty = gross_requirement


        if so_qty == 0 and safety == 0:
            planned_purchase_qty = 0
        elif gross_requirement <= 0:
            planned_purchase_qty = 0
        elif so_qty > 0 and moq <= 0:
            planned_purchase_qty = gross_requirement
        # elif so_qty <= 0:
        #     planned_purchase_qty = 0
        elif so_qty >0 and safety == 0 and available == 0 and moq == 0:
            planned_purchase_qty = so_qty
        elif so_qty >0 and safety == 0 and available == 0 and moq > 0 and so_qty < moq:
            planned_purchase_qty = moq
        elif so_qty >0 and safety == 0 and available == 0:
            planned_purchase_qty = so_qty
        elif safety == 0 and available == 0:
            planned_purchase_qty = so_qty
        elif on_hand == safety:
            planned_purchase_qty = moq
        # elif gross_requirement <= 0:
        #     planned_purchase_qty = 0
        elif gross_requirement < moq:
            planned_purchase_qty = moq
        else:
            planned_purchase_qty = gross_requirement



        result.append({
            "item": item_code,
            "safety_stock": safety,
            "on_hand_qty": on_hand,
            "available_qty": available,
            "open_sales_order": so_qty,
            "po_qty": po_qty,
            "gross_requirement": gross_requirement,
            "moq": moq,
            "planned_purchase_qty": planned_purchase_qty
        })

    return result


# =====================================================
# 🚀 CREATE PURCHASE ORDER
# =====================================================
@frappe.whitelist()
def create_purchase_order(items, send_email_on_mrp=None):
    items = frappe.parse_json(items)

    if not items:
        frappe.throw("No items received")

    zero_items = [d["item"] for d in items if not d["planned_qty"] or d["planned_qty"] <= 0]
    if zero_items:
        for item_code in zero_items:
            frappe.get_doc({
                "doctype": "MRP Scheduler Log",
                "run_date": nowdate(),
                "status": "Failed",
                "item": item_code,
                "reason": f"Planned Qty is 0 for: {item_code}. Cannot create PO."
            }).insert(ignore_permissions=True)
        frappe.throw(f"Planned Qty is 0 for: {', '.join(zero_items)}. Cannot create PO.")

    # 🔴 CHECK ITEM PRICE BEFORE CREATING PO
    for d in items:
        item_code = d["item"]
        rate = frappe.db.get_value("Item Price", {
            "item_code": item_code,
            "price_list": "Standard Buying"
        }, "price_list_rate")

        if rate is None:
            # Missing Price List entry
            frappe.get_doc({
                "doctype": "MRP Scheduler Log",
                "run_date": nowdate(),
                "status": "Failed",
                "item": item_code,
                "reason": "Price list not set"
            }).insert(ignore_permissions=True)
            frappe.throw(f"Cannot create PO for Item {item_code}: Price list not set")

        if float(rate) <= 0:
            # Zero or Negative Rate
            frappe.get_doc({
                "doctype": "MRP Scheduler Log",
                "run_date": nowdate(),
                "status": "Failed",
                "item": item_code,
                "reason": "Rate is not set in the Price List. The rate must be greater than 0."
            }).insert(ignore_permissions=True)
            frappe.throw(f"Cannot create PO for Item {item_code}: Rate is not set in the Price List. The rate must be greater than 0.")

    supplier_map = {}
    for d in items:
        supplier = frappe.db.get_value("Item Default", {"parent": d["item"]}, "default_supplier")
        if not supplier:
            frappe.throw(f"No Default Supplier found for Item: {d['item']}")
        supplier_map.setdefault(supplier, [])
        supplier_map[supplier].append({
            "item_code": d["item"],
            "qty": d["planned_qty"],
            "schedule_date": nowdate()
        })

    last_po = None
    for supplier, po_items in supplier_map.items():
        po = frappe.get_doc({
            "doctype": "Purchase Order",
            "supplier": supplier,
            "schedule_date": nowdate(),
            "items": po_items
        })

        if send_email_on_mrp:
            po.send_email_on_mrp = 1

        po.insert(ignore_permissions=True)
        po.submit()
        last_po = po.name

    return last_po


# =====================================================
# ⭐ HELPER: ENSURE MRP SCHEDULER SYSTEM USER EXISTS
# =====================================================
def ensure_mrp_scheduler_user():
    """Create or get the MRP Scheduler system user"""
    user_email = "mrp.scheduler@system.local"
    
    if frappe.db.exists("User", user_email):
        return user_email
    
    try:
        user = frappe.get_doc({
            "doctype": "User",
            "email": user_email,
            "first_name": "Auto Generated Through System",
            "enabled": 1,
            "user_type": "System User",
            "send_welcome_email": 0
        })
        user.insert(ignore_permissions=True)
        frappe.db.commit()
        return user_email
    except Exception as e:
        frappe.log_error(f"Failed to create MRP Scheduler user: {str(e)}")
        return "Administrator"


# =====================================================
# ⭐ AUTO DAILY MRP PURCHASE JOB
# =====================================================
@frappe.whitelist()
def auto_create_purchase_orders():
    # Set user context to MRP Scheduler system user
    mrp_user = ensure_mrp_scheduler_user()
    frappe.set_user(mrp_user)
    
    mrp_data = get_mrp_data()
    supplier_map = {}
    log_entries = []

    for row in mrp_data:
        item = row.get("item")
        planned_qty = row.get("planned_purchase_qty") or 0

        if planned_qty <= 0:
            continue  

        supplier = frappe.db.get_value("Item Default", {"parent": item}, "default_supplier")
        if not supplier:
            log_entries.append({
                "item": item,
                "run_date": nowdate(),
                "status": "Failed",
                "reason": "Default Supplier not set"
            })
            continue

        rate = frappe.db.get_value("Item Price", {
            "item_code": item,
            "price_list": "Standard Buying"
        }, "price_list_rate")

        if rate is None:
            log_entries.append({
                "item": item,
                "run_date": nowdate(),
                "status": "Failed",
                "reason": "Price list not set"
            })
            continue

        if float(rate) <= 0:
            log_entries.append({
                "item": item,
                "run_date": nowdate(),
                "status": "Failed",
                "reason": "Rate is not set in the Price List. The rate must be greater than 0."
            })
            continue

        supplier_map.setdefault(supplier, [])
        supplier_map[supplier].append({
            "item_code": item,
            "qty": planned_qty,
            "schedule_date": nowdate()
        })

    created_pos = []

    # Fetch default company once to use for all POs
    default_company = frappe.db.get_single_value("Global Defaults", "default_company") or frappe.defaults.get_user_default("Company")

    for supplier, po_items in supplier_map.items():
        try:
            po = frappe.new_doc("Purchase Order")
            po.supplier = supplier
            if default_company:
                po.company = default_company
            po.schedule_date = nowdate()
            po.send_email_on_mrp = 1

            for row in po_items:
                po.append("items", row)

            po.run_method("set_missing_values")
            po.run_method("calculate_taxes_and_totals")

            po.insert(ignore_permissions=True)
            
            # Add comment to indicate auto-generation
            po.add_comment("Info", "Auto-generated by MRP Scheduler at " + frappe.utils.now())
            
            po.submit()
            created_pos.append(po.name)
            
            # Create success log for each item in this PO
            for po_item in po_items:
                log_entries.append({
                    "item": po_item["item_code"],
                    "run_date": nowdate(),
                    "status": "Success",
                    "po_id": po.name,
                    "reason": ""
                })
        except Exception as e:
            # Log full traceback to Error Log (System Console)
            frappe.log_error(title="MRP Auto PO Failure")
            
            error_msg = str(e)
            if not error_msg:
                 error_msg = "Unknown Error (Check Error Log for Traceback)"

            # Log failure if PO creation/submission fails
            for po_item in po_items:
                log_entries.append({
                    "item": po_item["item_code"],
                    "run_date": nowdate(),
                    "status": "Failed",
                    "reason": f"PO creation failed: {str(e)}"
                })

    # Insert all log entries (both success and failure)
    for log in log_entries:
        frappe.get_doc({
            "doctype": "MRP Scheduler Log",
            "run_date": log["run_date"],
            "status": log["status"],
            "item": log.get("item"),
            "po_id": log.get("po_id"),
            "reason": log.get("reason", "")
        }).insert(ignore_permissions=True)
    
    # Commit to ensure logs are saved
    frappe.db.commit()

    return created_pos


# =====================================================
# ⭐ SALES ORDER POPUP
# =====================================================
@frappe.whitelist()
def get_sales_orders_for_item(item_code):
    if not item_code:
        return []

    settings = frappe.get_single("Stock Settings")
    docstatus_condition = "(0,1)" if settings.consider_draft_so_mrp else "(1)"

    return frappe.db.sql(f"""
        SELECT 
            soi.parent AS sales_order,
            soi.qty,
            IFNULL(soi.delivered_qty,0) AS delivered_qty,
            (soi.qty - IFNULL(soi.delivered_qty,0)) AS pending_qty,
            soi.delivery_date
        FROM `tabSales Order Item` soi
        INNER JOIN `tabSales Order` so
            ON so.name = soi.parent
        WHERE 
            soi.item_code = %s
            AND soi.docstatus IN {docstatus_condition}
            AND so.status NOT IN ('Cancelled','Closed')
            AND (soi.qty - IFNULL(soi.delivered_qty,0)) > 0
        ORDER BY soi.delivery_date ASC
    """, item_code, as_dict=True)


# =====================================================
# ⭐ PURCHASE ORDER POPUP
# =====================================================
@frappe.whitelist()
def get_purchase_orders_for_item(item_code):
    if not item_code:
        return []

    settings = frappe.get_single("Stock Settings")
    docstatus_condition = "(0,1)" if settings.consider_draft_po_mrp else "(1)"

    return frappe.db.sql(f"""
        SELECT 
            poi.parent AS purchase_order,
            poi.qty,
            IFNULL(poi.received_qty,0) AS received_qty,
            (poi.qty - IFNULL(poi.received_qty,0)) AS pending_qty,
            poi.schedule_date
        FROM `tabPurchase Order Item` poi
        INNER JOIN `tabPurchase Order` po
            ON po.name = poi.parent
        WHERE 
            poi.item_code = %s
            AND poi.docstatus IN {docstatus_condition}
            AND po.status NOT IN ('Cancelled','Closed','Completed')
            AND (poi.qty - IFNULL(poi.received_qty,0)) > 0
        ORDER BY poi.schedule_date ASC
    """, item_code, as_dict=True)