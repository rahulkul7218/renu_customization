frappe.ui.form.on("Sales Order", {
    refresh(frm) {

        if (!frm.doc.__islocal) {

            // Mapping Invoice Type → Print Format (Sales Order)
            let pf_map = {
                "Product Domestic": "RFA Product Domestic OA",
                "Product Export": "RFA Product Export OA",
                "Engineering Service Domestic": "RFA E Service Domestic OA",
                "Engineering Service Export": "RFA E Service Export OA"
            };

            let allowed_pf = pf_map[frm.doc.invoice_type];
            if (!allowed_pf) return;

            // Set default print format
            frm.meta.default_print_format = allowed_pf;

            // Hide other print formats
            setTimeout(() => {
                Object.keys(frappe.boot.print_formats).forEach(function (pf_name) {
                    let pf = frappe.boot.print_formats[pf_name];

                    if (pf.doc_type === "Sales Order" && pf_name !== allowed_pf) {
                        pf.hidden = 1;
                    }
                });
            }, 500);
        }
    }
});
