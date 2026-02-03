import frappe
from frappe.utils import flt

@frappe.whitelist()
def get_picked_not_delivered_qty(sales_order, sales_order_item):
    total_qty = 0.0
    
    # Get all submitted Pick Lists for this Sales Order that are Open
    pick_lists = frappe.get_all(
        "Pick List",
        filters={
            "sales_order": sales_order,
            "docstatus": 1,
            "status": "Open"
        },
        pluck="name"
    )

    if pick_lists:
        # Calculate sum of qty for the specific sales_order_item in those Pick Lists
        qty = frappe.db.sql("""
            SELECT SUM(qty)
            FROM `tabPick List Item`
            WHERE parent IN %(pick_lists)s
              AND sales_order_item = %(sales_order_item)s
        """, {'pick_lists': pick_lists, 'sales_order_item': sales_order_item})
        
        if qty and qty[0][0]:
            total_qty = flt(qty[0][0])

    # Update the Sales Order Item in the database directly
    frappe.db.set_value("Sales Order Item", sales_order_item, "custom_picked_but_not_delivered", total_qty)

    return total_qty
@frappe.whitelist()
def update_short_close_qty(sales_order, items):
    if isinstance(items, str):
        items = frappe.parse_json(items)
    
    doc = frappe.get_doc("Sales Order", sales_order)
    
    for item_data in items:
        for row in doc.items:
            if row.name == item_data.get("name"):
                row.custom_short_closed_qty = flt(item_data.get("short_close_qty"))
                break
    
    doc.save()
    return True

def sync_short_close_qty(doc, method=None):
    """
    Called before save. 
    Moves custom_short_closed_qty to total_short_close_qty and resets it.
    """
    for row in doc.items:
        val = flt(row.custom_short_closed_qty)
        if val != 0:
            row.total_short_close_qty = flt(row.total_short_close_qty) + val
            row.custom_short_closed_qty = 0
