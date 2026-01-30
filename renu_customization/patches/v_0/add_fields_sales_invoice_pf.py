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
                insert_after="invoice_type",
            ),
            dict(
                fieldname="pre_carriage_by",
                label="Pre-Carriage by",
                fieldtype="Link",
                options="Pre Carriage Mode",
                insert_after="distance",
            ),
            dict(
                fieldname="vessel_flight_no",
                label="Vessel/Flight No",
                fieldtype="Data",
                insert_after="pre_carriage_by",
            ),
            dict(
                fieldname="freight_prepared_by",
                label="Freight Prepared by",
                fieldtype="Link",
                options="Freight",
                insert_after="vessel_flight_no"
            ),
             dict(
                 fieldname="port_of_discharge",
                 label="Port Of Discharge",
                 fieldtype="Link",
                 options="Port of Discharge",
                 insert_after="port_address"
             ),
             
             dict(
                 fieldname="no_of_boxes",
                 label="No. of Boxes",
                 fieldtype="Data",
                 insert_after="gst_vehicle_type"
             ),
             dict(
                 fieldname="each_box_weight",
                 label="Each Box Weight (Kg)",
                 fieldtype="Data",
                 insert_after="no_of_boxes"
             ),
                dict(
                    fieldname="net_weight",
                    label="Net Weight (Kg)",
                    fieldtype="Data",
                    insert_after="each_box_weight"
                ),
                dict(
                    fieldname="total_weight",
                    label="Total Weight (Kg)",
                    fieldtype="Data",
                    insert_after="net_weight"
                ),
             
        ]
    }

    create_custom_fields(custom_fields, ignore_validate=True)
