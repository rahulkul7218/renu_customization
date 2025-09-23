import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice": [
            dict(
                fieldname="iec_code",
                label="IEC Code",
                fieldtype="Data",
                insert_after="gst_vehicle_type",
            ),
            dict(
                fieldname="pre_carriage_by",
                label="Pre-Carriage by",
                fieldtype="Data",
                insert_after="distance",
            ),
            dict(
                fieldname="vessel_flight_no",
                label="Vessel/Flight No",
                fieldtype="Data",
                insert_after="pre_carriage_by",
            ),
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
