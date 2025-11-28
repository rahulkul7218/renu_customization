import frappe
from frappe.utils import today

def remove_expired_lut_epcg():
    current_date = today()

    companies = frappe.get_all(
        "Company",
        fields=["name", "lut_number", "epcg_no"]
    )

    for comp in companies:

        # -------------------------
        # 1. Check LUT Number
        # -------------------------
        if comp.lut_number:
            lut = frappe.get_doc("LUT Number", comp.lut_number)

            if lut.to_date and lut.to_date < current_date:

                # Disable LUT
                lut.enable = 0
                lut.save(ignore_permissions=True)

                # Remove LUT from Company
                c = frappe.get_doc("Company", comp.name)
                c.lut_number = None
                c.save(ignore_permissions=True)

        # -------------------------
        # 2. Check EPCG Number
        # -------------------------
        if comp.epcg_no:
            epcg = frappe.get_doc("EPCG License", comp.epcg_no)

            if epcg.to_date and epcg.to_date < current_date:

                # Disable EPCG
                epcg.enable = 0
                epcg.save(ignore_permissions=True)

                # Remove EPCG from Company
                c = frappe.get_doc("Company", comp.name)
                c.epcg_no = None
                c.save(ignore_permissions=True)
