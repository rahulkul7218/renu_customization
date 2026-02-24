import frappe
from frappe.utils import flt, cint

def distribute_serial_nos(doc, method=None):
    """
    Ensures that serial numbers are uniquely distributed across Pick List Item rows
    for the same item code.
    """
    if not doc.locations:
        return

    # Track how many serials we have consumed per (Item, Warehouse)
    # This prevents duplicate assignments across multiple line items for the same product
    consumed_count = {}

    for row in doc.locations:
        if not row.item_code:
            continue
            
        # Only process items that require serial numbers
        has_serial_no = frappe.get_cached_value("Item", row.item_code, "has_serial_no")
        if not has_serial_no:
            continue

        key = (row.item_code, row.warehouse)
        if key not in consumed_count:
            consumed_count[key] = 0

        # Total quantity needed for this row
        required_qty = cint(row.stock_qty or row.picked_qty)
        
        if required_qty > 0:
            # Fetch available serials, skipping what we already assigned to previous rows in this document
            available_serials = get_available_serials(
                row.item_code, 
                row.warehouse, 
                doc.company, 
                limit=required_qty, 
                offset=consumed_count[key]
            )

            if available_serials:
                row.serial_no = "\n".join(available_serials)
                # Increment consumed count so next row starts from where this one ended
                consumed_count[key] += len(available_serials)
            else:
                # If no serials found, we might want to clear or leave it
                pass

def get_available_serials(item_code, warehouse, company, limit, offset):
    """
    Fetches available serial numbers using FIFO (First In First Out) logic.
    """
    return frappe.get_all(
        "Serial No",
        filters={
            "item_code": item_code,
            "warehouse": warehouse,
            "company": company,
            "status": "Active"
        },
        order_by="creation asc",
        limit=limit,
        start=offset,
        pluck="name"
    )
