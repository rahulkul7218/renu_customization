frappe.pages["sales_order_booking_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Sales Order Booking Dashboard (Million INR)"),
		single_column: true,
	});

	window.cur_page = page;
	page.set_primary_action(__("Refresh"), () => page.refresh());

	// Standard Frappe Filters
	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);

	let refresh_timer = null;
	page.refresh = function () {
		if (refresh_timer) clearTimeout(refresh_timer);
		refresh_timer = setTimeout(() => {
			perform_refresh();
		}, 50);
	};

	function perform_refresh() {
		let filters = page.filter_group.get_values();
		if (page.container) page.container.css("opacity", "0.6");

		frappe.call({
			method: "renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				if (page.container) page.container.css("opacity", "1");
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
		});
	}

	const filter_fields = [
		{
			fieldname: "fiscal_year",
			label: __("Fiscal Year"),
			fieldtype: "Link",
			options: "Fiscal Year",
			placeholder: __("Select Year"),
		},
		{
			label: __("Customer"),
			fieldname: "customer",
			fieldtype: "Link",
			options: "Customer",
			placeholder: __("Select Customer"),
		},
		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
			placeholder: __("Select Group"),
		},
		{
			label: __("Product (Item)"),
			fieldname: "item_code",
			fieldtype: "Link",
			options: "Item",
			placeholder: __("Select Item"),
		},
		{
			fieldname: "item_group",
			label: __("Product Group"),
			fieldtype: "Link",
			options: "Item Group",
			placeholder: __("Select Product Group"),
		},
		{
			label: __("Sales Person"),
			fieldname: "sales_person",
			fieldtype: "Link",
			options: "Sales Person",
			placeholder: __("Select Sales Person"),
		},
		{
			fieldname: "territory",
			label: __("Territory"),
			fieldtype: "Link",
			options: "Territory",
			placeholder: __("Select Territory"),
		},

		{
			fieldname: "dom_exp",
			label: __("Type"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"],
			placeholder: __("Select Type"),
		},
		{
			fieldname: "invoice_type",
			label: __("Invoice Type"),
			fieldtype: "Select",
			options: [
				"",
				"Product Domestic",
				"Product Export",
				"Engineering Service Domestic",
				"Engineering Service Export",
			],
			placeholder: __("Select Invoice Type"),
		},
	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
	});
	page.filter_group.make();

	$("<style>")
		.text(
			`
		.dashboard-filter-area {
			padding: 15px 20px 5px 20px !important;
			background-color: #fff !important;
			border-bottom: 1px solid #e2e8f0 !important;
		}
		.dashboard-filter-area .form-section .section-body,
		.dashboard-filter-area .section-body,
		.dashboard-filter-area .form-column {
			display: block !important;
			width: 100% !important;
		}
		.dashboard-filter-area .form-column form {
			display: flex !important;
			flex-wrap: wrap !important;
			gap: 15px !important;
			align-items: flex-end !important;
		}
		.dashboard-filter-area .frappe-control[data-fieldtype="Column Break"],
		.dashboard-filter-area .frappe-control[data-fieldtype="Section Break"] {
			display: none !important;
		}
		.dashboard-filter-area .frappe-control {
			margin-bottom: 10px !important;
			width: calc(20% - 12px) !important;
		}
		.dashboard-filter-area .frappe-control .form-group {
			margin-bottom: 0 !important;
			width: 100% !important;
		}
		.dashboard-filter-area .control-input,
		.dashboard-filter-area .awesomplete,
		.dashboard-filter-area input,
		.dashboard-filter-area select {
			width: 100% !important;
			max-width: 100% !important;
		}
		.dashboard-filter-area label,
		.dashboard-filter-area .control-label {
			font-size: 12px !important;
			font-weight: 600 !important;
			color: #475569 !important;
			margin-bottom: 6px !important;
			display: block !important;
			white-space: nowrap !important;
		}
	`,
		)

		.appendTo(filter_parent);

	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		field.on_change = () => page.refresh();
		if (field.$input) {
			field.$input.on("change input blur", () => {
				setTimeout(() => page.refresh(), 50);
			});
		}
	});

	filter_parent.addClass("border-bottom").css({
		"background-color": "#fff",
		"margin-bottom": "0",
	});

    page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        
        .dashboard-content { 
            padding: 20px; 
            background: #ffffff; 
            min-height: 100vh; 
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
            color: #1e293b;
            width: 100% !important;
            box-sizing: border-box;
        }

        /* KPI Cards Styling */
        .summary-wrapper { 
            display: grid !important; 
            grid-template-columns: repeat(4, 1fr) !important; 
            gap: 16px; 
            margin-bottom: 24px; 
            width: 100% !important;
        }
        .summary-card { 
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 12px; 
            padding: 16px; 
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
            border-left: 4px solid #cbd5e1;
        }
        
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.purple { border-left-color: #8b5cf6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card.cyan { border-left-color: #06b6d4; }
        .summary-card.red { border-left-color: #ef4444; }

        .summary-card .label { 
            font-size: 11px; 
            color: #64748b; 
            font-weight: 700; 
            margin-bottom: 6px; 
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }
        .summary-card .value { 
            font-size: 20px; 
            font-weight: 800; 
            color: #0f172a; 
        }

        /* Charts Row Styling */
        .charts-row { 
            display: grid; 
            grid-template-columns: 1fr; 
            gap: 24px; 
            margin-bottom: 24px; 
            width: 100%;
        }
        .chart-card { 
            background: #fff; border-radius: 12px; padding: 24px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
            border: 1px solid #e2e8f0;
        }
        .chart-card .title { 
            font-size: 15px; font-weight: 700; color: #1e293b; 
            margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.025em;
        }

        .custom-legend { 
            display: grid; 
            grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); 
            gap: 16px; 
            margin-top: 30px; 
            padding: 20px; 
            border-top: 1px solid #f1f5f9;
            background: #fafafa;
            border-radius: 8px;
        }
        .legend-item { display: flex; align-items: flex-start; gap: 12px; }
        .legend-item .dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
        .legend-item .info { display: flex; flex-direction: column; line-height: 1.2; }
        .legend-item .label { font-size: 12px; font-weight: 600; color: #475569; text-decoration: none !important; }
        .legend-item .val { font-size: 11px; color: #94a3b8; }

        /* Hard hide internal chart legend */
        .frappe-chart .chart-legend, .frappe-chart .legend { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important; }
        
        /* Standard chart text */
        .frappe-chart text { font-size: 11px !important; }
        .chart-actions, .table-actions { display: flex; gap: 12px; align-items: center; }
        .chart-card .export-btn, .table-card .header .export-btn, .table-card .header .pdf-btn, .export-btn { 
            font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; 
            padding: 6px 14px; border-radius: 6px; transition: all 0.2s;
            display: inline-flex; align-items: center; gap: 6px;
            background: #fff; border: 1px solid #e2e8f0;
            white-space: nowrap;
        }
        .export-btn:hover { 
            color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; 
            box-shadow: 0 2px 4px rgba(37, 99, 235, 0.1);
        }
        .export-btn i { font-size: 14px; }
        
        /* Modern Table Styling */
        .table-card { 
            background: #fff; border-radius: 12px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
            margin-bottom: 24px; overflow: hidden;
            border: 1px solid #e2e8f0;
            width: 100%;
        }
        .table-card .header { 
            padding: 15px 24px; background: #fff;
            border-bottom: 1px solid #f1f5f9; font-weight: 700; 
            color: #0f172a; display: flex; justify-content: space-between; align-items: center;
            flex-wrap: nowrap; gap: 16px;
        }
        
        .table-container { 
            overflow: auto; width: 100%; max-height: 750px; 
            position: relative;
            border-top: 1px solid #e2e8f0;
        }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        
        .dashboard-table th { 
            background: #f8fafc; padding: 12px 16px; text-align: left; 
            font-size: 11px; font-weight: 700; color: #64748b; 
            position: sticky; top: 0; z-index: 50; 
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            white-space: nowrap;
        }
        
        .dashboard-table td { 
            padding: 12px 16px; border-bottom: 1px solid #f1f5f9; 
            font-size: 13px; color: #334155; 
            background: #fff;
            vertical-align: middle;
        }

        /* Column Widths & Alignment */
        .col-sno { width: 60px !important; text-align: center !important; }
        .col-customer { width: 280px !important; min-width: 280px !important; }
        .col-sp { width: 180px !important; min-width: 180px !important; }
        .col-prod { width: 220px !important; min-width: 220px !important; }
        .col-amt { width: 150px !important; min-width: 150px !important; text-align: right !important; }
        .col-qty { width: 90px !important; min-width: 90px !important; text-align: right !important; }
        .col-date { width: 120px !important; min-width: 120px !important; }
        .col-id { width: 160px !important; min-width: 160px !important; }
        .col-status { width: 140px !important; min-width: 140px !important; }

        /* Total Columns (Right Sticky) */
        .total-net-col { 
            position: sticky !important; right: 180px; z-index: 25; 
            background: #f8fafc !important; font-weight: 700; 
            text-align: right !important; border-left: 2px solid #cbd5e1;
            width: 180px !important; min-width: 180px !important;
        }
        .grand-total-col { 
            position: sticky !important; right: 0; z-index: 25; 
            background: #f0f4ff !important; font-weight: 800; 
            text-align: right !important; border-left: 1px solid #e2e8f0;
            color: #4338ca !important;
            width: 180px !important; min-width: 180px !important;
        }
        
        .dashboard-table th.total-net-col, .dashboard-table th.grand-total-col { z-index: 60 !important; }

        /* Sticky Footer */
        .dashboard-table tr.sticky-total td { 
            position: sticky; bottom: 0; background: #f8fafc !important; 
            border-top: 2px solid #cbd5e1; z-index: 70; font-weight: 700; color: #0f172a;
        }
        .dashboard-table tr.sticky-total td.total-net-col, .dashboard-table tr.sticky-total td.grand-total-col { z-index: 80 !important; }

        .indicator-pill { 
            padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.025em;
        }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.blue { background: #dbeafe; color: #1e40af; }
        .indicator-pill.orange { background: #fef3c7; color: #92400e; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        .indicator-pill.gray { background: #f1f5f9; color: #475569; }

        .export-btn { 
            background: #fff; border: 1px solid #e2e8f0; padding: 6px 14px; 
            border-radius: 8px; font-size: 12px; font-weight: 600; color: #475569;
            cursor: pointer; transition: all 0.2s; display: inline-flex; align-items: center; gap: 8px;
            width: fit-content !important; box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        .export-btn:hover { background: #f8fafc; border-color: #cbd5e1; color: #1e293b; transform: translateY(-1px); }

        /* Hybrid Filters Styling */
        .hybrid-filter-container { display: flex; gap: 16px; align-items: center; }
        .hybrid-filter-container .frappe-control { width: 220px !important; }
        .hybrid-filter-container input { 
            height: 38px !important; border-radius: 10px !important; 
            background: #f8fafc !important; border: 1px solid #e2e8f0 !important;
            font-size: 13px !important;
        }
    </style>`).appendTo(page.main);

	function render_dashboard(data) {
		page.container.empty();
        page.clear_menu();
		if (!data.results || data.results.length === 0) {
			$(
				`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found for the selected filters")}</div></div>`,
			).appendTo(page.container);
			return;
		}

		// 1. KPI Cards
		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((metric) => {
            let indicator = (metric.indicator || "blue").toLowerCase();
			$(`
                <div class="summary-card ${indicator}">
                    <div class="label">${metric.label}</div>
                    <div class="value">${format_currency_short(metric.value)}</div>
                </div>
            `).appendTo(summary_row);
		});

		// 2. Charts Row
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		Object.keys(data.charts).forEach((chart_id) => {
			let chart_obj = data.charts[chart_id];
			if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

			$(`
                <div class="chart-card">
                    <div class="title"><span>${chart_obj.title}</span></div>
                    <div id="wrapper_${chart_id}" style="height: 350px;"></div>
                    <div id="legend_${chart_id}" class="custom-legend"></div>
                </div>
            `).appendTo(charts_row);

			setTimeout(() => {
				new frappe.Chart(`#wrapper_${chart_id}`, {
					data: chart_obj.data,
					type: "donut",
					height: 350,
					colors: chart_obj.colors,
					valuesOverPoints: 1,
                    isNavigable: 1,
                    legend: 0,
                    show_legend: 0, 
                    legendOptions: { showLegend: false },
					tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
				});

                // Render Custom Legend
                let legend_container = page.container.find(`#legend_${chart_id}`);
                let total_val = chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0);
                
                chart_obj.data.labels.forEach((label, idx) => {
                    let val = chart_obj.data.datasets[0].values[idx];
                    let color = chart_obj.colors[idx % chart_obj.colors.length];
                    let share = total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";
                    
                    // Clean double names (e.g. "John Doe - John Doe")
                    let display_label = label;
                    if (label && label.includes(' - ')) {
                        let parts = label.split(' - ');
                        if (parts[0] === parts[1]) display_label = parts[0];
                    }

                    legend_container.append(`
                        <div class="legend-item">
                            <span class="dot" style="background: ${color}"></span>
                            <div class="info">
                                <span class="label">${display_label}</span>
                                <span class="val">${format_currency_short(val)} (${share})</span>
                            </div>
                        </div>
                    `);
                });
			}, 100);
		});

		// 3. Tables Section
		let tables_container = $('<div class="tables-view"></div>').appendTo(page.container);

		// Prepare unique sorted months
		let months = [];
		let months_map = {};
		data.results.forEach((row) => {
			let d = moment(row.so_date);
			let m_key = d.format("MMM YYYY");
			let m_sort = d.format("YYYYMM");
			if (!months_map[m_key]) {
				months_map[m_key] = m_sort;
				months.push({ key: m_key, sort: m_sort });
			}
		});
		months.sort((a, b) => a.sort - b.sort);

		let tables_html = $(`
            <div class="table-card" style="margin-top: 24px; overflow: visible;">
                <div class="header" style="overflow: visible;">
                    <span style="font-size: 15px;">${__("Month-Wise Booking Breakdown")}</span>
                    <div class="table-actions" style="overflow: visible;">
                        <div class="d-flex table-filters" style="gap: 10px; overflow: visible;">
                            <div id="filter_customer_link" style="width: 200px;"></div>
                            <div id="filter_sp_link" style="width: 200px;"></div>
                            <div id="filter_product_link" style="width: 200px;"></div>
                        </div>
                        <div class="d-flex" style="gap: 8px; margin-left: 10px;">
                            <span class="export-btn" id="export_month_table">
                                <i class="fa fa-file-excel-o"></i> Export
                            </span>
                            <span class="export-btn pdf-btn" id="pdf_month_table">
                                <i class="fa fa-file-pdf-o"></i> PDF
                            </span>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table month-table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-customer">Customer</th>
                                <th class="col-sp">Sales Person</th>
                                <th class="col-prod">Product</th>
                                ${months.map((m) => `<th class="col-amt">${m.key}</th>`).join("")}
                                <th class="total-net-col">Total (Net)</th>
                                <th class="grand-total-col">Grand Total (Gross)</th>
                            </tr>
                        </thead>
                        <tbody id="booking_month_body"></tbody>
                    </table>
                </div>
            </div>

            <div class="table-card" style="margin-top: 32px;">
                <div class="header">
                    <span style="font-size: 15px;">${__("Detailed Sales Orders List")}</span>
                    <div class="table-actions">
                        <span id="so_count" style="font-size: 12px; color: #64748b; font-weight: 500; margin-right: 12px;"></span>
                        <div class="export-btn" id="export_list_table">
                            <i class="fa fa-file-excel-o"></i> Export
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-id">Order ID</th>
                                <th class="col-date">Date</th>
                                <th class="col-status">Status</th>
                                <th class="col-customer">Customer</th>
                                <th class="col-prod">Item</th>
                                <th class="col-sp">Sales Person</th>
                                <th class="col-qty">Qty</th>
                                <th class="col-amt">Amount (Net M)</th>
                            </tr>
                        </thead>
                        <tbody id="so_list_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_container);

		const render_filtered_view = (filtered_data) => {
			let tbody_month = tables_container.find("#booking_month_body");
			let tbody_list = tables_container.find("#so_list_body");
			tbody_month.empty();
			tbody_list.empty();

			// 3.1 Process Month-Wise Booking Breakdown
			let merged_data = {};
			filtered_data.forEach((row) => {
				let sp = row.sales_person || "-";
				let cust = row.customer_name || "-";
				let prod = row.item_name || row.item_code || "-";
				let amt = flt(row["total_net_amount_(inr)"] || row.po_total);
                let g_amt = flt(row.gross_total || amt);
				let m_key = moment(row.so_date).format("MMM YYYY");
				let key = sp + "|" + cust + "|" + prod;
				if (!merged_data[key]) merged_data[key] = { sp, cust, prod, months: {}, total: 0, total_gross: 0 };
				merged_data[key].months[m_key] = (merged_data[key].months[m_key] || 0) + amt;
				merged_data[key].total += amt;
                merged_data[key].total_gross += g_amt;
			});

			let summary_list = Object.values(merged_data).sort((a, b) => b.total - a.total);
			let total_month_amts = {};
			let total_month_gross_amts = {};
			let g_total_net = 0;
			let g_total_gross = 0;

			if (summary_list.length === 0) {
				tbody_month.append(`<tr><td colspan="${6 + months.length}" class="text-center text-muted" style="padding: 40px;">No data matching filters</td></tr>`);
			} else {
				summary_list.forEach((row, idx) => {
					g_total_net += row.total;
					g_total_gross += row.total_gross;
					let cells = months.map((m) => {
                        let val = row.months[m.key] || 0;
                        total_month_amts[m.key] = (total_month_amts[m.key] || 0) + val;
                        return `<td class="col-amt">${format_currency_short(val)}</td>`;
                    }).join("");

					tbody_month.append(`
                        <tr>
                            <td class="col-sno" style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                            <td class="col-customer" style="font-weight: 600; color: #0f172a;">${row.cust}</td>
                            <td class="col-sp">${row.sp}</td>
                            <td class="col-prod" style="font-size: 12px; color: #64748b;">${row.prod}</td>
                            ${cells}
                            <td class="total-net-col">${format_currency_short(row.total)}</td>
                            <td class="grand-total-col">${format_currency_short(row.total_gross)}</td>
                        </tr>
                    `);
				});

                // Month-wise Gross totals for footer
                filtered_data.forEach(r => {
                    let m_key = moment(r.so_date).format("MMM YYYY");
                    total_month_gross_amts[m_key] = (total_month_gross_amts[m_key] || 0) + flt(r.gross_total || r.total_net_amount_inr);
                });

				// Footer Rows
				tbody_month.append(`
                    <tr class="sticky-total">
                        <td class="col-sno">-</td>
                        <td class="col-customer" style="text-align: right; padding-right: 20px; color: #64748b; font-size: 11px;">GRAND TOTAL (NET)</td>
                        <td class="col-sp">-</td>
                        <td class="col-prod">-</td>
                        ${months.map(m => `<td class="col-amt">${format_currency_short(total_month_amts[m.key] || 0)}</td>`).join("")}
                        <td class="total-net-col">${format_currency_short(g_total_net)}</td>
                        <td class="grand-total-col">-</td>
                    </tr>
                    <tr class="sticky-total" style="bottom: 0;">
                        <td class="col-sno">-</td>
                        <td class="col-customer" style="text-align: right; padding-right: 20px; color: #64748b; font-size: 11px;">GRAND TOTAL (GROSS)</td>
                        <td class="col-sp">-</td>
                        <td class="col-prod">-</td>
                        ${months.map(m => `<td class="col-amt" style="background: #f0f4ff !important; color: #4338ca;">${format_currency_short(total_month_gross_amts[m.key] || 0)}</td>`).join("")}
                        <td class="total-net-col">-</td>
                        <td class="grand-total-col">${format_currency_short(g_total_gross)}</td>
                    </tr>
                `);
			}

			// 3.2 Detailed Sales Orders List
			tables_container.find("#so_count").text(`Showing ${filtered_data.length} orders`);
			let total_qty = 0, total_amt = 0;

			if (filtered_data.length === 0) {
				tbody_list.append(`<tr><td colspan="9" class="text-center text-muted" style="padding: 40px;">No data matching filters</td></tr>`);
			} else {
				filtered_data.forEach((row, idx) => {
					let status_color = "gray";
					if (["Completed", "Closed"].includes(row.status)) status_color = "green";
					if (["Draft"].includes(row.status)) status_color = "blue";
					if (["To Deliver", "To Bill", "To Deliver and Bill"].includes(row.status)) status_color = "orange";
					if (["Cancelled"].includes(row.status)) status_color = "red";

					let qty = flt(row.order_quantity || row.po_qty);
					let amt = flt(row["total_net_amount_(inr)"] || row.po_total);
					total_qty += qty;
					total_amt += amt;

					tbody_list.append(`
                        <tr>
                            <td class="col-sno" style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                            <td class="col-id"><a href="/app/sales-order/${row.so_no}" style="font-weight: 600; color: #4338ca;">${row.so_no}</a></td>
                            <td class="col-date">${frappe.datetime.str_to_user(row.so_date)}</td>
                            <td class="col-status"><span class="indicator-pill ${status_color}">${row.status}</span></td>
                            <td class="col-customer" style="font-weight: 500;">${row.customer_name}</td>
                            <td class="col-prod" style="font-size: 12.5px;">${row.item_code}</td>
                            <td class="col-sp">${row.sales_person || "-"}</td>
                            <td class="col-qty" style="font-weight: 600;">${frappe.format(qty, { fieldtype: "Float" })}</td>
                            <td class="col-amt" style="font-weight: 700; color: #0f172a;">${format_currency_short(amt)}</td>
                        </tr>
                    `);
				});

				tbody_list.append(`
                    <tr class="sticky-total">
                        <td colspan="7" style="text-align: right; padding-right: 24px; color: #64748b;">GRAND TOTAL</td>
                        <td style="text-align: right; font-weight: 700; color: #0f172a;">${frappe.format(total_qty, { fieldtype: "Float" })}</td>
                        <td style="text-align: right; font-weight: 800; color: #0f172a; border-left: 1px solid #e2e8f0;">${format_currency_short(total_amt)}</td>
                    </tr>
                `);
			}
		};
        
		const export_pdf = async () => {
			const report_date = frappe.datetime.now_datetime();
			const filters = page.filter_group.get_values();
			let period = "Custom Period";
			if (filters.fiscal_year) period = filters.fiscal_year;
			if (filters.from_date && filters.to_date) period = `${filters.from_date} to ${filters.to_date}`;

			const get_chart_png = (id) => {
				const svg_el = document.querySelector(`#wrapper_${id} svg`);
				if (!svg_el) return null;
                const clone = svg_el.cloneNode(true);
                const internal_legend = clone.querySelector('.chart-legend, .legend, .frappe-chart-legend');
                if (internal_legend) internal_legend.style.display = 'none';
				const canvas = document.createElement("canvas");
				const context = canvas.getContext("2d");
				const svg_data = new XMLSerializer().serializeToString(clone);
				const img = new Image();
				return new Promise((resolve) => {
					img.onload = () => {
						canvas.width = img.width * 2;
						canvas.height = img.height * 2;
						context.fillStyle = "white";
						context.fillRect(0, 0, canvas.width, canvas.height);
						context.drawImage(img, 0, 0, canvas.width, canvas.height);
						resolve(canvas.toDataURL("image/png"));
					};
					img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg_data)));
				});
			};

			const [png1, png2, png3] = await Promise.all([
				get_chart_png("top_10_salesperson"),
				get_chart_png("top_10_customers"),
				get_chart_png("top_10_products"),
			]);

			const chart_h = (src, title) => src ? `<div style="margin-top:20px; text-align:center;"><h4 style="color:#444; margin-bottom: 15px; padding-bottom: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${title}</h4><img src="${src}" style="width:100%; max-width:900px; border:1px solid #f1f5f9; border-radius:12px; padding: 15px; background: #fff;"></div>` : "";
			
            const chart_l = (chart_id) => {
                const c_obj = data.charts[chart_id];
                if (!c_obj || !c_obj.data.labels.length) return "";
                const total_val = c_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;
                
                let legend_html = '<div class="pdf-legend">';
                c_obj.data.labels.forEach((l, i) => {
                    const val = c_obj.data.datasets[0].values[i];
                    const color = c_obj.colors[i % c_obj.colors.length];
                    const share = ((val / total_val) * 100).toFixed(1);
                    let display_label = l;
                    if (l && l.includes(' - ')) {
                        let parts = l.split(' - ');
                        if (parts[0] === parts[1]) display_label = parts[0];
                    }
                    legend_html += `
                        <div class="pdf-legend-item">
                            <span class="pdf-dot" style="background: ${color}"></span>
                            <div class="pdf-legend-info">
                                <div class="pdf-legend-label">${display_label}</div>
                                <div class="pdf-legend-val">${format_currency_short(val)} (${share}%)</div>
                            </div>
                        </div>
                    `;
                });
                legend_html += '</div>';
                return legend_html;
            };

            const chart_t = (chart_id, title) => {
				const c_obj = data.charts[chart_id];
				if (!c_obj || !c_obj.data.labels.length) return "";
				const total_val = c_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;
				let rows = c_obj.data.labels.map((l, i) => {
						const val = c_obj.data.datasets[0].values[i];
						const share = ((val / total_val) * 100).toFixed(1);
                        let display_label = l;
                        if (l && l.includes(' - ')) {
                            let parts = l.split(' - ');
                            if (parts[0] === parts[1]) display_label = parts[0];
                        }
						return `<tr><td style="text-align:center;">${i + 1}</td><td>${display_label}</td><td style="text-align:right;">${format_currency_short(val)}</td><td style="text-align:right;">${share}%</td></tr>`;
					}).join("");
				return `<div style="margin-top:10px; page-break-inside: avoid;"><table style="width:80%; margin: 10px auto; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;"><thead><tr style="background: #f8f9fa;"><th style="width: 40px; text-align:center; border-bottom:2px solid #3b82f6;">S.No.</th><th style="text-align:left; border-bottom:2px solid #3b82f6;">${title}</th><th style="width: 120px; text-align:right; border-bottom:2px solid #3b82f6;">Net Booking (M)</th><th style="width: 80px; text-align:right; border-bottom:2px solid #3b82f6;">Share %</th></tr></thead><tbody>${rows}</tbody></table></div>`;
			};

			const html = `
				<html>
				<head>
					<style>
                        @page { size: landscape; margin: 10mm; }
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 10px; color: #1e293b; line-height: 1.2; zoom: 0.9; }
                        .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
                        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
                        
                        .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 15px; table-layout: fixed; }
                        .kpi-card { display: table-cell; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; text-align: center; vertical-align: top; }
                        .kpi-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
                        .kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; white-space: nowrap; }
                        .kpi-value { font-size: 14px; font-weight: 800; color: #0f172a; white-space: nowrap; }
                        
                        h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 12px; text-transform: uppercase; letter-spacing: 0.025em; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8px; border: 1px solid #e2e8f0; table-layout: fixed; page-break-inside: auto; }
                        tr { page-break-inside: avoid; page-break-after: auto; }
                        thead { display: table-header-group; }
                        tfoot { display: table-row-group; }
						th, td { border: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; word-wrap: break-word; overflow: hidden; }
						th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 7px; }
                        td { background: #fff; }
                        
                        .col-sno { width: 25px; text-align: center; }
                        .col-customer { width: 110px; font-weight: 600; }
                        .col-sp { width: 80px; }
                        .col-prod { width: 90px; }
                        .col-amt { width: 55px; text-align: right; white-space: nowrap; }
                        .total-net-col, .grand-total-col { width: 65px; text-align: right; font-weight: 700; white-space: nowrap; }
                        
						.text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-weight-bold { font-weight: 700; }
						.page-break { page-break-after: always; }

                        /* Legend Styles for PDF */
                        .pdf-legend { display: block; margin-top: 15px; text-align: left; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .pdf-legend-item { display: inline-block; width: 30%; margin-bottom: 12px; vertical-align: top; margin-right: 2%; }
                        .pdf-dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 8px; vertical-align: middle; }
                        .pdf-legend-info { display: inline-block; vertical-align: middle; width: calc(100% - 25px); }
                        .pdf-legend-label { font-size: 11px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .pdf-legend-val { font-size: 9px; color: #64748b; }
					</style>
				</head>
				<body>
					<div class="report-header">
						<h1 style="margin:0; font-size: 24px;">Sales Order Booking Dashboard</h1>
						<p style="font-size: 14px; color: #555; margin: 8px 0;">${period}</p>
						<p style="font-size: 11px; color: #999; margin: 0;">Generated: ${report_date}</p>
					</div>
					<div class="kpi-wrapper">
						${data.summary.slice(0, 4).map((m) => {
                            let color = "#3498db";
                            if (m.indicator === "green") color = "#2ecc71";
                            if (m.indicator === "orange") color = "#e67e22";
                            if (m.indicator === "red") color = "#e74c3c";
                            if (m.indicator === "purple") color = "#9b59b6";
                            return `
							<div class="kpi-card">
								<div class="kpi-label"><span class="kpi-dot" style="background: ${color};"></span>${m.label}</div>
								<div class="kpi-value">${format_currency_short(m.value)}</div>
							</div>
						`}).join("")}
					</div>
					<div class="kpi-wrapper">
						${data.summary.slice(4).map((m) => {
                            let color = "#3498db";
                            if (m.indicator === "green") color = "#2ecc71";
                            if (m.indicator === "orange") color = "#e67e22";
                            if (m.indicator === "red") color = "#e74c3c";
                            if (m.indicator === "purple") color = "#9b59b6";
                            return `
							<div class="kpi-card">
								<div class="kpi-label"><span class="kpi-dot" style="background: ${color};"></span>${m.label}</div>
								<div class="kpi-value">${format_currency_short(m.value)}</div>
							</div>
						`}).join("")}
					</div>
					<h3>Visual Analytics</h3>
					${chart_h(png1, "Top Salesperson by Booking")}
                    ${chart_l("top_10_salesperson")}
					${chart_t("top_10_salesperson", "Top Salesperson Data")}
                    <div class="page-break"></div>
					${chart_h(png2, "Top Customers by Booking")}
                    ${chart_l("top_10_customers")}
					${chart_t("top_10_customers", "Top Customers Data")}
					${chart_h(png3, "Top Products by Booking")}
                    ${chart_l("top_10_products")}
					${chart_t("top_10_products", "Top Products Data")}
					<div class="page-break"></div>
					<h3>Month-Wise Booking Breakdown (M)</h3>
					<table>
						${tables_container.find(".month-table").html()}
					</table>
                    <div class="page-break"></div>
					<h3>Detailed Sales Orders List (M)</h3>
					<table>
						${tables_container.find(".table-card:last table").html()}
					</table>
				</body>
				</html>
			`;

            const method_url = "/api/method/renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.export_to_pdf";
            const $form = $(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
                <input type="hidden" name="html" value="">
                <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
            </form>`).appendTo("body");
            $form.find('input[name="html"]').val(html);
            $form.submit();
            $form.remove();
		};

		// Capture local variables in helpers before they are lost
		tables_container.find("#export_month_table").on("click", () => {
			let html = `<html><head><meta charset="utf-8"></head><body><h3>Month-Wise Order Value</h3><table border="1">`;
			html += tables_container.find("#so_month_body").closest("table").html();
			html += `</table></body></html>`;
			const blob = new Blob([html], { type: "application/vnd.ms-excel" });
			const url = window.URL.createObjectURL(blob);
			const btn = document.createElement("a");
			btn.href = url;
			btn.download = `Month_Wise_Orders_${frappe.datetime.now_date()}.xls`;
			btn.click();
		});

		tables_container.find("#export_list_table").on("click", () => {
			let html = `<html><head><meta charset="utf-8"></head><body><h3>Sales Orders List</h3><table border="1">`;
			html += tables_container.find("#so_list_body").closest("table").html();
			html += `</table></body></html>`;
			const blob = new Blob([html], { type: "application/vnd.ms-excel" });
			const url = window.URL.createObjectURL(blob);
			const btn = document.createElement("a");
			btn.href = url;
			btn.download = `Sales_Orders_List_${frappe.datetime.now_date()}.xls`;
			btn.click();
		});

		// Hybrid Filter Logic
		const apply_local_filters = () => {
			const c_val = (f_cust_ctrl.$input ? f_cust_ctrl.$input.val() || "" : "")
				.toLowerCase()
				.trim();
			const s_val = (f_sp_ctrl.$input ? f_sp_ctrl.$input.val() || "" : "")
				.toLowerCase()
				.trim();
			const i_val = (f_item_ctrl.$input ? f_item_ctrl.$input.val() || "" : "")
				.toLowerCase()
				.trim();

			let filtered = data.results.filter((row) => {
				const cust_match =
					!c_val ||
					(row.customer_name || "").toLowerCase().includes(c_val) ||
					(row.customer || "").toLowerCase().includes(c_val);
				const sp_match = !s_val || (row.sales_person || "").toLowerCase().includes(s_val);
				const item_match =
					!i_val ||
					(row.item_code || "").toLowerCase().includes(i_val) ||
					(row.item_name || "").toLowerCase().includes(i_val);
				return cust_match && sp_match && item_match;
			});
			render_filtered_view(filtered);
		};

		let f_cust_ctrl, f_sp_ctrl, f_item_ctrl;

		const make_hybrid_filter = (parent_id, placeholder, options) => {
			let parent = page.container.find("#" + parent_id);
			let ctrl = frappe.ui.form.make_control({
				parent: parent,
				df: {
					fieldtype: "Autocomplete",
					placeholder: placeholder,
					options: options,
					on_change: () => apply_local_filters(),
				},
				render_input: true,
			});

			parent.css("position", "relative");
			if (ctrl.$input) {
				let control_input = parent.find(".control-input");
				control_input.css("position", "relative");
				ctrl.$input.css({ "padding-right": "24px" });

				let clear_btn = $(
					'<span style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); cursor: pointer; color: #adb5bd; font-size: 16px; font-weight: 600; display: none; line-height: 1; user-select: none;">&times;</span>',
				).appendTo(control_input);

				ctrl.$input.on("input change awesomplete-selectcomplete", function () {
					if ($(this).val()) {
						clear_btn.show();
					} else {
						clear_btn.hide();
					}
				});

				clear_btn.on("click", function () {
					ctrl.$input.val("").trigger("change");
					ctrl.$input.focus();
					clear_btn.hide();
				});
			}
			return ctrl;
		};

		const init_hybrid_ui = () => {
			f_cust_ctrl = make_hybrid_filter(
				"filter_customer_link",
				__("Filter Customer"),
				[...new Set(data.results.map((r) => r.customer_name || r.customer))].sort(),
			);
			f_sp_ctrl = make_hybrid_filter(
				"filter_sp_link",
				__("Filter Sales Person"),
				[...new Set(data.results.map((r) => r.sales_person || ""))].filter(Boolean).sort(),
			);
			f_item_ctrl = make_hybrid_filter(
				"filter_product_link",
				__("Filter Product"),
				[...new Set(data.results.map((r) => r.item_code))].sort(),
			);

			[f_cust_ctrl, f_sp_ctrl, f_item_ctrl].forEach((ctrl) => {
				if (ctrl && ctrl.$input) {
					ctrl.$input.on("input change", () => apply_local_filters());
					ctrl.$input.on("awesomplete-selectcomplete", () =>
						setTimeout(() => apply_local_filters(), 10),
					);
				}
			});
		};

		// Table Action Handlers
		tables_container.on("click", "#export_month_table", () => export_to_excel());
		tables_container.on("click", "#pdf_month_table", () => export_pdf());
		tables_container.on("click", "#export_list_table", () => export_to_excel());

		// Initial table render
		render_filtered_view(data.results);
		init_hybrid_ui();

		page.add_menu_item(__("Export to PDF"), () => export_pdf());
		page.add_menu_item(__("Export to Excel"), () => export_to_excel());
	}



	const export_to_excel = () => {
		frappe.call({
			method: "renu_customization.renu_customization.page.sales_order_booking_dashboard.sales_order_booking_dashboard.export_to_excel",
			args: { filters: page.filter_group.get_values() },
			callback: (r) => {
				if (r.message) {
					const b64 = r.message.filecontent;
					const link = document.createElement("a");
					link.href = "data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64," + b64;
					link.download = r.message.filename;
					link.click();
				}
			},
		});
	};

	setTimeout(() => page.refresh(), 100);
};

function format_currency_short(num) {
    if (!num && num !== 0) return "₹ 0.00 M";
    let value = flt(num) / 1000000;
    return "₹ " + value.toLocaleString("en-IN", { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    }) + " M";
}
