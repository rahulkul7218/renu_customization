
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
        <table class="table table-bordered table-condensed" style="margin-top: 10px;">
            <thead>
                <tr>
                    <th style="width: 30px;"><input type="checkbox" id="select_all_items"></th>
                    <th>${__('Item')}</th>
                    <th class="text-right">${__('Order Qty')}</th>
                    <th class="text-right">${__('Delivered Qty')}</th>
                    <th class="text-right">${__('Picked Qty')}</th>
                    <th class="text-right">${__('Total Short Closed')}</th>
                    <th class="text-right">${__('Open Qty')}</th>
                    <th class="text-right" style="width: 120px;">${__('Add Shot Close Qty')}</th>
                </tr>
            </thead>
            <tbody>
                ${items.map((item, index) => {
        let available_qty = flt(item.qty) - flt(item.delivered_qty) - flt(item.custom_picked_but_not_delivered) - flt(item.total_short_close_qty);
        return `
                        <tr data-idx="${index}">
                            <td><input type="checkbox" class="item_checkbox" data-idx="${index}"></td>
                            <td>${item.item_code}</td>
                            <td class="text-right">${item.qty}</td>
                            <td class="text-right">${item.delivered_qty || 0}</td>
                            <td class="text-right">${item.custom_picked_but_not_delivered || 0}</td>
                            <td class="text-right">${item.total_short_close_qty || 0}</td>
                            <td class="text-right">${available_qty}</td>
                            <td>
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
