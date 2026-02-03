
frappe.ui.form.on("Sales Order", {
    refresh: function (frm) {
        if (frm.doc.docstatus === 1) { // Only show on submitted Sales Orders
            frm.add_custom_button(__('Short Close'), function () {
                show_short_close_dialog(frm);
            }, __(''));
        }
    }
});

function show_short_close_dialog(frm) {
    let items = frm.doc.items || [];

    let dialog_html = `
        <style>
            .short-close-table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                border: 1px solid #d1d8dd;
                font-size: 0.9em;
            }
            .short-close-table th {
                background-color: #f8f9fa;
                text-align: center !important;
                vertical-align: middle !important;
                border: 1px solid #d1d8dd !important;
                padding: 12px 8px !important;
                font-weight: bold;
                color: #1d2124;
            }
            .short-close-table td {
                border: 1px solid #d1d8dd !important;
                padding: 8px 8px !important;
                vertical-align: middle !important;
            }
            .short-close-table .text-right {
                text-align: right !important;
            }
            .short-close-table .text-center {
                text-align: center !important;
            }
            .short-close-table input[type="number"] {
                text-align: right;
            }
        </style>
        <table class="table short-close-table">
            <thead>
                <tr>
                    <th style="width: 40px;"><input type="checkbox" id="select_all_items"></th>
                    <th>${__('Item')}</th>
                    <th>${__('Order Qty')}</th>
                    <th>${__('Delivered Qty')}</th>
                    <th>${__('Picked Qty')}</th>
                    <th>${__('Total Short Closed')}</th>
                    <th>${__('Open Qty')}</th>
                    <th style="width: 130px;">${__('Short Close Qty')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, index) => {
        let available_qty = flt(item.qty) - flt(item.delivered_qty) - flt(item.custom_picked_but_not_delivered) - flt(item.total_short_close_qty);
        return `
                        <tr data-idx="${index}">
                            <td class="text-center"><input type="checkbox" class="item_checkbox" data-idx="${index}"></td>
                            <td>${item.item_code}</td>
                            <td class="text-right">${item.qty}</td>
                            <td class="text-right">${item.delivered_qty || 0}</td>
                            <td class="text-right">${item.custom_picked_but_not_delivered || 0}</td>
                            <td class="text-right">${item.total_short_close_qty || 0}</td>
                            <td class="text-right">${available_qty}</td>
                            <td class="text-right">
                                <input type="number" class="form-control short_close_input" 
                                    data-idx="${index}" 
                                    value="0" 
                                    step="any"
                                    min="0"
                                    max="${available_qty}">
                            </td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    let d = new frappe.ui.Dialog({
        title: __('Short Close Items'),
        size: 'extra-large',
        fields: [
            {
                fieldname: 'items_html',
                fieldtype: 'HTML',
                options: dialog_html
            }
        ],
        primary_action_label: __('Confirm'),
        primary_action(values) {
            let selected_items = [];
            let has_error = false;

            d.wrapper.find('.item_checkbox:checked').each(function () {
                let idx = $(this).data('idx');
                let row = items[idx];
                let input_val = flt(d.wrapper.find(`.short_close_input[data-idx="${idx}"]`).val());
                let available_qty = flt(row.qty) - flt(row.delivered_qty) - flt(row.custom_picked_but_not_delivered) - flt(row.total_short_close_qty);

                if (input_val > available_qty) {
                    frappe.msgprint(__('Shot Close Qty for Item {0} cannot be greater than Open Qty {1}', [row.item_code, available_qty]));
                    has_error = true;
                    return false;
                }

                selected_items.push({
                    name: row.name,
                    short_close_qty: input_val
                });
            });

            if (has_error) return;
            if (selected_items.length === 0) {
                frappe.msgprint(__('Please select at least one item.'));
                return;
            }

            d.hide();

            // Update items in background
            frappe.call({
                method: 'renu_customization.api.sales_order_utils.update_short_close_qty',
                args: {
                    sales_order: frm.doc.name,
                    items: selected_items
                },
                freeze: true,
                callback: function (r) {
                    if (!r.exc) {
                        frappe.show_alert({ message: __('Short Close quantities updated successfully'), indicator: 'green' });
                        frm.reload_doc();
                    }
                }
            });
        }
    });

    d.show();

    // Event listeners
    d.wrapper.find('#select_all_items').on('change', function () {
        d.wrapper.find('.item_checkbox').prop('checked', $(this).prop('checked'));
    });

    // Validation on input change
    d.wrapper.find('.short_close_input').on('change', function () {
        let idx = $(this).data('idx');
        let row = items[idx];
        let val = flt($(this).val());
        let available_qty = flt(row.qty) - flt(row.delivered_qty) - flt(row.custom_picked_but_not_delivered) - flt(row.total_short_close_qty);
        if (val > available_qty) {
            frappe.msgprint(__('Shot Close Qty cannot be greater than Open Qty ({0})', [available_qty]));
            $(this).val(0);
        }
    });
}
