import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Item": [
            dict(
                fieldname="sales_warranty",
                label="Sales Warranty",
                fieldtype="Link",
                options="Warranty",
                insert_after="is_sales_item",
                depends_on="eval:doc.is_sales_item",
                description="Select Sales Warranty",
                fetch_from="warranty.sales_warranty",
            ),
            dict(
                fieldname="warranty_days",
                label="Warranty Days",
                fieldtype="Int",
                insert_after="sales_warranty",
                depends_on="eval:doc.is_sales_item",
                description="Warranty period in days"
            ),
        ]
    }

    create_custom_fields(custom_fields, update=True)

   