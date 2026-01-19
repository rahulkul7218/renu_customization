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
#         on_hand = frappe.db.sql("""
#             SELECT IFNULL(SUM(actual_qty),0)
#             FROM `tabBin`
#             WHERE item_code=%s
#         """, item_code)[0][0]

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
#         elif so_qty >0 and safety == 0 and available == 0 and moq == 0:
#             planned_purchase_qty = so_qty
#         elif so_qty >0 and safety == 0 and available == 0 and moq > 0 and so_qty < moq:
#             planned_purchase_qty = moq
#         elif so_qty >0 and safety == 0 and available == 0:
#             planned_purchase_qty = so_qty
#         elif safety == 0 and available == 0:
#             planned_purchase_qty = so_qty
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
#         frappe.throw(f"Planned Qty is 0 for: {', '.join(zero_items)}. Cannot create PO.")

#     # 🔴 CHECK ITEM PRICE BEFORE CREATING PO
#     for d in items:
#         rate = frappe.db.get_value(
#             "Item Price",
#             {"item_code": d["item"]},
#             "price_list_rate"
#         )
#         if rate is None or float(rate) <= 0:
#             frappe.get_doc({
#                 "doctype": "MRP Scheduler Log",
#                 "run_date": nowdate(),
#                 "status": "Failed",
#                 "item": d["item"],
#                 "reason": "Rate not set in Price List (≤ 0)"
#             }).insert(ignore_permissions=True)

#             frappe.throw(f"Cannot create PO for Item {d['item']}: Rate not set in Price List (≤ 0)")

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
# # ⭐ AUTO DAILY MRP PURCHASE JOB
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
        on_hand = frappe.db.sql("""
            SELECT IFNULL(SUM(actual_qty),0)
            FROM `tabBin`
            WHERE item_code=%s
        """, item_code)[0][0]

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
        elif gross_requirement <= 0:
            planned_purchase_qty = 0
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
        frappe.throw(f"Planned Qty is 0 for: {', '.join(zero_items)}. Cannot create PO.")

    # 🔴 CHECK ITEM PRICE BEFORE CREATING PO
    for d in items:
        rate = frappe.db.get_value(
            "Item Price",
            {"item_code": d["item"]},
            "price_list_rate"
        )
        if rate is None or float(rate) <= 0:
            frappe.get_doc({
                "doctype": "MRP Scheduler Log",
                "run_date": nowdate(),
                "status": "Failed",
                "item": d["item"],
                "reason": "Rate not set in Price List (≤ 0)"
            }).insert(ignore_permissions=True)

            frappe.throw(f"Cannot create PO for Item {d['item']}: Rate not set in Price List (≤ 0)")

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

        rate = frappe.db.get_value("Item Price", {"item_code": item}, "price_list_rate")
        if rate is None or float(rate) <= 0:
            log_entries.append({
                "item": item,
                "run_date": nowdate(),
                "status": "Failed",
                "reason": "Rate not set in Price List (≤ 0)"
            })
            continue

        supplier_map.setdefault(supplier, [])
        supplier_map[supplier].append({
            "item_code": item,
            "qty": planned_qty,
            "schedule_date": nowdate()
        })

    created_pos = []

    for supplier, po_items in supplier_map.items():
        try:
            po = frappe.get_doc({
                "doctype": "Purchase Order",
                "supplier": supplier,
                "schedule_date": nowdate(),
                "items": po_items,
                "send_email_on_mrp": 1
            })
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
