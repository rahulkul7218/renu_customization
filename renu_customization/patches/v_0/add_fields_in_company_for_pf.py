import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Company": [
            dict(
                fieldname="epcg_no",
                label="EPCG No",
                fieldtype="Link",
                options="EPCG License",
                insert_after="parent_company"
            ),
            dict(
                fieldname="iec_code",
                label="IEC Code",
                fieldtype="Data",
                insert_after="epcg_no",
            ),
            dict(
                fieldname="lut_number",
                label="ARN No (Letter of Undertaking)",
                fieldtype="Link",
                options="LUT Number",
                insert_after="iec_code"
            )
        ]
    }

    create_custom_fields(custom_fields, update=True)

  
