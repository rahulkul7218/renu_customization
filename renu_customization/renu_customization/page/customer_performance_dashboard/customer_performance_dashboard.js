frappe.pages["customer_performance_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Customer Performance Dashboard "),
		single_column: true,
	});

	window.cur_page = page;
	page.set_primary_action(__("Refresh"), () => page.refresh());

    // Add Export Buttons to Menu
    page.add_menu_item(__("Export to Excel"), () => {
        let filters = page.filter_group.get_values();
        let baseUrl = frappe.request.url.split('?')[0];
        let queryParams = $.param({
            cmd: "renu_customization.renu_customization.page.customer_performance_dashboard.customer_performance_dashboard.export_to_excel",
            filters: JSON.stringify(filters),
            export_type: "all"
        });
        window.open(baseUrl + '?' + queryParams);
    });

    page.add_menu_item(__("Export to PDF"), () => export_pdf_full());

	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);

	let refresh_timer = null;
	page.refresh = function () {
		if (refresh_timer) clearTimeout(refresh_timer);
		refresh_timer = setTimeout(() => {
			perform_refresh();
		}, 100);
	};

	function perform_refresh() {
		let filters = page.filter_group.get_values();
		
		// Show loading indicator
		if (page.container.is(":empty") || page.container.find(".summary-wrapper").length === 0) {
			page.container.html(
				'<div class="text-center" style="padding: 100px 0;"><i class="fa fa-refresh fa-spin fa-2x text-muted"></i><div class="mt-2 text-muted">Loading Customer Performance Data...</div></div>'
			);
		} else {
			page.container.css("opacity", "0.6");
		}

		frappe.call({
			method: "renu_customization.renu_customization.page.customer_performance_dashboard.customer_performance_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				page.container.css("opacity", "1");
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
		});
	}

	const filter_fields = [
		{ fieldname: "fiscal_year", label: __("Fiscal Year"), fieldtype: "Link", options: "Fiscal Year", placeholder: __("Select Year") },
		{ fieldname: "from_date", label: __("From Date"), fieldtype: "Date" },
		{ fieldname: "to_date", label: __("To Date"), fieldtype: "Date" },
		{ fieldname: "company", label: __("Company"), fieldtype: "Link", options: "Company", default: frappe.defaults.get_user_default("Company") },
		{ fieldname: "customer_group", label: __("Customer Group"), fieldtype: "Link", options: "Customer Group", placeholder: __("Select Customer Group") },
		{ fieldname: "customer", label: __("Customer"), fieldtype: "Link", options: "Customer", placeholder: __("Select Customer") },
		{ fieldname: "sales_order", label: __("SO Details"), fieldtype: "Link", options: "Sales Order", placeholder: __("Select SO") },
		{ fieldname: "is_overdue", label: __("Overdue Deliveries"), fieldtype: "Check" },
		{ fieldname: "due_next_15_days", label: __("Due in Next 15 days"), fieldtype: "Check" },
	];

	$("<style>")
		.text(`
		.dashboard-filter-area { padding: 15px 20px 5px 20px !important; background-color: var(--bg-color) !important; border-bottom: 1px solid var(--border-color) !important; }
		.dashboard-filter-area .form-column form { display: flex !important; flex-wrap: wrap !important; gap: 15px !important; align-items: flex-end !important; }
		.dashboard-filter-area .frappe-control { margin-bottom: 10px !important; width: calc(25% - 12px) !important; }
		.dashboard-filter-area .control-label { font-size: 12px !important; font-weight: 600 !important; color: var(--text-muted) !important; margin-bottom: 6px !important; display: block !important; }
        .dashboard-filter-area .frappe-control[data-fieldtype="Check"] { display: flex !important; align-items: center !important; height: 32px; }
        .dashboard-filter-area .frappe-control[data-fieldtype="Check"] label { display: flex !important; align-items: center !important; margin-bottom: 0 !important; }
        .dashboard-filter-area .frappe-control[data-fieldtype="Check"] input { margin-right: 8px !important; }
	`).appendTo(filter_parent);

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
		on_change: () => page.refresh()
	});
	page.filter_group.make();

	page.filter_group.fields_dict.customer.get_query = function() {
		let customer_group = page.filter_group.get_value("customer_group");
		if (customer_group) {
			return {
				filters: {
					"customer_group": customer_group
				}
			};
		}
	};

    let fy_field = page.filter_group.get_field("fiscal_year");
    fy_field.df.on_change = () => {
        let fy = fy_field.get_value();
        if (fy) {
            frappe.db.get_value("Fiscal Year", fy, ["year_start_date", "year_end_date"], (r) => {
                if (r) {
                    page.filter_group.set_values({ from_date: r.year_start_date, to_date: r.year_end_date });
                    page.refresh();
                }
            });
        }
    };

    Object.keys(page.filter_group.fields_dict).forEach(key => {
        let f = page.filter_group.fields_dict[key];
        if (f.$input) f.$input.on("change input blur", () => page.refresh());
    });

	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .dashboard-content { padding: 20px; background: var(--bg-color); min-height: 100vh; font-family: 'Inter', sans-serif; color: var(--text-color); width: 100% !important; }
        .summary-wrapper { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 16px; margin-bottom: 24px; }
        .summary-card { background: var(--card-bg) !important; border: 1px solid var(--border-color); border-radius: 12px; padding: 16px; border-left: 5px solid #cbd5e1; }
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.red { border-left-color: #ef4444; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card .label { font-size: 11px; color: var(--text-muted); font-weight: 700; text-transform: uppercase; margin-bottom: 8px; }
        .summary-card .value { font-size: 20px; font-weight: 800; color: var(--text-color); }
        .charts-row { display: grid !important; grid-template-columns: 1fr !important; gap: 24px; margin-bottom: 24px; }
        .chart-card { background: var(--card-bg) !important; border-radius: 12px; padding: 24px; border: 1px solid var(--border-color); }
        .chart-card .title { font-size: 15px; font-weight: 700; margin-bottom: 20px; text-transform: uppercase; color: var(--text-color); }
        .table-card { background: var(--card-bg) !important; border-radius: 12px; border: 1px solid var(--border-color); margin-bottom: 24px; overflow: hidden; }
        .table-card .header { padding: 15px 24px; border-bottom: 1px solid var(--border-color); font-weight: 700; display: flex; justify-content: space-between; align-items: center; color: var(--text-color); }
        .export-btn { padding: 4px 12px; font-size: 11px; font-weight: 600; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 4px; cursor: pointer; transition: all 0.2s; color: var(--text-color); }
        .export-btn:hover { background: var(--border-color); }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; }
        .dashboard-table th { background: var(--bg-color); padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase; border-bottom: 1px solid var(--border-color); position: sticky; top: 0; z-index: 10; }
        .dashboard-table td { padding: 12px 16px; border-bottom: 1px solid var(--border-color); font-size: 13px; color: var(--text-color); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .month-table .col-sno { width: 60px; text-align: center; position: sticky; left: 0; background: var(--card-bg) !important; z-index: 5; border-right: 1px solid var(--border-color); }
        .month-table .col-customer { width: 250px; position: sticky; left: 60px; background: var(--card-bg) !important; z-index: 5; border-right: 1px solid var(--border-color); }
        .month-table th.col-sno, .month-table th.col-customer { z-index: 20; background: var(--bg-color) !important; }
        .col-sno { width: 45px; text-align: center; }
        .col-id { width: 155px; font-weight: 600; }
        .col-customer { width: auto; min-width: 200px; }
        .col-date { width: 125px; }
        .col-days { width: 85px; text-align: center !important; }
        .col-status { width: 160px; }
        .col-pct { width: 75px; text-align: center !important; }
        .col-amt { width: 120px; text-align: right !important; }
        th.col-amt, th.col-days, th.col-pct { text-align: right !important; }
        th.col-days, th.col-pct { text-align: center !important; }
        .dashboard-table tfoot { position: sticky; bottom: 0; background: var(--bg-color); z-index: 10; border-top: 2px solid var(--border-color); }
        .dashboard-table tfoot td { padding: 12px 16px; font-weight: 800; font-size: 14px; color: var(--text-color); }
        .indicator-pill { padding: 4px 10px; border-radius: 12px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .indicator-pill.completed { background: #dcfce7; color: #166534; }
        .indicator-pill.on-hold { background: #fef3c7; color: #92400e; }
        .indicator-pill.to-deliver-and-bill { background: #dbeafe; color: #1e40af; }
        .pct-badge { padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: 700; }
        .pct-badge.full { background: #10b981; color: white; }
        .pct-badge.partial { background: #f59e0b; color: white; }
        .pct-badge.none { background: #f1f5f9; color: #64748b; }
        .custom-legend { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border: 1px solid var(--border-color); }
        [data-theme="dark"] .custom-legend { background: var(--control-bg); }
        .legend-item { display: flex; align-items: flex-start; gap: 8px; }
        .legend-item .dot { width: 10px; height: 10px; border-radius: 3px; margin-top: 4px; flex-shrink: 0; }
        .legend-info { display: flex; flex-direction: column; gap: 2px; }
        .legend-label { font-size: 12px; font-weight: 700; color: var(--text-color); line-height: 1.2; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 150px; }
        .legend-value { font-size: 11px; color: var(--text-muted); font-weight: 500; }
        .chart-legend, .graph-legend, .frappe-chart .legend { display: none !important; }
    </style>`).appendTo(page.main);

	function render_dashboard(data) {
		page.container.empty();
		if (!data.results || data.results.length === 0) {
			$(`<div class="text-center text-muted" style="padding: 100px 0;">${__("No data found")}</div>`).appendTo(page.container);
			return;
		}

		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((m) => {
			let indicator = (m.indicator || "blue").toLowerCase();
			let val = m.fieldtype === "Currency" 
                ? "₹ " + (flt(m.value) / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M"
                : m.value;
			$(`
                <div class="summary-card ${indicator}">
                    <div class="label">${m.label}</div>
                    <div class="value">${val}</div>
                </div>
            `).appendTo(summary_row);
		});

		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
        page.chart_instances = {};
		Object.keys(data.charts).forEach((chart_id) => {
			let chart_obj = data.charts[chart_id];
            let title = chart_obj.title || chart_id.replace(/_/g, " ").toUpperCase();
			$(`
				<div class="chart-card">
					<div class="title">${title}</div>
					<div id="wrapper_${chart_id}" style="height: 300px;"></div>
				</div>
			`).appendTo(charts_row);

			setTimeout(() => {
				let chart = new frappe.Chart(`#wrapper_${chart_id}`, {
					data: chart_obj.data,
					type: chart_obj.type || "donut",
					height: 300,
					colors: chart_obj.colors,
					lineOptions: { hideLegend: 1 },
					legend: 0,
					show_legend: 0,
					tooltipOptions: {
						formatTooltipY: (d) =>
							chart_obj.is_currency
								? "₹ " + (d / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M"
								: d,
					},
				});
                page.chart_instances[chart_id] = chart;

				// Force redraw after a short delay to fix potential dimension issues on first load
				setTimeout(() => chart.draw(true), 250);

				if (chart_obj.type === "donut" || !chart_obj.type) {
					let total = chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0);
					let legend_html = $(`<div class="custom-legend" id="legend_${chart_id}"></div>`).appendTo($(`#wrapper_${chart_id}`).parent());
					chart_obj.data.labels.forEach((label, i) => {
						let val = chart_obj.data.datasets[0].values[i];
						let pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
						let color = chart_obj.colors[i % chart_obj.colors.length];
						let display_val = chart_obj.is_currency 
							? "₹ " + (val / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M"
							: val;

						legend_html.append(`
							<div class="legend-item">
								<div class="dot" style="background: ${color}"></div>
								<div class="legend-info">
									<div class="legend-label">${label}</div>
									<div class="legend-value">${display_val} (${pct}%)</div>
								</div>
							</div>
						`);
					});
				}
			}, 100);
		});

		// Month-Wise Booking Table
		let months = data.months || [];
		let month_table_card = $(`
            <div class="table-card">
                <div class="header">
					<span>${__("Month-Wise Booking Breakdown")}</span>
					<div class="export-options">
						<button class="export-btn" id="export_month_excel_btn">
							<i class="fa fa-file-excel-o"></i> ${__("Excel")}
						</button>
					</div>
				</div>
                <div style="overflow: auto; max-height: 500px;">
                    <table class="dashboard-table month-table" id="month_wise_table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-customer sortable-header" data-table="month" data-field="customer" style="width: 250px; cursor: pointer; user-select: none;">Customer <i class="fa fa-sort text-muted ml-1"></i></th>
                                ${months.map(m => `<th class="col-amt sortable-header" data-table="month" data-field="${m.key}" style="cursor: pointer; user-select: none;">${m.key} <i class="fa fa-sort text-muted ml-1"></i></th>`).join("")}
                                <th class="col-amt sortable-header" data-table="month" data-field="total" style="font-weight: 800; cursor: pointer; user-select: none;">Total (M) <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="month_wise_body"></tbody>
                        <tfoot>
                            <tr style="background: var(--bg-color); font-weight: 800;">
                                <td colspan="2" style="text-align: right;">GRAND TOTAL</td>
                                ${months.map(m => `<td class="col-amt" id="total_${m.sort}">0.00 M</td>`).join("")}
                                <td class="col-amt" id="grand_total_all">0.00 M</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let month_tbody = month_table_card.find("#month_wise_body");
		
		// DUE IN NEXT 15 DAYS Table
		let due_table_card = $(`
            <div class="table-card" style="margin-top: 24px;">
                <div class="header">
					<span>${__("Orders Due in Next 15 Days")}</span>
				</div>
                <div style="overflow: auto; max-height: 400px;">
                    <table class="dashboard-table due-table" id="due_15_days_table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-id sortable-header" data-table="due" data-field="name" style="cursor: pointer; user-select: none;">SO No <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-customer sortable-header" data-table="due" data-field="customer" style="cursor: pointer; user-select: none;">Customer <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="due" data-field="transaction_date" style="cursor: pointer; user-select: none;">Order Date <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="due" data-field="schedule_date" style="cursor: pointer; user-select: none;">Due Date <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-days sortable-header" data-table="due" data-field="due_days" style="cursor: pointer; user-select: none;">Days Left <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-status sortable-header" data-table="due" data-field="status" style="cursor: pointer; user-select: none;">Status <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-pct sortable-header" data-table="due" data-field="per_delivered" style="cursor: pointer; user-select: none;">% Del. <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-table="due" data-field="net_total" style="cursor: pointer; user-select: none;">Net Total <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="due_body"></tbody>
                        <tfoot>
                            <tr>
                                <td colspan="8" style="text-align: right;">TOTAL DUE VALUE</td>
                                <td id="total_due_value" style="text-align: right;">₹ 0.00 M</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let due_tbody = due_table_card.find("#due_body");
		
		// Detailed Customer Orders List Table
		let table_card = $(`
            <div class="table-card" style="margin-top: 24px;">
                <div class="header">
					<span>${__("Detailed Customer Orders List")}</span>
					<div class="export-options">
						<button class="export-btn" id="export_excel_btn">
							<i class="fa fa-file-excel-o"></i> ${__("Excel")}
						</button>
						<button class="export-btn" id="export_pdf_btn">
							<i class="fa fa-file-pdf-o"></i> ${__("PDF")}
						</button>
					</div>
				</div>
                <div style="overflow: auto; max-height: 500px;">
                    <table class="dashboard-table" id="detailed_orders_table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-id sortable-header" data-table="detailed" data-field="name" style="cursor: pointer; user-select: none;">SO No <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-customer sortable-header" data-table="detailed" data-field="customer" style="cursor: pointer; user-select: none;">Customer <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="detailed" data-field="transaction_date" style="cursor: pointer; user-select: none;">Date <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-date sortable-header" data-table="detailed" data-field="schedule_date" style="cursor: pointer; user-select: none;">Expected Delivery <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-status sortable-header" data-table="detailed" data-field="status" style="cursor: pointer; user-select: none;">Status <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-pct sortable-header" data-table="detailed" data-field="per_delivered" style="cursor: pointer; user-select: none;">% Del. <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-pct sortable-header" data-table="detailed" data-field="per_billed" style="cursor: pointer; user-select: none;">% Bill. <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th class="col-amt sortable-header" data-table="detailed" data-field="net_total" style="cursor: pointer; user-select: none;">Net Total <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="so_list_body"></tbody>
                        <tfoot>
                            <tr>
                                <td colspan="8" style="text-align: right;">TOTAL BOOKED VALUE</td>
                                <td id="total_booked_value" style="text-align: right;">₹ 0.00 M</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let tbody = table_card.find("#so_list_body");

		// State variables for sorting
		let month_sort = { field: "customer", asc: true };
		let due_sort = { field: "due_days", asc: true };
		let detailed_sort = { field: "transaction_date", asc: false };

		const render_month_table = () => {
			let sorted_data = [...(data.month_wise_customer || [])];
			sorted_data.sort((a, b) => {
				let val_a, val_b;
				if (month_sort.field === "customer") {
					val_a = a.customer || "";
					val_b = b.customer || "";
					return month_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				} else if (month_sort.field === "total") {
					val_a = flt(a.total);
					val_b = flt(b.total);
				} else {
					val_a = flt(a.months[month_sort.field]);
					val_b = flt(b.months[month_sort.field]);
				}
				return month_sort.asc ? val_a - val_b : val_b - val_a;
			});

			month_tbody.empty();
			let month_totals = {};
			let grand_total_all = 0;

			sorted_data.forEach((row, idx) => {
				let row_total = row.total || 0;
				grand_total_all += row_total;
				let row_html = `
					<tr>
						<td class="col-sno">${idx + 1}</td>
						<td class="col-customer" title="${row.customer}">${row.customer}</td>
						${months.map(m => {
							let val = row.months[m.key] || 0;
							month_totals[m.sort] = (month_totals[m.sort] || 0) + val;
							return `<td class="col-amt">₹ ${(val / 1000000).toFixed(2)} M</td>`;
						}).join("")}
						<td class="col-amt" style="font-weight: 700;">₹ ${(row_total / 1000000).toFixed(2)} M</td>
					</tr>
				`;
				month_tbody.append(row_html);
			});

			months.forEach(m => {
				month_table_card.find(`#total_${m.sort}`).text(`₹ ${( (month_totals[m.sort] || 0) / 1000000).toFixed(2)} M`);
			});
			month_table_card.find("#grand_total_all").text(`₹ ${(grand_total_all / 1000000).toFixed(2)} M`);
		};

		const render_due_table = () => {
			let sorted_data = [...(data.due_next_15_days || [])];
			sorted_data.sort((a, b) => {
				let val_a = a[due_sort.field];
				let val_b = b[due_sort.field];
				
				if (due_sort.field === "name" || due_sort.field === "customer" || due_sort.field === "status") {
					val_a = val_a || "";
					val_b = val_b || "";
					return due_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				} else if (due_sort.field === "transaction_date" || due_sort.field === "schedule_date") {
					val_a = val_a ? new Date(val_a) : new Date(0);
					val_b = val_b ? new Date(val_b) : new Date(0);
				} else {
					val_a = flt(val_a);
					val_b = flt(val_b);
				}
				return due_sort.asc ? val_a - val_b : val_b - val_a;
			});

			due_tbody.empty();
			let due_total_val = 0;

			sorted_data.forEach((row, idx) => {
				due_total_val += flt(row.net_total);
				let days_class = row.due_days <= 3 ? "text-danger font-weight-bold" : (row.due_days <= 7 ? "text-warning" : "");
				let del_class = row.per_delivered >= 100 ? "full" : (row.per_delivered > 0 ? "partial" : "none");

				due_tbody.append(`
					<tr>
						<td class="col-sno">${idx + 1}</td>
						<td class="col-id"><a href="/app/sales-order/${row.name}">${row.name}</a></td>
						<td class="col-customer" title="${row.customer}">${row.customer}</td>
						<td class="col-date">${frappe.datetime.str_to_user(row.transaction_date)}</td>
						<td class="col-date" style="font-weight: 600;">${frappe.datetime.str_to_user(row.schedule_date)}</td>
						<td class="col-days ${days_class}">${row.due_days} ${__("Days")}</td>
						<td class="col-status"><span class="indicator-pill ${row.status.toLowerCase().replace(/ /g, '-')}">${row.status}</span></td>
						<td class="col-pct"><span class="pct-badge ${del_class}">${Math.round(row.per_delivered)}%</span></td>
						<td class="col-amt" style="font-weight: 700;">₹ ${(flt(row.net_total) / 1000000).toFixed(2)} M</td>
					</tr>
				`);
			});
			due_table_card.find("#total_due_value").text(`₹ ${(due_total_val / 1000000).toFixed(2)} M`);
		};

		const render_detailed_table = () => {
			let sorted_data = [...(data.results || [])];
			sorted_data.sort((a, b) => {
				let val_a = a[detailed_sort.field];
				let val_b = b[detailed_sort.field];
				
				if (detailed_sort.field === "name" || detailed_sort.field === "customer" || detailed_sort.field === "status") {
					val_a = val_a || "";
					val_b = val_b || "";
					return detailed_sort.asc ? val_a.localeCompare(val_b) : val_b.localeCompare(val_a);
				} else if (detailed_sort.field === "transaction_date" || detailed_sort.field === "schedule_date") {
					val_a = val_a ? new Date(val_a) : new Date(0);
					val_b = val_b ? new Date(val_b) : new Date(0);
				} else {
					val_a = flt(val_a);
					val_b = flt(val_b);
				}
				return detailed_sort.asc ? val_a - val_b : val_b - val_a;
			});

			tbody.empty();
			sorted_data.forEach((row, idx) => {
				let del_class = row.per_delivered >= 100 ? "full" : (row.per_delivered > 0 ? "partial" : "none");
				let bill_class = row.per_billed >= 100 ? "full" : (row.per_billed > 0 ? "partial" : "none");

				tbody.append(`
					<tr>
						<td class="col-sno">${idx + 1}</td>
						<td class="col-id"><a href="/app/sales-order/${row.name}">${row.name}</a></td>
						<td class="col-customer" title="${row.customer}">${row.customer}</td>
						<td class="col-date">${frappe.datetime.str_to_user(row.transaction_date)}</td>
						<td class="col-date" style="font-weight: 600;">${frappe.datetime.str_to_user(row.schedule_date)}</td>
						<td class="col-status"><span class="indicator-pill ${row.status.toLowerCase().replace(/ /g, '-')}">${row.status}</span></td>
						<td class="col-pct"><span class="pct-badge ${del_class}">${Math.round(row.per_delivered)}%</span></td>
						<td class="col-pct"><span class="pct-badge ${bill_class}">${Math.round(row.per_billed)}%</span></td>
						<td class="col-amt" style="font-weight: 700;">₹ ${(flt(row.net_total) / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M</td>
					</tr>
				`);
			});

			let total_val = sorted_data.reduce((acc, row) => acc + flt(row.net_total), 0);
			table_card.find("#total_booked_value").text(`₹ ${(total_val / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} M`);
		};

		// Initial render of all tables
		render_month_table();
		render_due_table();
		render_detailed_table();

		// Header clicks for real-time sort toggling
		page.container.on("click", ".sortable-header", function () {
			const table_type = $(this).data("table");
			const field = $(this).data("field");
			
			if (table_type === "month") {
				if (month_sort.field === field) {
					month_sort.asc = !month_sort.asc;
				} else {
					month_sort.field = field;
					month_sort.asc = true;
				}
				
				// Reset icons
				month_table_card.find(".sortable-header i").removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");
				month_table_card.find(".sortable-header").removeClass("sorted-asc sorted-desc");
				
				// Update active
				if (month_sort.asc) {
					$(this).addClass("sorted-asc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
				} else {
					$(this).addClass("sorted-desc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
				}
				
				render_month_table();
			} else if (table_type === "due") {
				if (due_sort.field === field) {
					due_sort.asc = !due_sort.asc;
				} else {
					due_sort.field = field;
					due_sort.asc = true;
				}
				
				// Reset icons
				due_table_card.find(".sortable-header i").removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");
				due_table_card.find(".sortable-header").removeClass("sorted-asc sorted-desc");
				
				// Update active
				if (due_sort.asc) {
					$(this).addClass("sorted-asc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
				} else {
					$(this).addClass("sorted-desc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
				}
				
				render_due_table();
			} else if (table_type === "detailed") {
				if (detailed_sort.field === field) {
					detailed_sort.asc = !detailed_sort.asc;
				} else {
					detailed_sort.field = field;
					detailed_sort.asc = true;
				}
				
				// Reset icons
				table_card.find(".sortable-header i").removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");
				table_card.find(".sortable-header").removeClass("sorted-asc sorted-desc");
				
				// Update active
				if (detailed_sort.asc) {
					$(this).addClass("sorted-asc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
				} else {
					$(this).addClass("sorted-desc");
					$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
				}
				
				render_detailed_table();
			}
		});

		month_table_card.find("#export_month_excel_btn").on("click", () => export_data_excel("summary"));
		table_card.find("#export_excel_btn").on("click", () => export_data_excel("all"));
		table_card.find("#export_pdf_btn").on("click", () => export_pdf_full());

        function export_data_excel(type) {
            let filters = page.filter_group.get_values();
            let baseUrl = frappe.request.url.split('?')[0];
            let queryParams = $.param({
                cmd: "renu_customization.renu_customization.page.customer_performance_dashboard.customer_performance_dashboard.export_to_excel",
                filters: JSON.stringify(filters),
                export_type: type
            });
            window.open(baseUrl + '?' + queryParams);
        }
	}

    async function export_pdf_full() {
        frappe.show_alert({message: __("Preparing professional PDF export with visual legends..."), indicator: "blue"});
        
        const data = page.dashboard_data;
        if (!data) return;

        const get_chart_image = (chart_id) => {
            return new Promise((resolve) => {
                const chart = page.chart_instances[chart_id];
                if (!chart) return resolve(null);
                
                const svg = chart.parent.querySelector('svg');
                const svgData = new XMLSerializer().serializeToString(svg);
                const canvas = document.createElement("canvas");
                const svgSize = svg.getBoundingClientRect();
                canvas.width = svgSize.width * 2;
                canvas.height = svgSize.height * 2;
                const ctx = canvas.getContext("2d");
                const img = new Image();
                img.onload = () => {
                    ctx.fillStyle = "white";
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    resolve(canvas.toDataURL("image/png"));
                };
                img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
                setTimeout(() => resolve(null), 2000);
            });
        };

        const chart_images = {};
        for (let cid of Object.keys(data.charts)) {
            chart_images[cid] = await get_chart_image(cid);
        }

        const report_date = frappe.datetime.global_date_format(frappe.datetime.now_date());
        const filters = page.filter_group.get_values();
        const period = `${frappe.datetime.str_to_user(filters.from_date || '')} to ${frappe.datetime.str_to_user(filters.to_date || '')}`;

        let html = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #1e293b; background: #fff; }
                    @page { size: A4 landscape; margin: 10mm; }
                    .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
                    .report-title { margin: 0; font-size: 24px; color: #0f172a; text-transform: uppercase; }
                    .kpi-row { display: table; width: 100%; border-spacing: 10px; margin-bottom: 25px; }
                    .kpi-card { display: table-cell; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; background: #f8fafc; text-align: center; border-left: 5px solid #3b82f6; }
                    .kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
                    .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
                    .section-title { font-size: 14px; font-weight: 700; color: #3b82f6; margin: 25px 0 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
                    .chart-section { display: table; width: 100%; margin-bottom: 30px; page-break-inside: avoid; }
                    .chart-cell { display: table-cell; width: 50%; padding: 15px; border: 1px solid #f1f5f9; border-radius: 12px; background: #fff; vertical-align: top; }
                    .chart-title { font-weight: 800; margin-bottom: 15px; font-size: 12px; text-align: center; color: #1e293b; text-transform: uppercase; }
                    .chart-img { max-width: 80%; height: auto; display: block; margin: 0 auto 15px; }
                    
                    /* PDF Legend Styling */
                    .pdf-legend { display: table; width: 100%; border-spacing: 5px; margin-top: 10px; background: #f8fafc; padding: 10px; border-radius: 8px; }
                    .pdf-legend-row { display: table-row; }
                    .pdf-legend-item { display: table-cell; width: 25%; font-size: 7px; padding: 3px; vertical-align: top; }
                    .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 5px; vertical-align: middle; }
                    .legend-text { display: inline-block; vertical-align: middle; line-height: 1.2; width: 80%; }
                    .legend-name { font-weight: 700; color: #1e293b; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
                    .legend-val { color: #64748b; font-size: 6.5px; }

                    table { width: 100%; border-collapse: collapse; font-size: 9px; margin-bottom: 20px; table-layout: fixed; }
                    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: left; word-wrap: break-word; overflow: hidden; }
                    th { background: #f1f5f9 !important; font-weight: 700; color: #475569; text-transform: uppercase; }
                    .col-amt { text-align: right; width: 10%; }
                    .col-sno { width: 4%; text-align: center; }
                    .col-id { width: 11%; }
                    .col-customer { width: 22%; }
                    .col-date { width: 10%; }
                    .col-status { width: 12%; }
                    .col-pct { width: 6%; text-align: center; }
                    .col-days { width: 7%; text-align: center; }
                    .text-danger { color: #ef4444 !important; }
                    .page-break { page-break-after: always; }
                </style>
            </head>
            <body>
                <div class="report-header">
                    <h1 class="report-title">Customer Performance Report</h1>
                    <p style="font-size: 12px; color: #64748b;">Period: ${period} | Generated: ${report_date}</p>
                </div>

                <div class="kpi-row">
                    ${data.summary.map(m => `
                        <div class="kpi-card" style="border-left-color: ${m.indicator === 'Green' ? '#10b981' : (m.indicator === 'Red' ? '#ef4444' : '#3b82f6')}">
                            <div class="kpi-label">${m.label}</div>
                            <div class="kpi-value">${m.fieldtype === 'Currency' ? '₹ ' + (flt(m.value) / 1000000).toFixed(2) + ' M' : m.value}</div>
                        </div>
                    `).join('')}
                </div>

                <h3 class="section-title">Visual Analytics</h3>
                <div class="chart-section">
                ${Object.keys(data.charts).map(cid => {
                    let c_obj = data.charts[cid];
                    let title = c_obj.title || cid.replace(/_/g, " ").toUpperCase();
                    let labels = c_obj.data.labels;
                    let values = c_obj.data.datasets[0].values;
                    let colors = c_obj.colors;
                    let total = values.reduce((a, b) => a + b, 0);

                    // Generate Legend Rows (4 items per row)
                    let legend_html = '<div class="pdf-legend">';
                    for (let i = 0; i < labels.length; i += 4) {
                        legend_html += '<div class="pdf-legend-row">';
                        for (let j = 0; j < 4; j++) {
                            if (labels[i + j]) {
                                let val = values[i + j];
                                let pct = total > 0 ? ((val / total) * 100).toFixed(1) : 0;
                                let display_val = c_obj.is_currency 
                                    ? "₹ " + (val / 1000000).toFixed(2) + " M"
                                    : val;
                                legend_html += `
                                    <div class="pdf-legend-item">
                                        <div class="legend-dot" style="background: ${colors[(i+j) % colors.length]}"></div>
                                        <div class="legend-text">
                                            <span class="legend-name">${labels[i + j]}</span>
                                            <span class="legend-val">${display_val} (${pct}%)</span>
                                        </div>
                                    </div>
                                `;
                            } else {
                                legend_html += '<div class="pdf-legend-item"></div>';
                            }
                        }
                        legend_html += '</div>';
                    }
                    legend_html += '</div>';

                    return `
                    <div class="chart-cell">
                        <div class="chart-title">${title}</div>
                        ${chart_images[cid] ? `<img src="${chart_images[cid]}" class="chart-img">` : '<p>Chart image unavailable</p>'}
                        ${legend_html}
                    </div>`;
                }).join('')}
                </div>

                <div class="page-break"></div>
                <h3 class="section-title">Month-Wise Booking Breakdown (M INR)</h3>
                <table>
                    <thead>
                        <tr>
                            <th class="col-sno">S.No.</th>
                            <th class="col-customer">Customer</th>
                            ${data.months.map(m => `<th class="col-amt">${m.key}</th>`).join("")}
                            <th class="col-amt">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.month_wise_customer.map((row, idx) => `
                            <tr>
                                <td class="col-sno">${idx + 1}</td>
                                <td class="col-customer">${row.customer}</td>
                                ${data.months.map(m => `<td class="col-amt">₹ ${(flt(row.months[m.key] || 0) / 1000000).toFixed(2)}</td>`).join("")}
                                <td class="col-amt">₹ ${(flt(row.total) / 1000000).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div class="page-break"></div>
                <h3 class="section-title">Orders Due in Next 15 Days (M INR)</h3>
                <table>
                    <thead>
                        <tr>
                            <th class="col-sno">S.No.</th>
                            <th class="col-id">SO No</th>
                            <th class="col-customer">Customer</th>
                            <th class="col-date">Order Date</th>
                            <th class="col-date">Due Date</th>
                            <th class="col-days">Days Left</th>
                            <th class="col-status">Status</th>
                            <th class="col-pct">% Del.</th>
                            <th class="col-amt">Net Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.due_next_15_days.map((row, idx) => `
                            <tr>
                                <td class="col-sno">${idx + 1}</td>
                                <td class="col-id">${row.name}</td>
                                <td class="col-customer">${row.customer}</td>
                                <td class="col-date">${frappe.datetime.str_to_user(row.transaction_date)}</td>
                                <td class="col-date">${frappe.datetime.str_to_user(row.schedule_date)}</td>
                                <td class="col-days">${row.due_days} Days</td>
                                <td class="col-status">${row.status}</td>
                                <td class="col-pct">${Math.round(row.per_delivered)}%</td>
                                <td class="col-amt">₹ ${(flt(row.net_total) / 1000000).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3 class="section-title">Detailed Orders List</h3>
                <table>
                    <thead>
                        <tr>
                            <th class="col-sno">S.No.</th>
                            <th class="col-id">SO No</th>
                            <th class="col-customer">Customer</th>
                            <th class="col-date">Date</th>
                            <th class="col-date">Expected Del.</th>
                            <th class="col-status">Status</th>
                            <th class="col-pct">% Del.</th>
                            <th class="col-pct">% Bill.</th>
                            <th class="col-amt">Net Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.results.map((row, idx) => `
                            <tr>
                                <td class="col-sno">${idx + 1}</td>
                                <td class="col-id">${row.name}</td>
                                <td class="col-customer">${row.customer}</td>
                                <td class="col-date">${frappe.datetime.str_to_user(row.transaction_date)}</td>
                                <td class="col-date">${frappe.datetime.str_to_user(row.schedule_date)}</td>
                                <td class="col-status">${row.status}</td>
                                <td class="col-pct">${Math.round(row.per_delivered)}%</td>
                                <td class="col-pct">${Math.round(row.per_billed)}%</td>
                                <td class="col-amt">₹ ${(flt(row.net_total) / 1000000).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

        const $form = $(`<form action="/api/method/renu_customization.renu_customization.page.customer_performance_dashboard.customer_performance_dashboard.export_to_pdf" method="POST" style="display:none;">
            <input type="hidden" name="html" value="">
            <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
        </form>`).appendTo("body");
        $form.find('input[name="html"]').val(html);
        $form.submit();
        $form.remove();
    }

	frappe.call({
		method: "frappe.client.get_value",
		args: {
			doctype: "Fiscal Year",
			filters: { year_start_date: ["<=", frappe.datetime.get_today()], year_end_date: [">=", frappe.datetime.get_today()] },
			fieldname: "name"
		},
		callback: function (r) {
			if (r.message) page.filter_group.set_value("fiscal_year", r.message.name);
		},
		always: function() { 
			setTimeout(() => {
				page.refresh();
				setTimeout(() => page.refresh(), 500);
			}, 300);
		}
	});
};
