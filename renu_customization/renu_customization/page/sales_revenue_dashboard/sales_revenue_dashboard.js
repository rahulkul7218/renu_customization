frappe.pages["sales_revenue_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Sales Revenue Dashboard"),
		single_column: true,
	});

	page.set_primary_action(__("Refresh"), () => page.refresh());
	page.add_menu_item(__("Export to Excel"), () => download_excel());

	// Standard Frappe Filters - Using a dedicated container to avoid conflicts with standard page styles
	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);

	// Define refresh with debounce to handle "on-time" filtering without overloading the server
	let refresh_timer = null;
	page.refresh = function () {
		if (refresh_timer) clearTimeout(refresh_timer);
		refresh_timer = setTimeout(() => {
			perform_refresh();
		}, 50); // Fast, 50ms debounce for "on-time" feel
	};

	function perform_refresh() {
		let filters = page.filter_group.get_values();

		// Show loading state
		if (page.container) {
			page.container.css("opacity", "0.6");
		}

		frappe.call({
			method: "renu_customization.renu_customization.page.sales_revenue_dashboard.sales_revenue_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				if (page.container) page.container.css("opacity", "1");
				if (r.message) {
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
			placeholder: __("Select Fiscal Year"),
			options: "Fiscal Year",
		},
		{ fieldtype: "Column Break" },
		{
			label: __("Customer"),
			placeholder: __("Select Customer"),
			fieldname: "customer",
			fieldtype: "Link",
			options: "Customer",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			placeholder: __("Select Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
		},
		{ fieldtype: "Column Break" },
		{
			label: __("Product (Item)"),
			placeholder: __("Select Product"),
			fieldname: "item_code",
			fieldtype: "Link",
			options: "Item",
		},

		{ fieldtype: "Column Break" },

		{
			fieldname: "item_group",
			label: __("Product Group"),
			placeholder: __("Select Product Group"),
			fieldtype: "Link",
			options: "Item Group",
		},
		{ fieldtype: "Section Break" },

		{
			label: __("Sales Person"),
			placeholder: __("Select Sales Person"),
			fieldname: "sales_person",
			fieldtype: "Link",
			options: "Sales Person",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "territory",
			label: __("Territory"),
			placeholder: __("Select Territory"),
			fieldtype: "Link",
			options: "Territory",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "status",
			label: __("Status"),
			placeholder: __("Select Status"),
			fieldtype: "MultiSelect",
			options: ["Draft", "To Bill", "To Deliver and Bill", "To Deliver", "Completed"],
		},

		{ fieldtype: "Column Break" },

		{
			fieldname: "dom_exp",
			label: __("Type"),
			placeholder: __("Select Type"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"],
		},
		{ fieldtype: "Column Break" },

		{
			fieldname: "invoice_type",
			label: __("Invoice Type"),
			placeholder: __("Select Invoice Type"),
			fieldtype: "Select",
			options: [
				"",
				"Product Domestic",
				"Product Export",
				"Engineering Service Domestic",
				"Engineering Service Export",
			],
		},
	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_parent,
		fields: filter_fields,
	});
	page.filter_group.make();

	// ENSURE LIVE FILTERING WORKS - Attaching robust listeners to all controls
	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		if (!["Column Break", "Section Break"].includes(field.df.fieldtype)) {
			field.on_change = () => page.refresh();
			field.df.on_change = () => page.refresh();

			if (field.$input) {
				field.$input.on("change input blur", () => {
					// Slight delay to allow Frappe to process the value
					setTimeout(() => page.refresh(), 50);
				});
			}

			if (field.df.fieldtype === "Link") {
				field.on_change = function () {
					page.refresh();
				};
				// For Link fields, ensure the input change also triggers
				field.set_input_change && field.set_input_change(() => page.refresh());
			}
		}
	});

	// Global listener for the entire filter area as a final backup
	filter_parent.on("change", "input, select", () => page.refresh());

	// Style the filter area and fields
	filter_parent.addClass("border-bottom").css({
		"background-color": "#fff",
		"margin-bottom": "0",
	});

	// Explicitly show the filter container
	filter_parent.show();

	// Content container mimicking standard Dashboard structure
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        .page-head .title-text, .page-head .breadcrumb-text { color: #1a1a1a !important; font-weight: 700 !important; }
		.page-title{color: #000 !important; }
        .page-head { border-bottom: 1px solid #ddd !important; background: #fff !important; color: #000}
        .dashboard-content { padding: 20px; background: #fff; min-height: 100vh; }
        .summary-wrapper { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .summary-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 12px; 
            padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .summary-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .summary-card .label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 24px; font-weight: 700; color: #000; }
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
        .chart-card .title { font-size: var(--text-md); font-weight: 600; color: #000; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .chart-actions, .table-actions { display: flex; gap: 12px; align-items: center; }
        .chart-card .reset-btn, .chart-card .export-btn, .table-card .export-btn { font-size: 11px; cursor: pointer; color: var(--primary); font-weight: 500; }
        .chart-card .export-btn, .table-card .export-btn { color: var(--text-muted); }
        .chart-card .export-btn:hover, .table-card .export-btn:hover { color: var(--primary); }

        .table-card { 
            background: #fff; 
            border: 1px solid var(--border-color); 
            border-radius: 8px; 
            box-shadow: 0 1px 3px rgba(0,0,0,0.05); 
            margin-bottom: 30px;
            width: 100%;
            max-width: 100%;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            z-index: 1; /* Contain all internal sticky elements */
        }
        .table-card .header { 
            padding: 10px 15px; 
            border-bottom: 1px solid var(--border-color); 
            font-weight: 600; 
            color: #1a1a1a; 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            background: #fff;
            flex-shrink: 0;
            z-index: 10;
        }
        .table-container { 
            overflow: auto !important; 
            width: 100%; 
            max-width: 100%;
            position: relative;
            max-height: 500px;
            background: #fff;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
            z-index: 2;
        }
        .dashboard-table { 
            width: 100%; 
            border-collapse: separate; 
            border-spacing: 0;
            table-layout: auto; 
        }
        .dashboard-table th { 
            background: #f1f3f5; 
            padding: 12px 14px; 
            text-align: left; 
            font-size: 11px; 
            color: #555 !important; /* Darken header text */
            position: sticky; 
            top: 0; 
            z-index: 5; 
            border-bottom: 1px solid #dee2e6; 
            white-space: nowrap; 
            font-weight: 600;
        }
        .dashboard-table td { 
            padding: 12px 14px; 
            border-top: 1px solid var(--border-color); 
            font-size: 13px; 
            background: #fff;
            color: #333;
        }
        .month-col { text-align: right !important; min-width: 100px; }
        .total-col { 
            text-align: right !important; 
            font-weight: 700; 
            min-width: 120px; 
            background: #f8f9fa !important; 
            position: sticky; 
            right: 0; 
            z-index: 2; 
            border-left: 1px solid #dee2e6; 
        }
        .dashboard-table th.total-col { 
            z-index: 6; 
            color: #333 !important;
            background: #f1f3f5 !important;
        }
        .dashboard-table tr:hover td { background: #f8f9fa; }
        .dashboard-table tr.sticky-total td { 
            position: sticky; 
            bottom: 0; 
            background: #f1f3f5; 
            border-top: 1px solid #dee2e6; 
            z-index: 4; 
            font-weight: 700;
            color: #333;
        }
        .dashboard-table tr.sticky-total td.total-col { z-index: 7; background: #e9ecef !important; }
        .sticky-total-header { 
            position: sticky !important; 
            right: 0; 
            background: #f1f3f5 !important; 
            z-index: 6 !important; 
            border-left: 1px solid #dee2e6; 
            color: #333 !important;
        }
        
        .table-filters .link-field-btn { display: none !important; }
        .awesomplete { z-index: 1000 !important; }
        .awesomplete > ul { z-index: 1001 !important; }

        .pill { padding: 2px 8px; border-radius: 12px; font-size: 11px; color: #fff; }
        .pill-status { background: var(--primary); }

        @media (max-width: 991px) {
            .charts-row { grid-template-columns: 1fr; }
        }
        
        /* Compact filtering for table header */
        .table-filters .frappe-control { margin-bottom: 0 !important; }
        .table-filters .frappe-control .label-area { display: none !important; }
        .table-filters .form-group { margin-bottom: 0 !important; }
        .table-filters .input-with-feedback { background-color: #f8f9fa; border-radius: 4px; }
        
        /* Fixed Column Widths for Month Table */
        .month-col { min-width: 140px; text-align: right !important; white-space: nowrap; }
        .total-col { min-width: 160px; text-align: right !important; font-weight: 700; color: var(--primary); white-space: nowrap; }
        .dashboard-table th, .dashboard-table td { min-width: 120px; }
        .dashboard-table th:first-child, .dashboard-table td:first-child { min-width: 250px; }
    </style>`).appendTo(page.main);

	function render_dashboard(data) {
		page.container.empty();
		// 0. No Data Placeholder
		if (!data.results || data.results.length === 0) {
			$(`<div class="text-center text-muted" style="padding: 100px 0;">
                <div style="font-size: 40px; margin-bottom: 20px;"><i class="fa fa-info-circle"></i></div>
                <div>${__("No data found for the selected filters")}</div>
            </div>`).appendTo(page.container);
			return;
		}

		// 1. Report Summary Metrics
		if (data.summary && data.summary.length > 0) {
			let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
			const render_summary_card = (title, chart_id) => {
				let card_html = `
                    <div class="chart-card">
                        <div class="header">
                            <span>${title}</span>
                        </div>
                        <div class="chart-container" id="${chart_id}"></div>
                    </div>
                `;
				return card_html;
			};
			data.summary.forEach((metric) => {
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
			top_5_salesperson: { field: "sales_person", title: "Salesperson" },
			top_10_customers: { field: "customer", title: "Customer" },
			top_10_products: { field: "item_code", title: "Product" },
		};

		Object.keys(data.charts).forEach((chart_id) => {
			let chart_obj = data.charts[chart_id];
			let config = chart_config[chart_id];

			if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

			let wrapper = $(`
                <div class="chart-card">
                    <div class="title">
                        <span>${chart_obj.title}</span>
                        <div class="chart-actions">
                            ${
								page.filter_group.get_value(config.field)
									? `<span class="reset-btn" data-field="${config.field}">Reset</span>`
									: ""
							}
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
						type: chart_obj.type || "donut",
						height: 300,
						colors: chart_obj.colors,
						regionFill: 1,
						onClick: (event) => {
							if (event.label) {
								page.filter_group.set_value(config.field, event.label);
								page.refresh();
							}
						},
					});
				} catch (e) {
					console.error("Error rendering chart " + chart_id, e);
				}
			}, 100);
		});

		// 2.5 Table Section
		let tables_row = $(
			'<div class="charts-row" style="margin-top: 24px; display: block; width: 100%;"></div>',
		).appendTo(page.container);

		// Pre-calculate stable months across all results for consistent columns
		let all_months_map = {};
		let months = [];
		data.results.forEach((row) => {
			let date = row.invoice_date || row.posting_date;
			let month_key = moment(date).format("MMM YYYY");
			let month_sort = moment(date).format("YYYYMM");
			if (!all_months_map[month_key]) {
				all_months_map[month_key] = month_sort;
				months.push({ key: month_key, sort: month_sort });
			}
		});
		months.sort((a, b) => a.sort - b.sort);

		// Render Table Containers
		let card = $(`
            <div class="table-card" style="margin-top: 0; display: flex; flex-direction: column; overflow: visible;">
                <div class="card-header d-flex justify-content-between align-items-center" style="overflow: visible;">
                    <h6 class="m-0 font-weight-bold text-primary">${__("Month-Wise Revenue")}</h6>
                    <div class="d-flex table-filters" style="gap: 10px; overflow: visible;">
                        <div id="filter_customer_link" style="width: 200px;"></div>
                        <div id="filter_sp_link" style="width: 200px;"></div>
                        <div id="filter_product_link" style="width: 200px;"></div>
                    </div>
                </div>
                <div class="table-container" style="max-height: 480px; flex: 1; overflow-y: auto;">
                    <table class="dashboard-table" id="consolidated_table">
                        <thead>
                            <tr>
                                <th style="min-width: 250px;">Customer</th>
                                <th style="min-width: 180px;">Sales Person</th>
                                <th style="min-width: 280px;">Product</th>
                                ${months.map((m) => `<th class="month-col">${m.key}</th>`).join("")}
                                <th class="total-col sticky-total-header">Total</th>
                            </tr>
                        </thead>
                        <tbody id="consolidated_table_body"></tbody>
                    </table>
                </div>
            </div>

            <div class="table-card" style="margin-top: 24px; overflow: hidden;">
                <div class="header" style="border-bottom: 1px solid var(--border-color); padding: 15px 24px;">
                    <span>Sales Invoices</span>
                    <div class="table-actions">
                        <span class="text-muted" id="invoice_count_label" style="font-size: 12px; font-weight: 400; margin-right: 15px;"></span>
                    </div>
                </div>
                <div class="table-container" style="max-height: 500px;">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="min-width: 140px;">Invoice ID</th>
                                <th style="min-width: 110px;">Date</th>
                                <th style="min-width: 100px;">Type</th>
                                <th style="min-width: 120px;">Invoice Type</th>
                                <th style="min-width: 110px;">Status</th>
                                <th style="min-width: 180px;">Customer</th>
                                <th style="min-width: 150px;">Item</th>
                                <th style="min-width: 140px;">Sales Person</th>
                                <th style="text-align: right; min-width: 100px;">Qty</th>
                                <th style="text-align: right; min-width: 160px; border-right: none;">Amount (INR)</th>
                            </tr>
                        </thead>
                        <tbody id="invoice_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_row);

		const render_filtered_view = (results) => {
			let tbody_summary = card.find("#consolidated_table_body");
			let tbody_detail = card.find("#invoice_table_body");
			tbody_summary.empty();
			tbody_detail.empty();

			// 1. Group & Render Summary Table
			let merged_data = {};
			results.forEach((row) => {
				let sp = row.sales_person || "-";
				let cust = row.customer_name || row.customer || "-";
				let prod = row.item_code || "-";
				let prod_name = row.item_name || "";
				let amt = flt(row.base_amount);
				let date = row.invoice_date || row.posting_date;
				let month_key = moment(date).format("MMM YYYY");

				let row_key = sp + "|" + cust + "|" + prod;
				if (!merged_data[row_key]) {
					merged_data[row_key] = { sp, cust, prod, prod_name, months: {}, total: 0 };
				}
				merged_data[row_key].months[month_key] =
					(merged_data[row_key].months[month_key] || 0) + amt;
				merged_data[row_key].total += amt;
			});

			let summary_list = Object.values(merged_data).sort((a, b) => b.total - a.total);
			let total_month_amts = {};
			let grand_total = 0;

			if (summary_list.length === 0) {
				tbody_summary.append(
					`<tr><td colspan="${4 + months.length}" class="text-center text-muted" style="padding: 20px;">No data matching filters</td></tr>`,
				);
			} else {
				summary_list.slice(0, 100).forEach((row) => {
					grand_total += row.total;
					let month_cells = months
						.map((m) => {
							let val = row.months[m.key] || 0;
							total_month_amts[m.key] = (total_month_amts[m.key] || 0) + val;
							return `<td class="month-col">${frappe.format(val, { fieldtype: "Currency", currency: "INR" })}</td>`;
						})
						.join("");

					tbody_summary.append(`
                        <tr>
                            <td><div class="text-truncate" style="max-width: 200px;" title="${row.cust}">${row.cust}</div></td>
                            <td><div class="text-truncate" style="max-width: 150px;" title="${row.sp}">${row.sp}</div></td>
                            <td>
                                <div class="text-truncate" style="max-width: 250px;" title="${row.prod}: ${row.prod_name}">
                                    <span class="text-muted" style="font-size: 10px;">${row.prod}</span><br>${row.prod_name}
                                </div>
                            </td>
                            ${month_cells}
                            <td class="total-col">${frappe.format(row.total, { fieldtype: "Currency", currency: "INR" })}</td>
                        </tr>
                    `);
				});

				let footer_cells = months
					.map(
						(m) =>
							`<td class="month-col" style="font-weight: 700;">${frappe.format(total_month_amts[m.key] || 0, { fieldtype: "Currency", currency: "INR" })}</td>`,
					)
					.join("");
				tbody_summary.append(`
                    <tr class="sticky-total">
                        <td colspan="3" style="text-align: right; font-weight: 700;">Grand Total</td>
                        ${footer_cells}
                        <td class="total-col">${frappe.format(grand_total, { fieldtype: "Currency", currency: "INR" })}</td>
                    </tr>
                `);
			}

			// 2. Render Detail Table
			card.find("#invoice_count_label").text(`Showing ${results.length} records`);
			let total_qty = 0,
				total_amt = 0;

			if (results.length === 0) {
				tbody_detail.append(
					`<tr><td colspan="10" class="text-center text-muted" style="padding: 20px;">No data matching filters</td></tr>`,
				);
			} else {
				results.forEach((row) => {
					total_qty += flt(row.qty);
					total_amt += flt(row.base_amount);

					let status_color = "gray";
					if (["Paid", "Completed"].includes(row.status)) status_color = "green";
					if (["Draft", "To Bill"].includes(row.status)) status_color = "blue";
					if (["Overdue", "Cancelled"].includes(row.status)) status_color = "red";
					if (["Partly Paid", "To Deliver"].includes(row.status))
						status_color = "orange";

					let type_style =
						row.dom_exp === "Domestic"
							? "background: #eef2ff; color: #4338ca; border: 1px solid #c7d2fe;"
							: "background: #fff7ed; color: #c2410c; border: 1px solid #ffedd5;";

					tbody_detail.append(`
                        <tr>
                            <td style="width: 140px;">
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <a href="/app/sales-invoice/${row.invoice_id}" style="color: var(--primary); font-weight: 500;">${row.invoice_id}</a>
                                </div>
                            </td>
                            <td style="width: 110px;">${frappe.datetime.str_to_user(row.invoice_date)}</td>
                            <td style="width: 100px;">
                                <span class="indicator-pill" style="font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 500; ${type_style}">
                                    ${__(row.dom_exp)}
                                </span>
                            </td>
                            <td>${row.invoice_type || ""}</td>
                            <td><span class="indicator-pill ${status_color}">${row.status}</span></td>
                            <td>${row.customer_name}</td>
                            <td><span class="text-muted">${row.item_code}</span></td>
                            <td>${row.sales_person || "-"}</td>
                            <td style="text-align: right;">${frappe.format(row.qty, { fieldtype: "Float" })}</td>
                            <td style="text-align: right; font-weight: 600;">${frappe.format(row.base_amount, { fieldtype: "Currency", currency: "INR" })}</td>
                        </tr>
                    `);
				});

				tbody_detail.append(`
                    <tr class="sticky-total">
                        <td colspan="8" style="text-align: right; font-weight: 700;">Total</td>
                        <td style="text-align: right; font-weight: 700; white-space: nowrap;">${frappe.format(total_qty, { fieldtype: "Float" })}</td>
                        <td style="text-align: right; font-weight: 700; color: var(--primary); white-space: nowrap;">${frappe.format(total_amt, { fieldtype: "Currency", currency: "INR" })}</td>
                    </tr>
                `);
			}
		};

		// 3. Initialize Filters with Hybrid Logic (Type or Select)
		const apply_local_filters = () => {
			const c_val = (f_cust_ctrl.$input ? f_cust_ctrl.$input.val() : "")
				.toLowerCase()
				.trim();
			const s_val = (f_sp_ctrl.$input ? f_sp_ctrl.$input.val() : "").toLowerCase().trim();
			const i_val = (f_item_ctrl.$input ? f_item_ctrl.$input.val() : "")
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

		const make_hybrid_filter = (parent_id, placeholder, options) => {
			let ctrl = frappe.ui.form.make_control({
				parent: card.find("#" + parent_id),
				df: {
					fieldtype: "Autocomplete",
					placeholder: placeholder,
					options: options,
					on_change: () => apply_local_filters(),
				},
				render_input: true,
			});

			if (ctrl.$input) {
				// Capture all possible ways the value can change
				ctrl.$input.on("input change", () => {
					apply_local_filters();
				});

				// Specifically handle selection from the Frappe/Awesomplete dropdown
				ctrl.$input.on("awesomplete-selectcomplete", () => {
					// Small delay to ensure the value is fully committed to the input field
					setTimeout(() => apply_local_filters(), 10);
				});
			}
			return ctrl;
		};

		let f_cust_ctrl = make_hybrid_filter(
			"filter_customer_link",
			__("Filter Customer"),
			[...new Set(data.results.map((r) => r.customer_name || r.customer))].sort(),
		);

		let f_sp_ctrl = make_hybrid_filter(
			"filter_sp_link",
			__("Filter Sales Person"),
			[...new Set(data.results.map((r) => r.sales_person || ""))].filter(Boolean).sort(),
		);

		let f_item_ctrl = make_hybrid_filter(
			"filter_product_link",
			__("Filter Product"),
			[...new Set(data.results.map((r) => r.item_code))].sort(),
		);
		// Initial render
		apply_local_filters();

		// 5. Global Export Logic
		const export_to_excel = async () => {
			const c_val = (f_cust_ctrl.$input ? f_cust_ctrl.$input.val() : "")
				.toLowerCase()
				.trim();
			const s_val = (f_sp_ctrl.$input ? f_sp_ctrl.$input.val() : "").toLowerCase().trim();
			const i_val = (f_item_ctrl.$input ? f_item_ctrl.$input.val() : "")
				.toLowerCase()
				.trim();

			let export_data = data.results.filter((row) => {
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

			if (!export_data.length) {
				frappe.msgprint(__("No data to export"));
				return;
			}

			// Helper: Capture SVG chart as Image (Pseudo-implementation for visual reference)
			const get_chart_image = (selector) => {
				const svg = $(selector).find("svg")[0];
				if (!svg) return "";

				// Return a labeled text placeholder if the browser doesn't support easy SVG->Canvas export in this context
				// But we will try to provide the tables for charts as requested too
				return `<div style="padding: 10px; border: 1px dashed #ccc; text-align: center; background: #fafafa;"><b>Graph View: ${selector.replace("#", "")}</b></div>`;
			};

			let html = `<html><head><meta charset="utf-8"><style>table { border-collapse: collapse; width: 100%; margin-bottom: 20px; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; } th { background: #f4f4f4; }</style></head><body>`;
			html += `<h2>Sales Revenue Dashboard Report</h2>`;
			html += `<p>Date: ${frappe.datetime.now_datetime()}</p>`;

			// I. Metrics
			html += `<h3>Key Performance Indicators</h3><table><tr>`;
			data.summary.forEach((m) => (html += `<th>${m.label}</th>`));
			html += `</tr><tr>`;
			data.summary.forEach((m) => (html += `<td>${m.value}</td>`));
			html += `</tr></table>`;

			// II. Charts Section (Visual Data - Using Tables for Excel Compatibility)
			html += `<h3>Visual Analytics (Chart Data)</h3>`;

			// 1. Salesperson Breakdown
			let sales_person_summary = {};
			if (
				data.charts &&
				data.charts.top_5_salesperson &&
				data.charts.top_5_salesperson.data
			) {
				const d = data.charts.top_5_salesperson.data;
				d.labels.forEach((label, i) => {
					sales_person_summary[label] = d.datasets[0].values[i];
				});
			}

			if (Object.keys(sales_person_summary).length) {
				html += `<h4>Top 5 Salesperson by Revenue</h4><table border="1" style="width: 100%;">
					<tr style="background: #f4f4f4;"><th>Sales Person</th><th>Amount (INR)</th><th style="width: 30%;">Revenue Share</th></tr>`;
				const entries = Object.entries(sales_person_summary)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 5);
				const max_val = entries[0] ? entries[0][1] : 1;
				entries.forEach(([name, val]) => {
					const pct = (val / max_val) * 100;
					html += `<tr><td>${name}</td><td>${frappe.format(val, { fieldtype: "Currency", currency: "INR" })}</td>
						<td style="background: #ffffff;"><div style="background: #3498db; width: ${pct}%; height: 18px; color: #ffffff; font-size: 10px; padding-left: 4px; font-weight: bold;">${Math.round(pct)}%</div></td></tr>`;
				});
				html += `</table><br>`;
			}

			// 2. Customer Breakdown
			let customer_summary = {};
			if (data.charts && data.charts.top_10_customers && data.charts.top_10_customers.data) {
				const d = data.charts.top_10_customers.data;
				d.labels.forEach((label, i) => {
					customer_summary[label] = d.datasets[0].values[i];
				});
			}

			if (Object.keys(customer_summary).length) {
				html += `<h4>Top 10 Customers by Revenue</h4><table border="1" style="width: 100%;">
					<tr style="background: #f4f4f4;"><th>Customer</th><th>Amount (INR)</th><th style="width: 30%;">Revenue Share</th></tr>`;
				const entries = Object.entries(customer_summary)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10);
				const max_val = entries[0] ? entries[0][1] : 1;
				entries.forEach(([name, val]) => {
					const pct = (val / max_val) * 100;
					html += `<tr><td>${name}</td><td>${frappe.format(val, { fieldtype: "Currency", currency: "INR" })}</td>
						<td style="background: #ffffff;"><div style="background: #2ecc71; width: ${pct}%; height: 18px; color: #ffffff; font-size: 10px; padding-left: 4px; font-weight: bold;">${Math.round(pct)}%</div></td></tr>`;
				});
				html += `</table><br>`;
			}

			// 3. Product Breakdown
			let product_summary = {};
			if (data.charts && data.charts.top_10_products && data.charts.top_10_products.data) {
				const d = data.charts.top_10_products.data;
				d.labels.forEach((label, i) => {
					product_summary[label] = d.datasets[0].values[i];
				});
			}

			if (Object.keys(product_summary).length) {
				html += `<h4>Top 10 Products by Revenue</h4><table border="1" style="width: 100%;">
					<tr style="background: #f4f4f4;"><th>Product (Item)</th><th>Amount (INR)</th><th style="width: 30%;">Revenue Share</th></tr>`;
				const entries = Object.entries(product_summary)
					.sort((a, b) => b[1] - a[1])
					.slice(0, 10);
				const max_val = entries[0] ? entries[0][1] : 1;
				entries.forEach(([name, val]) => {
					const pct = (val / max_val) * 100;
					html += `<tr><td>${name}</td><td>${frappe.format(val, { fieldtype: "Currency", currency: "INR" })}</td>
						<td style="background: #ffffff;"><div style="background: #e67e22; width: ${pct}%; height: 18px; color: #ffffff; font-size: 10px; padding-left: 4px; font-weight: bold;">${Math.round(pct)}%</div></td></tr>`;
				});
				html += `</table><br>`;
			}

			// IV. Summarized Revenue
			html += `<h3>Month-Wise Consolidated Revenue</h3><table>`;
			html += card.find("#consolidated_table").html();
			html += `</table>`;

			// V. Detailed Records
			html += `<h3>Detailed Sales Invoices List</h3><table><thead><tr>
				<th>Invoice ID</th><th>Date</th><th>Type</th><th>Invoice Type</th><th>Status</th><th>Customer</th><th>Item</th><th>Sales Person</th><th>Qty</th><th>Amount (INR)</th>
			</tr></thead><tbody>`;
			export_data.forEach((row) => {
				html += `<tr>
					<td>${row.invoice_id}</td>
					<td>${row.invoice_date}</td>
					<td>${row.dom_exp}</td>
					<td>${row.invoice_type || ""}</td>
					<td>${row.status}</td>
					<td>${row.customer_name}</td>
					<td>${row.item_code}</td>
					<td>${row.sales_person || ""}</td>
					<td>${row.qty}</td>
					<td>${row.base_amount}</td>
				</tr>`;
			});
			html += `</tbody></table></body></html>`;

			const blob = new Blob([html], { type: "application/vnd.ms-excel" });
			const url = window.URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = `Sales_Dashboard_Full_Report_${frappe.datetime.now_date()}.xls`;
			link.click();
		};

		// Button Management
		page.clear_inner_toolbar();
		page.clear_menu();
		page.clear_custom_actions();

		// 1. Primary Export Action
		page.set_primary_action(__("Export to Excel"), () => export_to_excel());

		// 2. Secondary Refresh
		page.add_inner_button(__("Refresh"), () => {
			page.refresh();
		});

		// 3. Force-remove default duplicates
		$(".page-head .menu-btn-group").hide();
		$(".page-head .standard-actions .btn-secondary:contains('Refresh')").hide();

		// 4. Remove small local buttons
		$(".chart-card .export-btn, .row-export-btn, #table_export_btn").remove();
	}

	// Trigger initial load automatically
	setTimeout(() => {
		page.refresh();
	}, 100);
};
