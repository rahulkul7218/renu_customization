# import frappe
# from renu_customization.api.sales_order_utils import get_picked_not_delivered_qty

# def update_sales_order_picked_status(doc, method):
#     """
#     Updates Sales Order Item 'custom_picked_but_not_delivered' field 
#     on Pick List and Delivery Note Submit/Cancel events.
#     """
    
#     # Identify unique sales_order_items involved to avoid redundant updates
#     so_items_to_update = set()
    
#     # Determine the child table based on DocType
#     items = []
#     if doc.doctype == "Pick List":
#         items = doc.locations
#     elif doc.doctype == "Delivery Note":
#         items = doc.items
        
#     if not items:
#         return
    
#     for row in items:
#         # Check for Sales Order link (DN Item usually has 'so_detail', PL Item has 'sales_order_item')
#         # Standardize fetching:
#         so_name = row.get("sales_order")
#         so_item_name = row.get("sales_order_item")
        
#         # In Delivery Note, the field might be different depending on version, 
#         # usually 'against_sales_order' and 'so_detail'
#         if doc.doctype == "Delivery Note":
#             if not so_name:
#                 so_name = row.get("against_sales_order")
#             if not so_item_name:
#                 so_item_name = row.get("so_detail")

#         if so_name and so_item_name:
#             so_items_to_update.add((so_name, so_item_name))
    
#     for so_name, so_item_name in so_items_to_update:
#         # This function calculates the total from all submitted Pick Lists 
#         # that are still "Open" and updates the Sales Order Item in the DB.
#         get_picked_not_delivered_qty(so_name, so_item_name)
