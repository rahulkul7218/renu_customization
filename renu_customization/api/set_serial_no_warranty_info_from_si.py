import frappe

def update_serial_no_from_si(doc, method=None):
    """
    On Sales Invoice submit:
    Update Serial No fields from Sales Invoice Item.
    Only when warranty_begins = "Date of Invoice" and warranty_end_date is set.
    """
    try:
        for item in doc.items:
            if not (item.warranty_begins == "Date of Invoice" and item.warranty_end_date):
                continue

            if not item.serials_no:
                continue

            serial_nos = [s.strip() for s in item.serials_no.split("\n") if s.strip()]
            for serials_no in serials_nos:
                try:
                    if frappe.db.exists("Serial No", serials_no):
                        frappe.db.set_value("Serial No", serials_no, {
                            "warranty_expiry_date": item.warranty_end_date,
                            "warranty_period": item.warranty_days,
                            "warranty_begins": item.warranty_begins
                        })
                    else:
                        frappe.log_error(
                            f"Serial No {serials_no} not found",
                            "Sales Invoice Warranty Update"
                        )
                except Exception as inner_e:
                    frappe.log_error(
                        f"Failed updating Serial No {serials_no}: {str(inner_e)}",
                        "Sales Invoice Warranty Update"
                    )
    except Exception as outer_e:
        frappe.log_error(
            f"Fatal error in update_serials_no_from_si: {str(outer_e)}",
            "Sales Invoice Warranty Update"
        )
