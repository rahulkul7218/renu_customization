frappe.pages['revenue_dashboard'].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __('Revenue Dashboard'),
		single_column: true
	});

	page.set_primary_action(__('Refresh'), () => page.refresh());
	page.add_menu_item(__('Export to Excel'), () => download_excel());

    // Standard Frappe Filters - Using a dedicated container to avoid conflicts with standard page styles
    let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);
    
    // Define refresh with debounce to handle "on-time" filtering without overloading the server
    let refresh_timer = null;
    page.refresh = function() {
        if (refresh_timer) clearTimeout(refresh_timer);
        refresh_timer = setTimeout(() => {
            perform_refresh();
        }, 300);
    };

    function perform_refresh() {
        let filters = page.filter_group.get_values();
        frappe.call({
            method: 'renu_customization.renu_customization.page.revenue_dashboard.revenue_dashboard.get_dashboard_data',
            args: { filters: filters },
            callback: function(r) {
                if (r.message) {
                    render_dashboard(r.message);
                }
            }
        });
    }

    const filter_fields = [
        { fieldname: 'fiscal_year', label: __('Fiscal Year'), fieldtype: 'Link', options: 'Fiscal Year' },
        { fieldname: 'territory', label: __('Territory'), fieldtype: 'Link', options: 'Territory' },
        { fieldname: 'customer_group', label: __('Customer Group'), fieldtype: 'Link', options: 'Customer Group' },
        { fieldname: 'item_group', label: __('Product Group'), fieldtype: 'Link', options: 'Item Group' },
        { fieldname: 'status', label: __('Status'), fieldtype: 'MultiSelect', options: ['Draft', 'To Bill', 'To Deliver and Bill', 'To Deliver', 'Completed', 'Canceled'] },
        { fieldname: 'cb1', fieldtype: 'Column Break' },
        { label: __('Date'), fieldname: 'date_range', fieldtype: 'DateRange' },
        { label: __('Sales Person'), fieldname: 'sales_person', fieldtype: 'Link', options: 'Sales Person' },
        { label: __('Customer'), fieldname: 'customer_name', fieldtype: 'Link', options: 'Customer' },
        { label: __('Product Code'), fieldname: 'item_code', fieldtype: 'Link', options: 'Item' },
        { fieldname: 'cb2', fieldtype: 'Column Break' },
        { fieldname: 'city', label: __('City'), fieldtype: 'Data' },
        { fieldname: 'state', label: __('State'), fieldtype: 'Data' },
        { fieldname: 'country', label: __('Country'), fieldtype: 'Link', options: 'Country' },
        { fieldname: 'currency', label: __('Currency'), fieldtype: 'Link', options: 'Currency' }
    ];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields
	});
	page.filter_group.make();
    
    // ENSURE LIVE FILTERING WORKS - Attaching robust listeners to all controls
    Object.keys(page.filter_group.fields_dict).forEach(key => {
        let field = page.filter_group.fields_dict[key];
        if (field.df.fieldtype !== 'Column Break') {
            // 1. Standard Frappe callback
            field.df.on_change = () => page.refresh();
            
            // 2. DOM change event for the input
            if (field.$input) {
                field.$input.on('change', () => page.refresh());
            }
            
            // 3. For Link fields which might not trigger standard change until blur
            if (field.df.fieldtype === 'Link' || field.df.fieldtype === 'DateRange') {
                field.set_input_change && field.set_input_change(() => page.refresh());
            }
        }
    });
    
    // Style the filter area and fields
    filter_parent.addClass('border-bottom').css({
        'background-color': '#fff',
        'padding': '15px 30px',
        'margin-bottom': '0'
    });

    // Explicitly show the filter container
    filter_parent.show();

    // Content container mimicking standard Dashboard structure
    page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);
    
    $(`<style>
        .dashboard-content { padding: 30px; background: #fff; min-height: 100vh; }
        .summary-wrapper { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 12px; 
            padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .summary-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .summary-card .label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 24px; font-weight: 700; color: var(--text-color); }
        .summary-card .indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }
        
        /* Indicator Colors */
        .bg-blue { background-color: #3498db; }
        .bg-green { background-color: #2ecc71; }
        .bg-orange { background-color: #e67e22; }
        .bg-cyan { background-color: #1abc9c; }
        .bg-purple { background-color: #9b59b6; }
        .bg-red { background-color: #e74c3c; }

        .charts-row { display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; }
        .chart-card { 
            background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); 
            padding: 24px; box-shadow: var(--shadow-sm); min-height: 400px; transition: transform 0.2s;
        }
        .chart-card:hover { transform: translateY(-2px); }
        .chart-card .title { font-size: var(--text-md); font-weight: 600; color: var(--heading-color); margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .chart-actions, .table-actions { display: flex; gap: 12px; align-items: center; }
        .chart-card .reset-btn, .chart-card .export-btn, .table-card .export-btn { font-size: 11px; cursor: pointer; color: var(--primary); font-weight: 500; }
        .chart-card .export-btn, .table-card .export-btn { color: var(--text-muted); }
        .chart-card .export-btn:hover, .table-card .export-btn:hover { color: var(--primary); }

        .table-card { 
            background: var(--card-bg); border: 1px solid var(--border-color); border-radius: var(--border-radius-md); 
            margin-top: 24px; padding: 0; box-shadow: var(--shadow-sm); overflow: hidden;
        }
        .table-card .header { padding: 20px 24px; border-bottom: 1px solid var(--border-color); font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
        .table-container { overflow-x: auto; max-height: 600px; }
        .dashboard-table { width: 100%; border-collapse: collapse; }
        .dashboard-table th { background: #f8f9fa; padding: 12px 16px; text-align: left; font-size: 12px; color: var(--text-muted); position: sticky; top: 0; }
        .dashboard-table td { padding: 12px 16px; border-top: 1px solid var(--border-color); font-size: 13px; }
        .dashboard-table tr:hover { background: #f8f9fa; }
        .pill { padding: 2px 8px; border-radius: 12px; font-size: 11px; color: #fff; }
        .pill-status { background: var(--primary); }

        @media (max-width: 991px) {
            .charts-row { grid-template-columns: 1fr; }
        }
    </style>`).appendTo(page.main);

    function render_dashboard(data) {
        page.container.empty();
        // 0. No Data Placeholder
        if (!data.results || data.results.length === 0) {
            $(`<div class="text-center text-muted" style="padding: 100px 0;">
                <div style="font-size: 40px; margin-bottom: 20px;"><i class="fa fa-info-circle"></i></div>
                <div>${__('No data found for the selected filters')}</div>
            </div>`).appendTo(page.container);
            return;
        }

        // 1. Report Summary Metrics
        if (data.summary && data.summary.length > 0) {
            let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
            data.summary.forEach(metric => {
                let card = $(`
                    <div class="summary-card">
                        <div class="label"><span class="indicator bg-${metric.indicator.toLowerCase()}"></span>${metric.label}</div>
                        <div class="value">${frappe.format(metric.value, metric)}</div>
                    </div>
                `).appendTo(summary_row);
            });
        }
        
        // 2. Charts Row
        let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
        
        // Render each chart object provided by the standard controller
        const chart_config = {
            "top_5_salesperson": { field: "sales_person", title: "Salesperson" },
            "top_10_customers": { field: "customer_name", title: "Customer" },
            "top_10_products": { field: "item_code", title: "Product" }
        };

        Object.keys(data.charts).forEach(chart_id => {
            let chart_obj = data.charts[chart_id];
            let config = chart_config[chart_id];

            if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

            let wrapper = $(`
                <div class="chart-card">
                    <div class="title">
                        <span>${chart_obj.title}</span>
                        <div class="chart-actions">
                            ${page.filter_group.get_value(config.field) ? 
                                `<span class="reset-btn" data-field="${config.field}">Reset</span>` : ''}
                            <span class="export-btn" title="Export Chart Data" data-chart="${chart_id}">Download</span>
                        </div>
                    </div>
                    <div id="wrapper_${chart_id}" style="min-height: 300px;"></div>
                </div>
            `).appendTo(charts_row);
            
            setTimeout(() => {
                try {
                    new frappe.Chart(`#wrapper_${chart_id}`, {
                        data: chart_obj.data,
                        type: chart_obj.type || 'donut',
                        height: 300,
                        colors: chart_obj.colors,
                        regionFill: 1,
                        onClick: (event) => {
                            if (event.label) {
                                page.filter_group.set_value(config.field, event.label);
                                page.refresh();
                            }
                        }
                    });
                } catch (e) {
                    console.error("Error rendering chart " + chart_id, e);
                }
            }, 100);
        });

        // 2.5 Mini Tables Section (Salesperson, Customer, Product breakdown)
        let tables_row = $('<div class="charts-row" style="margin-top: 24px;"></div>').appendTo(page.container);
        
        const mini_table_configs = [
            { id: 'salesperson', title: 'Revenue by Salesperson', label: 'Salesperson' },
            { id: 'customer', title: 'Revenue by Customer', label: 'Customer' },
            { id: 'product', title: 'Revenue by Product', label: 'Product' }
        ];

        mini_table_configs.forEach(cfg => {
            let table_data = data.tables[cfg.id] || [];
            let card = $(`
                <div class="table-card" style="margin-top: 0; display: flex; flex-direction: column;">
                    <div class="header">
                        <span style="font-size: 14px;">${cfg.title}</span>
                    </div>
                    <div class="table-container" style="max-height: 400px; flex: 1;">
                        <table class="dashboard-table">
                            <thead>
                                <tr>
                                    <th>${cfg.label}</th>
                                    <th style="text-align: right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${table_data.length > 0 ? table_data.slice(0, 15).map(row => {
                                    let display_name = row.name;
                                    let title_text = row.name;
                                    
                                    if (cfg.id === 'product') {
                                        display_name = `<div style="line-height: 1.4;">
                                            <span class="text-muted" style="font-size: 10px; font-weight: 400;">${row.code}</span><br>
                                            <span style="font-size: 12px;">${row.name}</span>
                                        </div>`;
                                        title_text = `${row.code}: ${row.name}`;
                                    } else {
                                        display_name = `<span style="font-size: 12px;">${row.name}</span>`;
                                    }

                                    return `
                                    <tr>
                                        <td><div class="text-truncate" style="max-width: 180px;" title="${title_text}">${display_name}</div></td>
                                        <td style="text-align: right; font-weight: 600; color: var(--text-color);">
                                            ${frappe.format(row.value || 0, { fieldtype: 'Currency', currency: 'INR' })}
                                        </td>
                                    </tr>
                                    `;
                                }).join('') : `<tr><td colspan="2" class="text-center text-muted" style="padding: 20px;">No data</td></tr>`}
                            </tbody>
                        </table>
                    </div>
                </div>
            `).appendTo(tables_row);
        });

        // 3. Data Table Section
        if (data.results && data.results.length > 0) {
            let table_card = $(`
                <div class="table-card">
                    <div class="header">
                        <span>Detailed Sales Log</span>
                        <div class="table-actions">
                            <span class="text-muted" style="font-size: 12px; font-weight: 400; margin-right: 15px;">Showing ${data.results.length} records</span>
                            <span class="export-btn" id="table_export_btn">Export all fields to Excel</span>
                        </div>
                    </div>
                    <div class="table-container">
                        <table class="dashboard-table">
                            <thead>
                                <tr>
                                    <th>Invoice ID</th>
                                    <th>Date</th>
                                    <th>Customer</th>
                                    <th>Item</th>
                                    <th style="text-align: right;">Qty</th>
                                    <th style="text-align: right;">Amount (INR)</th>
                                    <th>Sales Person</th>
                                </tr>
                            </thead>
                            <tbody id="dashboard_table_body"></tbody>
                        </table>
                    </div>
                </div>
            `).appendTo(page.container);

            let tbody = $('#dashboard_table_body');
            data.results.forEach(row => {
                $(`
                    <tr>
                        <td>
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <a href="/app/sales-invoice/${row.invoice_id}" style="color: var(--primary); font-weight: 500;">${row.invoice_id}</a>
                                <span class="row-export-btn text-muted" title="Export this row" data-id="${row.invoice_id}" style="cursor: pointer; font-size: 10px;">
                                    <i class="fa fa-download"></i>
                                </span>
                            </div>
                        </td>
                        <td>${frappe.datetime.str_to_user(row.invoice_date)}</td>
                        <td>${row.customer_name}</td>
                        <td><span class="text-muted">${row.item_code}</span></td>
                        <td style="text-align: right;">${frappe.format(row.qty, { fieldtype: 'Float' })}</td>
                        <td style="text-align: right; font-weight: 600;">${frappe.format(row.base_amount, { fieldtype: 'Currency' })}</td>
                        <td>${row.sales_person || '-'}</td>
                    </tr>
                `).appendTo(tbody);
            });
        }

        // Handle Reset Buttons
        $('.reset-btn').on('click', function() {
            let field = $(this).data('field');
            page.filter_group.set_value(field, null);
            page.refresh();
        });

        // Handle Chart Export Buttons
        $('.chart-card .export-btn').on('click', function() {
            let chart_id = $(this).data('chart');
            let chart_data = data.charts[chart_id];
            export_chart_to_csv(chart_data);
        });

        // Handle Table Export Button
        $('#table_export_btn').on('click', function() {
            download_excel();
        });

        // Handle Single Row Export
        $('.row-export-btn').on('click', function() {
            let inv_id = $(this).data('id');
            download_excel(inv_id);
        });
    }

    function export_chart_to_csv(chart_obj) {
        let labels = chart_obj.data.labels;
        let values = chart_obj.data.datasets[0].values;
        let csvContent = "data:text/csv;charset=utf-8,Label,Value\n";
        
        labels.forEach((label, i) => {
            csvContent += `"${label}",${values[i]}\n`;
        });

        let encodedUri = encodeURI(csvContent);
        let link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${chart_obj.title.replace(/\s+/g, '_')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function download_excel(invoice_id = null) {
        let filters = page.filter_group.get_values();
        let args = { filters: filters };
        if (invoice_id) args.invoice_id = invoice_id;

        frappe.call({
            method: 'renu_customization.renu_customization.page.revenue_dashboard.revenue_dashboard.export_to_excel',
            args: args,
            callback: function(r) {
                if (r.message) {
                    const blob = b64toBlob(r.message.filecontent, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                    const link = document.createElement('a');
                    link.href = window.URL.createObjectURL(blob);
                    link.download = r.message.filename;
                    link.click();
                }
            }
        });
    }

    function b64toBlob(b64Data, contentType = '', sliceSize = 512) {
        const byteCharacters = atob(b64Data);
        const byteArrays = [];
        for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
            const slice = byteCharacters.slice(offset, offset + sliceSize);
            const byteNumbers = new Array(slice.length);
            for (let i = 0; i < slice.length; i++) {
                byteNumbers[i] = slice.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            byteArrays.push(byteArray);
        }
        return new Blob(byteArrays, { type: contentType });
    }

	page.refresh();
}
