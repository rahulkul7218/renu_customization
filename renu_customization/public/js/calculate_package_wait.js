frappe.ui.form.on("Sales Invoice", {
    no_of_boxes: function(frm) {
        frm.trigger("calculate_net_weight");
    },
    each_box_weight: function(frm) {
        frm.trigger("calculate_net_weight");
    },
    calculate_net_weight: function(frm) {
        if (frm.doc.no_of_boxes && frm.doc.each_box_weight) {
            frm.set_value("net_weight", frm.doc.no_of_boxes * frm.doc.each_box_weight);
        }
    },
    total_weight: function(frm) {
        if (frm.doc.total_weight < frm.doc.net_weight) {
            frappe.throw(__("Total Weight cannot be less than Net Weight"));
        }
    }
});
