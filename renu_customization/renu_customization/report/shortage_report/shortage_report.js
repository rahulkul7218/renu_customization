// Copyright (c) 2025, Assimilate Technologies Pvt Ltd and contributors
// For license information, please see license.txt

frappe.query_reports["Shortage Report"] = {
    filters: [
        {
            fieldname: "supplier",
            label: "Supplier",
            fieldtype: "Link",
            options: "Supplier",
            reqd: 0,
            onchange: function () {
                frappe.query_report.refresh();
            },
        },
    ],

    get_datatable_options(options) {
        options.checkboxColumn = true;
        return options;
    },

    onload: function (report) {
        // ✅ Helper: get checked rows
        function get_checked_rows(report) {
            let checked_rows = [];
            try {
                const sel = report.datatable?.selection?.getChecked?.();
                if (sel && sel.length) {
                    if (typeof sel[0] === "number") {
                        checked_rows = sel.map(i => report.data[i]).filter(Boolean);
                    } else if (typeof sel[0] === "object") {
                        checked_rows = sel.map(s => {
                            if (typeof s === "number") return report.data[s];
                            if (s.rowIndex !== undefined) return report.data[s.rowIndex];
                            if (s.index !== undefined) return report.data[s.index];
                            if (s.id !== undefined && report.data[s.id]) return report.data[s.id];
                            return null;
                        }).filter(Boolean);
                    }
                }
            } catch (e) {
                console.warn("selection.getChecked failed", e);
            }

            // Fallback for DOM
            if (!checked_rows.length) {
                const $wrapper = $(report.datatable?.wrapper || report.page?.wrapper);
                const $checked = $wrapper.find('input[type="checkbox"]:checked');
                $checked.each(function () {
                    const idx = parseInt($(this).closest("[data-row-index]").attr("data-row-index"), 10);
                    if (!isNaN(idx) && report.data?.[idx]) checked_rows.push(report.data[idx]);
                });
            }

            return checked_rows;
        }

        // ✅ Core doc creation
        function create_doc(doctype, checked_rows, supplier) {
            if (!checked_rows.length) {
                frappe.msgprint(__("Please select at least one item using the checkbox."));
                return;
            }

            // ✅ New validation: Ensure all selected rows have same supplier
            if (doctype === "Purchase Order") {
                let supplier_list = Array.from(new Set(checked_rows.map(row => row.supplier || "").filter(Boolean)));

                if (supplier_list.length > 1) {
                    frappe.msgprint({
                        title: __("Multiple Suppliers Selected"),
                        message: __("You have selected items from different suppliers. Please select items for one supplier only."),
                        indicator: "red"
                    });
                    return;
                }

                // If supplier filter is empty, use the supplier from the rows
                if (!supplier && supplier_list.length === 1) {
                    supplier = supplier_list[0];
                }
            }

            // ✅ Group items by supplier if no supplier filter
            if (doctype === "Purchase Order" && !supplier) {
                let grouped = {};
                checked_rows.forEach(row => {
                    let supp = row.supplier || "Unknown";
                    if (!grouped[supp]) grouped[supp] = [];
                    grouped[supp].push(row);
                });

                const supplier_list = Object.keys(grouped);
                let created_orders = [];

                const create_next_po = (index = 0) => {
                    if (index >= supplier_list.length) {
                        frappe.msgprint(
                            __("Purchase Orders created successfully:") +
                            "<br>" +
                            created_orders.map(po => `<b>${po}</b>`).join("<br>")
                        );
                        return;
                    }

                    let current_supplier = supplier_list[index];
                    let items = grouped[current_supplier];

                    frappe.new_doc("Purchase Order");
                    frappe.ui.form.on("Purchase Order", {
                        refresh: function (frm) {
                            if (frm.is_new() && !frm.is_items_added) {
                                frm.clear_table("items");
                                frm.set_value("supplier", current_supplier);

                                items.forEach((data) => {
                                    let item_code = data.item_code || data.item;
                                    let qty = Math.abs(parseFloat(data.projected_qty || data.projected_quantity) || 0);
                                    let warehouse = data.warehouse;

                                    let child = frm.add_child("items", {
                                        item_code: item_code,
                                        qty: qty,
                                        warehouse: warehouse,
                                        schedule_date: frappe.datetime.now_date(),
                                    });

                                    frappe.call({
                                        method: "frappe.client.get_value",
                                        args: {
                                            doctype: "Item",
                                            filters: { name: item_code },
                                            fieldname: "stock_uom",
                                        },
                                        callback: function (r) {
                                            if (r.message) {
                                                frappe.model.set_value(child.doctype, child.name, "uom", r.message.stock_uom);
                                            }
                                        },
                                    });
                                });

                                frm.refresh_field("items");
                                frm.is_items_added = true;

                                frm.save().then(() => {
                                    frappe.call({
                                        method: "frappe.client.submit",
                                        args: { doc: frm.doc },
                                        callback: function (r) {
                                            if (!r.exc && r.message) {
                                                created_orders.push(r.message.name);
                                                frappe.show_alert({
                                                    message: __("PO <b>" + r.message.name + "</b> created for " + current_supplier),
                                                    indicator: "green",
                                                }, 5);

                                                frappe.set_route("Form", "Purchase Order", r.message.name);
                                                frappe.after_ajax(() => {
                                                    frappe.model.with_doc("Purchase Order", r.message.name, function (doc) {
                                                        if (cur_frm && cur_frm.docname === r.message.name) {
                                                            cur_frm.doc = doc;
                                                            cur_frm.refresh();
                                                            cur_frm.reload_doc();
                                                        }
                                                    });
                                                });

                                                create_next_po(index + 1);
                                            }
                                        },
                                    });
                                });
                            }
                        },
                    });
                };

                create_next_po();
                return;
            }

            // ✅ Default: single supplier or Material Request
            frappe.new_doc(doctype);

            frappe.ui.form.on(doctype, {
                refresh: function (frm) {
                    if (frm.is_new() && !frm.is_items_added) {
                        frm.clear_table("items");

                        if (doctype === "Purchase Order" && supplier) {
                            frm.set_value("supplier", supplier);
                        }

                        checked_rows.forEach((data) => {
                            let item_code = data.item_code || data.item;
                            let qty = Math.abs(parseFloat(data.projected_qty || data.projected_quantity) || 0);
                            let warehouse = data.warehouse;

                            let child = frm.add_child("items", {
                                item_code: item_code,
                                qty: qty,
                                warehouse: warehouse,
                                schedule_date: frappe.datetime.now_date(),
                            });

                            frappe.call({
                                method: "frappe.client.get_value",
                                args: {
                                    doctype: "Item",
                                    filters: { name: item_code },
                                    fieldname: "stock_uom",
                                },
                                callback: function (r) {
                                    if (r.message) {
                                        frappe.model.set_value(child.doctype, child.name, "uom", r.message.stock_uom);
                                    }
                                },
                            });
                        });

                        frm.refresh_field("items");
                        frm.is_items_added = true;

                        // Auto save + submit + reload fix
                        if (doctype === "Purchase Order") {
                            frm.save().then(() => {
                                frappe.call({
                                    method: "frappe.client.submit",
                                    args: { doc: frm.doc },
                                    callback: function (r) {
                                        if (!r.exc && r.message) {
                                            frappe.show_alert({
                                                message: __("Purchase Order <b>" + r.message.name + "</b> has been created successfully."),
                                                indicator: "green"
                                            }, 5);

                                            frappe.set_route("Form", "Purchase Order", r.message.name);
                                            frappe.after_ajax(() => {
                                                frappe.model.with_doc("Purchase Order", r.message.name, function (doc) {
                                                    if (cur_frm && cur_frm.docname === r.message.name) {
                                                        cur_frm.doc = doc;
                                                        cur_frm.refresh();
                                                        cur_frm.reload_doc();
                                                    }
                                                });
                                            });
                                        }
                                    }
                                });
                            });
                        }

                        if (doctype === "Material Request") {
                            frm.save().then(() => {
                                frappe.call({
                                    method: "frappe.client.submit",
                                    args: { doc: frm.doc },
                                    callback: function (r) {
                                        if (!r.exc && r.message) {
                                            frappe.show_alert({
                                                message: __("Material Request <b>" + r.message.name + "</b> has been created successfully."),
                                                indicator: "green"
                                            }, 5);

                                            frappe.set_route("Form", "Material Request", r.message.name);
                                            frappe.after_ajax(() => {
                                                frappe.model.with_doc("Material Request", r.message.name, function (doc) {
                                                    if (cur_frm && cur_frm.docname === r.message.name) {
                                                        cur_frm.doc = doc;
                                                        cur_frm.refresh();
                                                        cur_frm.reload_doc();
                                                    }
                                                });
                                            });
                                        }
                                    }
                                });
                            });
                        }
                    }
                },
            });
        }

        // --- Buttons ---
        let po_btn = report.page.add_inner_button(__("Purchase Order"), function () {
            const checked_rows = get_checked_rows(report);
            const supplier = frappe.query_report.get_filter_value("supplier");
            create_doc("Purchase Order", checked_rows, supplier);
        });

        let mr_btn = report.page.add_inner_button(__("Material Request"), function () {
            const checked_rows = get_checked_rows(report);
            create_doc("Material Request", checked_rows);
        });

        // --- Styling ---
        po_btn.css({
            "background-color": "#e48e4c",
            "color": "white",
            "border": "none",
        });

        mr_btn.css({
            "background-color": "#e48e4c",
            "color": "white",
            "border": "none",
            "margin-left": "8px",
        });
    },
};
