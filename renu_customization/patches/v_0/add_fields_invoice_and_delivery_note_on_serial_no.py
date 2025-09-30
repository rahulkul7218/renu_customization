# import frappe

# def execute():
#     doctype = "Serial No"
#     fields_to_add = [
#         {
#             "fieldname": "sales_invoice",
#             "label": "Sales Invoice",
#             "fieldtype": "Data",
#             "insert_after": "amc_expiry_date"
            
#         },
#         {
#             "fieldname": "delivery_note",
#             "label": "Delivery Note",
#             "fieldtype": "Data",
#             "insert_after": "sales_invoice"
            
#         }
#     ]

#     for field in fields_to_add:
#         if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": field["fieldname"]}):
#             frappe.get_doc({
#                 "doctype": "Custom Field",
#                 "dt": doctype,
#                 **field
#             }).insert(ignore_permissions=True)
#             frappe.db.commit()
#             print(f"Added field {field['fieldname']} to {doctype}")
#         else:
#             print(f"Field {field['fieldname']} already exists in {doctype}")

import frappe

def execute():
    doctype = "Serial No"
    fields_to_add = [
        {
            "fieldname": "sales_invoice",
            "label": "Sales Invoice",
            "fieldtype": "Link",
            "options": "Sales Invoice",  # Link target doctype
            "insert_after": "amc_expiry_date",
            "read_only": 1
        },
        {
            "fieldname": "delivery_note",
            "label": "Delivery Note",
            "fieldtype": "Link",
            "options": "Delivery Note",  # Link target doctype
            "insert_after": "sales_invoice",
            "read_only": 1
        }
    ]

    for field in fields_to_add:
        if not frappe.db.exists("Custom Field", {"dt": doctype, "fieldname": field["fieldname"]}):
            frappe.get_doc({
                "doctype": "Custom Field",
                "dt": doctype,
                **field
            }).insert(ignore_permissions=True)
            frappe.db.commit()
            print(f"Added field {field['fieldname']} to {doctype}")
        else:
            print(f"Field {field['fieldname']} already exists in {doctype}")
