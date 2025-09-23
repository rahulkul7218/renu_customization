import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Order": [
             dict(
                fieldname="packing",
                label="Packing",
                fieldtype="Data",
                insert_after="represents_company",
            ),
             dict(
                fieldname="insurance",
                label="Insurance",
                fieldtype="Data",
                insert_after="packing",
            ),
             dict(
                fieldname="warranty",
                label="Warranty",
                fieldtype="Data",
                insert_after="insurance",
            )
             
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
