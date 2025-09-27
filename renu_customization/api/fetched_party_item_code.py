import frappe

def get_party_item_code(doc, method):
    for item in doc.items:
        if item.sales_order:
            so_item = frappe.get_all(
                'Sales Order Item',
                filters={'parent': item.sales_order, 'item_code': item.item_code},
                fields=['party_item_code'],
                limit=1
            )
            if so_item:
                item.party_item_code = so_item[0].party_item_code
