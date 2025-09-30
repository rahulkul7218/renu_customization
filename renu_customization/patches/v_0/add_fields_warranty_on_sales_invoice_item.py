# your_app/patches/add_warranty_fields_in_sales_invoice_item.py
import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice Item": [
            dict(
                fieldname="warranty_name",
                label="Warranty Name",
                fieldtype="Link",
                options="Warranty",
                insert_after="customer_item_code",
                in_list_view=1
            ),
            dict(
                fieldname="warranty_days",
                label="Warranty Days",
                fieldtype="Data",
                insert_after="warranty_name",
                in_list_view=1
            ),
            dict(
                fieldname="warranty_begins",
                label="Warranty Begins",
                fieldtype="Data",
                insert_after="warranty_days",
                in_list_view=1
            ),
            dict(
                fieldname="warranty_start_date",
                label="Warranty Start Date",
                fieldtype="Date",
                insert_after="warranty_begins",
                in_list_view=1
            ),
            dict(
                fieldname="warranty_end_date",
                label="Warranty End Date",
                fieldtype="Date",
                insert_after="warranty_start_date",
                in_list_view=1
            ),

        ]
    }

    create_custom_fields(custom_fields, update=True)
