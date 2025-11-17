frappe.query_reports["Stock Shortage Report"] = {
    filters: [
        {
            fieldname: "supplier",
            label: "Supplier",
            fieldtype: "Link",
            options: "Supplier",
            reqd: 0,
            onchange: function () {
                frappe.query_report.refresh();
            }
        }
    ],
    

    // ✅ Enable checkbox and move it to the end (rightmost side)
    get_datatable_options(options) {
        options.checkboxColumn = true;

        // Hook after datatable mounts
        const originalOnMount = options.events?.onMount;
        options.events = options.events || {};

        options.events.onMount = function (datatable) {
            // Move checkbox column to the end for all header and data rows
            const wrapper = $(datatable.wrapper);
            const $rows = wrapper.find(".dt-row");

            $rows.each(function () {
                const $cells = $(this).children();
                const $checkboxCell = $cells.first(); // default checkbox is first
                $checkboxCell.detach(); // remove from start
                $(this).append($checkboxCell); // append to end
            });

            // Ensure header row also updated (so checkbox column title shifts too)
            const $headerRow = wrapper.find(".dt-row.dt-head");
            if ($headerRow.length) {
                const $headerCheckbox = $headerRow.children().first();
                $headerCheckbox.detach();
                $headerRow.append($headerCheckbox);
            }

            if (originalOnMount) originalOnMount(datatable);
        };

        return options;
    },

    onload: function (report) {
        report.page.add_inner_button(
            __("Create Request"),
            function () {
                let checked_rows = [];

                try {
                    // --- 1) Modern API
                    const sel = report.datatable?.selection?.getChecked?.();
                    if (sel && sel.length) {
                        if (typeof sel[0] === "number") {
                            checked_rows = sel.map(i => report.data[i]).filter(Boolean);
                        } else if (typeof sel[0] === "object") {
                            checked_rows = sel.map(s => {
                                if (s.rowIndex !== undefined) return report.data[s.rowIndex];
                                if (s.index !== undefined) return report.data[s.index];
                                if (s.id !== undefined && report.data[s.id]) return report.data[s.id];
                                return null;
                            }).filter(Boolean);
                        }
                    }

                    // --- 2) Fallback to rowmanager
                    if (!checked_rows.length) {
                        const rm = report.datatable?.rowmanager?.getChecked?.();
                        if (rm && rm.length) {
                            checked_rows = rm.map(i => report.data[i]).filter(Boolean);
                        }
                    }

                    // --- 3) DOM fallback
                    if (!checked_rows.length) {
                        const wrapper = $(report.datatable?.wrapper || []);
                        const $checked = wrapper.find('input[type="checkbox"]:checked');
                        const rows = [];

                        $checked.each(function () {
                            const $cb = $(this);
                            const $row = $cb.closest('[data-row-index], .dt-row');
                            let idx = parseInt($row.attr('data-row-index') || $row.attr('data-index') || -1);
                            if (Number.isFinite(idx) && report.data[idx]) rows.push(report.data[idx]);
                        });

                        checked_rows = rows.filter(Boolean);
                    }
                } catch (e) {
                    console.error("Error getting checked rows:", e);
                }

                if (!checked_rows.length) {
                    frappe.msgprint(__("Please select at least one item using the checkbox."));
                    return;
                }

                let supplier = frappe.query_report.get_filter_value("supplier");

                frappe.prompt(
                    [
                        {
                            fieldname: "select_type",
                            label: "Select Request Type",
                            fieldtype: "Select",
                            options: "\nMaterial Request\nPurchase Order",
                            reqd: 1
                        }
                    ],
                    function (values) {
                        let doctype =
                            values.select_type === "Material Request"
                                ? "Material Request"
                                : "Purchase Order";

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
                                                    frappe.model.set_value(
                                                        child.doctype,
                                                        child.name,
                                                        "uom",
                                                        r.message.stock_uom
                                                    );
                                                }
                                            },
                                        });
                                    });

                                    frm.refresh_field("items");
                                    frm.is_items_added = true;

                                    if (doctype === "Purchase Order") {
                                        frm.save().then(() => {
                                            frappe.call({
                                                method: "frappe.client.submit",
                                                args: { doc: frm.doc },
                                                callback: function (r) {
                                                    if (!r.exc && r.message) {
                                                        frappe.show_alert({
                                                            message: __("Purchase Order <b>" + r.message.name + "</b> has been submitted successfully."),
                                                            indicator: "green"
                                                        }, 5);

                                                        frappe.set_route("Form", "Purchase Order", r.message.name);
                                                        frappe.after_ajax(() => {
                                                            frappe.model.with_doc("Purchase Order", r.message.name, function () {
                                                                frappe.get_doc("Purchase Order", r.message.name);
                                                                cur_frm.reload_doc();
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
                    },
                    "Create Request",
                    "Proceed"
                );
            },
            __("Actions")
        );
    },
};




