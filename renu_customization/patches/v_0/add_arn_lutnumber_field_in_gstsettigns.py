import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "GST Settings": [
            dict(
                fieldname="lut_number",
                label="ARN No (Letter of Undertaking)",
                fieldtype="Link",
                options="LUT Number",
                insert_after="rcm_threshold"
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
