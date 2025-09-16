// Client Script (Delivery Note)
frappe.ui.form.on('Delivery Note', {
    onload(frm) { set_pick_list(frm); },
    refresh(frm) { set_pick_list(frm); }
});

function set_pick_list(frm) {
    if (frm.doc.pick_list) return;
    if (!frm.doc.items || !frm.doc.items.length) return;

    let candidate = null;

    for (let r of frm.doc.items) {
        if (r.prevdoc_doctype && r.prevdoc_doctype === 'Pick List' && r.prevdoc_docname) {
            candidate = r.prevdoc_docname;
            break;
        }

        const possible = [
            r.pick_list,
            r.pick_list_name,
            r.pick_list_no,
            r.pick_list_reference,
            r.prevdoc_docname,
            r.prev_docname,
            r.prevdoc_detail_docname,
            r.against_pick_list,
            r.parent_pick_list
        ];

        for (let v of possible) {
            if (v && typeof v === 'string' && v.trim()) {
                candidate = v.trim();
                break;
            }
        }
        if (candidate) break;
    }

    if (candidate) {
        frappe.db.exists('Pick List', candidate).then(exists => {
            if (exists) {
                frm.set_value('pick_list', candidate).then(() => {
                    if (frm.is_new()) {
                        // frm.save();  // auto-save the draft once the field is set
                    }
                });frm.save();
            }
        });
        return;
    }
}


