import frappe

def get_party_item_code_from_dn(doc, method):
    for item in doc.items:
        if item.against_delivery_note:
            dn_item = frappe.get_all(
                'Delivery Note Item',
                filters={
                    'parent': item.against_delivery_note,
                    'item_code': item.item_code
                },
                fields=['party_item_code'],
                limit=1
            )
            if dn_item:
                item.party_item_code = dn_item[0].party_item_code
