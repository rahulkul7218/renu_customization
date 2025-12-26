import frappe
from erpnext.stock.doctype.packing_slip.packing_slip import PackingSlip


class PackingSlipOverride(PackingSlip):

    def validate_items(self):
        # 🔥 COMPLETELY BYPASS CORE VALIDATION
        for item in self.items:
            if item.qty <= 0:
                frappe.throw(f"Row {item.idx}: Qty must be greater than 0")

            # 🔴 SKIP:
            # if not item.dn_detail and not item.pi_detail:
            # if remaining_qty <= 0:
            # if item.qty > remaining_qty:

            # Optional: minimal safety
            if not item.item_code:
                frappe.throw(f"Row {item.idx}: Item Code is mandatory")
