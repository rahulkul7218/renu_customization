import frappe
from frappe import _
 
def validate_short_close_qty(doc, method):
    """
    Validate that custom_short_closed_qty does not exceed available quantity.
    Limit = Qty - Delivered - Picked (Not Delivered)
    """
    for row in doc.items:
        # Ensure we work with floats
        qty = frappe.utils.flt(row.qty)
        delivered_qty = frappe.utils.flt(row.delivered_qty)
        picked_qty = frappe.utils.flt(row.custom_picked_but_not_delivered)
        short_closed_qty = frappe.utils.flt(row.custom_short_closed_qty)
 
        # Calculate limit
        limit = qty - delivered_qty - picked_qty
       
        # If user tries to short close more than available
        if short_closed_qty > limit:
            frappe.throw(
                _("Row #{0} ({1}): 'Short Closed Qty' ({2}) cannot be greater than open quantity ({3}).").format(
                    row.idx,
                    row.item_code,
                    short_closed_qty,
                    limit,
                    qty,
                    delivered_qty,
                    picked_qty
                )
            )
 