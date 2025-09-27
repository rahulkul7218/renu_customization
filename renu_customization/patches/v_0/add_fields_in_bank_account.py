import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Bank Account": [
             dict(
                fieldname="rbi_code",
                label="RBI Code",
                fieldtype="Data",
                insert_after="iban",
            ),
             dict(
                fieldname="sort_code",
                label="Sort Code",
                fieldtype="Data",
                insert_after="rbi_code",
            ),dict(
                fieldname="fedwire_aba",
                label="Fedwire ABA",
                fieldtype="Data",
                insert_after="sort_code",
            ),
            dict(
                fieldname="ifsc_code",
                label="IFSC Code",
                fieldtype="Data",
                insert_after="bank_account_no",
            ),
            dict(
                fieldname="mirc_code",
                label="MIRC Code",
                fieldtype="Data",
                insert_after="ifsc_code",
            ),
            
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
