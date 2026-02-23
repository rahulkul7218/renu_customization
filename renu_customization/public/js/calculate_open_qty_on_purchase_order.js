// frappe.ui.form.on("Purchase Order", {
//     refresh: function(frm) {
//         calculate_all_open_qty(frm);
//     },

//     before_save: function(frm) {
//         calculate_all_open_qty(frm);
//     }
// });

// frappe.ui.form.on("Purchase Order Item", {
//     qty: function(frm, cdt, cdn) {
//         calculate_single_open_qty(cdt, cdn);
//     },

//     received_qty: function(frm, cdt, cdn) {
//         calculate_single_open_qty(cdt, cdn);
//     }
// });

// function calculate_all_open_qty(frm) {
//     frm.doc.items.forEach(row => {
//         row.open_qty = (row.qty || 0) - (row.received_qty || 0);
//     });
//     frm.refresh_field("items");
// }

// function calculate_single_open_qty(cdt, cdn) {
//     let row = frappe.get_doc(cdt, cdn);
//     let value = (row.qty || 0) - (row.received_qty || 0);
//     frappe.model.set_value(cdt, cdn, "open_qty", value);
// }



frappe.ui.form.on("Purchase Order", {
    refresh: function(frm) {
        calculate_all_open_qty(frm);
    },

    before_save: function(frm) {
        calculate_all_open_qty(frm);
    }
});

frappe.ui.form.on("Purchase Order Item", {
    qty: function(frm, cdt, cdn) {
        calculate_single_open_qty(cdt, cdn);
    },

    received_qty: function(frm, cdt, cdn) {
        calculate_single_open_qty(cdt, cdn);
    },

    total_short_close_qty: function(frm, cdt, cdn) {
        calculate_single_open_qty(cdt, cdn);
    }
});

function calculate_all_open_qty(frm) {
    frm.doc.items.forEach(row => {
        row.open_qty =
            (row.qty || 0)
            - (row.received_qty || 0)
            - (row.total_short_close_qty || 0);
    });
    frm.refresh_field("items");
}

function calculate_single_open_qty(cdt, cdn) {
    let row = frappe.get_doc(cdt, cdn);
    let value =
        (row.qty || 0)
        - (row.received_qty || 0)
        - (row.total_short_close_qty || 0);

    frappe.model.set_value(cdt, cdn, "open_qty", value);
}