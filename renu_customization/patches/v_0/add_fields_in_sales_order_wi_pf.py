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
                reqd=1,
            ),
             dict(
                fieldname="insurance",
                label="Insurance",
                fieldtype="Data",
                insert_after="packing",
                reqd=1,
            ),
             dict(
                fieldname="warranty",
                label="Warranty",
                fieldtype="Link",
                optiond="Warranty",
                insert_after="insurance",
                reqd=1,
            )
             
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
