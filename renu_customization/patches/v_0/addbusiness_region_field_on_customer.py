import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Customer": [
            dict(
                fieldname="business_regions_code",
                label="Business Region Code",
                fieldtype="Link",
                options="Business Region Code",
                insert_after="customer_group",
                reqd=1,
				in_list_view=1,
                filters=[["Business Region Code", "enable", "=", 1]]
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)
