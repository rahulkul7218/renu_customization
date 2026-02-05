# import frappe
# from frappe import _

# def validate_short_close_qty(doc, method):
#     """
#     Validate that custom_short_closed_qty does not exceed available quantity.
#     Limit = Qty - Delivered - Picked (Not Delivered)
#     """
#     for row in doc.items:
#         # Ensure we work with floats
#         qty = frappe.utils.flt(row.qty)
#         delivered_qty = frappe.utils.flt(row.delivered_qty)
#         picked_qty = frappe.utils.flt(row.custom_picked_but_not_delivered)
        
#         current_total = frappe.utils.flt(row.total_short_close_qty)
#         new_input = frappe.utils.flt(row.custom_short_closed_qty)

#         # The total short closure after sync will be:
#         pending_total = current_total + new_input
        
#         # Limit is based on (Qty - Delivered - Picked)
#         limit = qty - delivered_qty - picked_qty
        
#         # If total short closed exceeds available
#         if pending_total > limit:
#             frappe.throw(
#                 _("Row #{0} ({1}): Cumulative Short Closed Qty ({2}) cannot be greater than available quantity ({3}).").format(
#                     row.idx, 
#                     row.item_code, 
#                     pending_total, 
#                     limit
#                 )
#             )
