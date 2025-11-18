# import frappe
# from frappe.custom.doctype.custom_field.custom_field import create_custom_field

# def execute():
#     doctype = "Packing Slip Item"

#     custom_fields = [
#         {"fieldname": "serial_no", 
#          "label": "Serial No", 
#          "fieldtype": "Data",
#          "fetch_from": "delivery_note_items.serial_no",
#          "insert_after": "batch_no"},

#          {"fieldname": "box_no", 
#           "label": "Box No.", 
#           "fieldtype": "Data", 
#           "insert_after": "batch_no"},

#          {"fieldname": "dimension", 
#           "label": "Dimension", 
#           "fieldtype": "Data", 
#           "insert_after": "box_no"},
#     ]
#     for field in custom_fields:
#         if not frappe.db.exists("Custom Field", f"{doctype}-{field['fieldname']}"):
#             create_custom_field(doctype, field)

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

def execute():
    # Fields to be added
    fields = [
        {
            "fieldname": "serial_no",
            "label": "Serial No",
            "fieldtype": "Text",
            "insert_after": "item_code",
            "read_only": 0
        }, 
        {
            "fieldname": "box_no",
            "label": "Box No",
            "fieldtype": "Data",
            "insert_after": "serial_no"
        },
        {
            "fieldname": "dimension",
            "label": "Dimension",
            "fieldtype": "Data",
            "insert_after": "box_no"
        },
        {
            "fieldname": "remaining_serial",
            "label": "Remaining Serial",
            "fieldtype": "Text",
            "insert_after": "batch_no"
        }
    ]

    # Create all custom fields
    for field in fields:  
        create_custom_field("Packing Slip Item", field)

    frappe.db.commit()

    # Update serial_no from delivery note
#     update_serial_no_in_packing_slips()


# def update_serial_no_in_packing_slips():
#     """Fetch serial_no from Delivery Note Item table and update Packing Slip Item."""
#     packing_slips = frappe.get_all("Packing Slip", fields=["name", "delivery_note"])

#     for ps in packing_slips:
#         if not ps.delivery_note:
#             continue

#         # Get Delivery Note Items
#         dn_items = frappe.get_all(
#             "Delivery Note Item",
#             filters={"parent": ps.delivery_note},
#             fields=["item_code", "serial_no"]
#         )
#         dn_map = {d["item_code"]: d["serial_no"] for d in dn_items if d.get("serial_no")}

#         # Update Packing Slip Items
#         ps_items = frappe.get_all(
#             "Packing Slip Item",
#             filters={"parent": ps.name},
#             fields=["name", "item_code"]
#         )

#         for item in ps_items:
#             serial_no = dn_map.get(item["item_code"])
#             if serial_no:
#                 frappe.db.set_value("Packing Slip Item", item["name"], "serial_no", serial_no)

#     frappe.db.commit()
