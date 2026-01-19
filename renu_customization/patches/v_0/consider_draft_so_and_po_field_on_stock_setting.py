import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


def execute():
    fields = {
        "Stock Settings": [
            {
                "fieldname": "consider_draft_so_mrp",
                "label": "Consider Draft Sales Orders in MRP",
                "fieldtype": "Check",
                "insert_after": "enable_mrp",
                "depends_on": "eval:doc.enable_mrp == 1"
            },
            {
                "fieldname": "consider_draft_po_mrp",
                "label": "Consider Draft Purchase Orders in MRP",
                "fieldtype": "Check",
                "insert_after": "consider_draft_so_mrp",
                "depends_on": "eval:doc.enable_mrp == 1"
            },
        ]
    }

    for doctype, custom_fields in fields.items():
        for field in custom_fields:
            # Avoid duplicate creation
            if not frappe.db.exists("Custom Field", f"{doctype}-{field['fieldname']}"):
                create_custom_field(doctype, field)

    frappe.clear_cache()
