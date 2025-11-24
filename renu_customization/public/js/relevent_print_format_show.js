
// frappe.ui.form.on("Sales Invoice", {
//     refresh(frm) {
//         if (!frm.doc.__islocal) {
//             let invoice_type = frm.doc.invoice_type;

//             // Mapping Invoice Type → Print Format
//             let pf_map = {
//                 "Product Domestic": "RFA Product Domestic SI",
//                 "Product Export": "RFA Product Export SI",
//                 "Engineering Service Domestic": "RFA E Service Domestic SI",
//                 "Engineering Service Export": "RFA E Service Export SI"
//             };

//             let allowed_pf = pf_map[invoice_type];

//             if (!allowed_pf) return;

//             // Set the default print format
//             frm.meta.default_print_format = allowed_pf;

//             // ---- Hide all other print formats ----
//             setTimeout(() => {
//                 Object.keys(frappe.boot.print_formats).forEach(function (pf_name) {
//                     if (pf_name !== allowed_pf && frappe.boot.print_formats[pf_name].doc_type === "Sales Invoice") {
//                         frappe.boot.print_formats[pf_name].hidden = 1;
//                     }
//                 });
//             }, 500);
//         }
//     }
// });