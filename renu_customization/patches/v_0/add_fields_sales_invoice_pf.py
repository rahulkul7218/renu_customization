import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    custom_fields = {
        "Sales Invoice": [
            dict(
                fieldname="sales_order",
                label="Sales Order",
                fieldtype="Link",
                options="Sales Order",
                hidden=1,
                insert_after="invoice_typ",
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
             dict(
                fieldname="packing",
                label="Packing",
                fieldtype="Data",
                insert_after="iec_code",
                fetch_from="sales_order.packing", 
            ),
             dict(
                fieldname="insurance",
                label="Insurance",
                fieldtype="Data",
                insert_after="packing",
                fetch_from="sales_order.insurance"
                
            ),
             dict(
                fieldname="warranty",
                label="Warranty",
                fieldtype="Data",
                insert_after="insurance",
                fetch_from="sales_order.warranty"
            ),
             dict(
                fieldname="freight_prepared_by",
                label="Freight Prepared by",
                fieldtype="Data",
                insert_after="warranty"
            )
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
