import frappe

def get_party_item_code_from_picklist(doc, method):
    for item in doc.items:
        if item.against_pick_list:
            pl_item = frappe.get_all(
                'Pick List Item',
                filters={
                    'parent': item.against_pick_list,
                    'item_code': item.item_code
                },
                fields=['party_item_code'],
                limit=1
            )
            if pl_item:
                item.party_item_code = pl_item[0].party_item_code
