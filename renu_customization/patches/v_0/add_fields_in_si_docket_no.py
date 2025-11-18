import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice": [
             dict(
                fieldname="docket_no",
                label="Docket No",
                fieldtype="Data",
                insert_after="freight_prepared_by",
            ),
             ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
