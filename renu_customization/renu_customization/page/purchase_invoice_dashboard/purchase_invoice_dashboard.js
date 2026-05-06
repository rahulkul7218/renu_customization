frappe.pages["purchase_invoice_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Purchase Invoice Dashboard"),
		single_column: true,
	});

	page.set_primary_action(__("Refresh"), () => page.refresh());

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
			method: "renu_customization.renu_customization.page.purchase_invoice_dashboard.purchase_invoice_dashboard.get_dashboard_data",
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
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
		},
		{
			fieldname: "supplier",
			label: __("Supplier"),
			fieldtype: "Link",
			placeholder: __("Select Supplier"),
			options: "Supplier",
		},
		{
			fieldname: "item_code",
			label: __("Product"),
			fieldtype: "Link",
			placeholder: __("Select Product"),
			options: "Item",
		},
		{
			fieldname: "supplier_group",
			label: __("Supplier Group"),
			fieldtype: "Link",
			placeholder: __("Select Supplier Group"),
			options: "Supplier Group",
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
					setTimeout(() => page.refresh(), 50);
				});
			}

			if (field.df.fieldtype === "Link") {
				field.on_change = function () {
					page.refresh();
				};
				field.set_input_change && field.set_input_change(() => page.refresh());
			}
		}
	});

	// Global listener for the entire filter area as a final backup
	filter_parent.on("change", "input, select", () => page.refresh());

	filter_parent.addClass("border-bottom");
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        .page-head .title-text, .page-head .breadcrumb-text { color: #1a1a1a !important; font-weight: 700 !important; }
		.page-title { color: #000 !important; }
        .page-head { border-bottom: 1px solid #ddd !important; background: #fff !important; color: #000}
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
			width: calc(25% - 12px) !important;
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
        .dashboard-content { padding: 24px; background: #fff; min-height: 100vh; }
        
        /* KPI Cards Styling */
        .summary-wrapper { 
            display: grid !important; 
            grid-template-columns: repeat(5, 1fr) !important; 
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
            border-left: 5px solid #cbd5e1;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
        }
        .summary-card:hover { 
            transform: translateY(-4px); 
            box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1); 
        }
        
        /* Consistent Border Colors */
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card.cyan { border-left-color: #06b6d4; }
        .summary-card.purple { border-left-color: #8b5cf6; }
        .summary-card.red { border-left-color: #ef4444; }

        .summary-card .label { 
            font-size: 11px; 
            color: #64748b; 
            font-weight: 700; 
            text-transform: uppercase; 
            letter-spacing: 0.05em; 
            margin-bottom: 8px; 
            display: flex; 
            align-items: center; 
            gap: 8px;
        }
        .summary-card .value { 
            font-size: 20px; 
            font-weight: 800; 
            color: #0f172a; 
        }
        .summary-card .indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
        
        .bg-blue { background-color: #3b82f6; }
        .bg-green { background-color: #10b981; }
        .bg-orange { background-color: #f59e0b; }
        .bg-cyan { background-color: #06b6d4; }
        .bg-purple { background-color: #8b5cf6; }
        .bg-red { background-color: #ef4444; }

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

        .indicator-pill { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.blue { background: #dbeafe; color: #1e40af; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        .indicator-pill.orange { background: #ffedd5; color: #9a3412; }
        .indicator-pill.purple { background: #f3e8ff; color: #6b21a8; }
        .indicator-pill.cyan { background: #cffafe; color: #0e7490; }

        /* Monthly Table Styles */
        .month-col { min-width: 140px; width: 140px; white-space: nowrap !important; text-align: right !important; }
        .total-col { min-width: 160px; text-align: right !important; font-weight: 700; color: #000; }
        .dashboard-table th.sticky-total-header { position: sticky; right: 0; background: #f8f9fa; z-index: 5; border-left: 1px solid #ddd; color: #000 !important; }
        .dashboard-table td.sticky-total-cell { position: sticky; right: 0; background: #fff; z-index: 4; border-left: 1px solid #ddd; font-weight: 700; color: #000; }
        .grand-total-row { position: sticky; bottom: 0; z-index: 10 !important; background-color: #f8f9fa !important; font-weight: 700 !important; border-top: 2px solid #ddd; }
        .table-card .header { 
            padding: 15px 24px; background: #fff;
            border-bottom: 1px solid #f1f5f9; font-weight: 700; 
            color: #0f172a; display: flex; justify-content: space-between; align-items: center;
            flex-wrap: nowrap; gap: 16px;
        }
        .grand-total-row td { position: sticky; bottom: 0; background-color: #f8f9fa !important; color: #000 !important; border-top: 2px solid #ddd; z-index: 10; }
        .grand-total-row td.sticky-total-cell { z-index: 11; right: 0; }
        
        .charts-row { display: grid; grid-template-columns: 1fr; gap: 20px; }
        .chart-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 8px; 
            padding: 24px; box-shadow: var(--shadow-sm); min-height: 450px;
            transition: transform 0.2s; width: 100%; margin-bottom: 20px;
        }
        .chart-card:hover { transform: translateY(-2px); }
        .chart-card .title { font-size: 16px; font-weight: 600; color: #000; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; }
        .export-btn { font-size: 11px; cursor: pointer; color: #6c757d; border: 1px solid #ddd; padding: 4px 12px; border-radius: 4px; }
        .export-btn:hover { color: #2b6cb0; background: #ebf8ff; border-color: #bee3f8; }
        .table-card { background: #fff; border: 1px solid var(--border-color); border-radius: 8px; margin-top: 24px; overflow: hidden; }
        .table-card .header { padding: 15px 24px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .table-container { overflow: auto; max-height: 500px; }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .dashboard-table th { background: #f1f3f5; padding: 12px 14px; position: sticky; top: 0; z-index: 5; font-size: 11px; font-weight: 600; border-bottom: 1px solid #dee2e6; }
        .dashboard-table td { padding: 12px 14px; border-top: 1px solid var(--border-color); font-size: 13px; line-height: 1.4; vertical-align: top; }
    </style>`).appendTo(page.main);

	function format_currency_short(num) {
		if (!num && num !== 0) return "₹ 0.0000 M";
		let value = flt(num) / 1000000;
		return (
			"₹ " +
			value.toLocaleString("en-US", { minimumFractionDigits: 4, maximumFractionDigits: 4 }) +
			" M"
		);
	}

	function render_dashboard(data) {
		page.container.empty();
		page.clear_menu();
		page.clear_menu();
		if (!data.results || data.results.length === 0) {
			$(
				'<div class="text-center text-muted" style="padding: 100px 0;">No data found</div>',
			).appendTo(page.container);
			return;
		}

		if (data.summary) {
			let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
			data.summary.forEach((metric) => {
				let indicator = (metric.indicator || "blue").toLowerCase();
				$(`
                    <div class="summary-card ${indicator}">
                        <div class="label"><span class="indicator bg-${indicator}"></span>${metric.label}</div>
                        <div class="value">${format_currency_short(metric.value)}</div>
                    </div>
                `).appendTo(summary_row);
			});
		}

		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		Object.keys(data.charts).forEach((chart_id) => {
			let chart_obj = data.charts[chart_id];
			let wrapper = $(`
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
					legend: 0,
					show_legend: 0,
					legendOptions: { showLegend: false },
					valuesOverPoints: 1,
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
					if (label && label.includes(" - ")) {
						let parts = label.split(" - ");
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

		// 3. Month-Wise Consolidated Table
		let months_map = {};
		let months = [];
		data.results.forEach((row) => {
			let date_obj = new Date(row.invoice_date);
			let m_label =
				date_obj.toLocaleString("default", { month: "short" }) +
				" " +
				date_obj.getFullYear();
			let m_sort = row.invoice_date.split("-")[0] + row.invoice_date.split("-")[1];

			if (!months_map[m_label]) {
				months_map[m_label] = m_sort;
				months.push({ label: m_label, sort: m_sort });
			}
		});
		months.sort((a, b) => a.sort - b.sort);

		let consolidated_data = {};
		data.results.forEach((row) => {
			let date_obj = new Date(row.invoice_date);
			let m_label =
				date_obj.toLocaleString("default", { month: "short" }) +
				" " +
				date_obj.getFullYear();
			let key = `${row.supplier_name}|${row.item_name}`;
			if (!consolidated_data[key]) {
				consolidated_data[key] = {
					supplier: row.supplier_name,
					product: row.item_name,
					item_code: row.item_code,
					months: {},
					total: 0,
				};
			}
			let amt = flt(row.base_amount);
			if (row.is_return) amt = -amt;
			consolidated_data[key].months[m_label] =
				(consolidated_data[key].months[m_label] || 0) + amt;
			consolidated_data[key].total += amt;
		});

		let grand_total_months = {};
		let grand_total_all = 0;
		Object.values(consolidated_data).forEach((row) => {
			months.forEach((m) => {
				grand_total_months[m.label] =
					(grand_total_months[m.label] || 0) + (row.months[m.label] || 0);
			});
			grand_total_all += row.total;
		});

		let month_table_card = $(`
			<div class="table-card" style="margin-bottom: 30px; overflow: visible;">
                <div class="header" style="overflow: visible;">
                    <span style="font-size: 15px;">Month-Wise Consolidated Purchase</span>
                    <div class="table-actions" style="overflow: visible;">
                        <div class="d-flex" style="gap: 8px;">
                            <span class="export-btn" id="export_month_table" data-export-type="summary">
                                <i class="fa fa-file-excel-o"></i> Export to Excel
                            </span>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">S.No.</th>
                                <th style="min-width: 220px;">Supplier</th>
                                <th style="min-width: 250px;">Product</th>
                                ${months.map((m) => `<th class="month-col">${m.label}</th>`).join("")}
                                <th class="total-col sticky-total-header">Total (M)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${Object.values(consolidated_data)
								.sort((a, b) => b.total - a.total)
								.map(
									(row, idx) => `
                                <tr>
                                    <td style="text-align: center;">${idx + 1}</td>
                                    <td>${row.supplier}</td>
                                    <td><span class="text-muted">${row.item_code}</span><br>${row.product}</td>
                                    ${months
										.map((m) => {
											let val = row.months[m.label] || 0;
											return `<td class="month-col">${format_currency_short(val)}</td>`;
										})
										.join("")}
                                    <td class="total-col sticky-total-cell">${format_currency_short(row.total)}</td>
                                </tr>
                            `,
								)
								.join("")}
                        </tbody>
                        <tfoot>
                            <tr class="grand-total-row">
                                <td colspan="3" style="text-align: right; padding-right: 20px;">Grand Total</td>
                                ${months
									.map((m) => {
										let val = grand_total_months[m.label] || 0;
										return `<td class="month-col">${format_currency_short(val)}</td>`;
									})
									.join("")}
                                <td class="total-col sticky-total-cell">${format_currency_short(grand_total_all)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		// 4. Detailed Invoice List
		let table_card = $(`
            <div class="table-card" style="overflow: visible;">
                <div class="header" style="overflow: visible;">
                    <span style="font-size: 15px;">Purchase Invoices List</span>
                    <div class="table-actions" style="overflow: visible;">
                        <span id="invoice_count_label" style="font-size: 12px; color: #64748b; font-weight: 500; margin-right: 12px;"></span>
                        <div class="d-flex" style="gap: 8px;">
                            <span class="export-btn" id="main_excel_export" data-export-type="detail">
                                <i class="fa fa-file-excel-o"></i>Export to Excel
                            </span>
                        </div>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">S.No.</th>
                                <th style="min-width: 150px;">Invoice ID</th>
                                <th style="min-width: 110px;">Date</th>
                                <th style="min-width: 110px;">Status</th>
                                <th style="min-width: 220px;">Supplier</th>
                                <th style="min-width: 300px;">Item</th>
                                <th style="width: 80px; text-align: right;">Qty</th>
                                <th style="min-width: 150px; text-align: right;">Amount (M)</th>
                            </tr>
                        </thead>
                        <tbody id="invoice_table_body"></tbody>
                        <tfoot id="invoice_table_foot"></tfoot>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let total_qty = 0;
		let total_amt_detailed = 0;

		let tbody = table_card.find("#invoice_table_body");
		data.results.forEach((row, idx) => {
			let status_color =
				row.status === "Completed" ? "green" : row.status === "Cancelled" ? "red" : "blue";
			let amt = flt(row.base_amount);
			if (row.is_return) amt = -amt;

			total_qty += flt(row.qty);
			total_amt_detailed += amt;

			tbody.append(`
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td><a href="/app/purchase-invoice/${row.invoice_id}">${row.invoice_id}</a></td>
                    <td>${frappe.datetime.str_to_user(row.invoice_date)}</td>
                    <td><span class="indicator-pill ${status_color}">${row.status}</span></td>
                    <td>${row.supplier_name}</td>
                    <td><span class="text-muted">${row.item_code}</span><br>${row.item_name}</td>
                    <td style="text-align: right;">${flt(row.qty)}</td>
                    <td style="text-align: right; font-weight: 600;">${format_currency_short(amt)}</td>
                </tr>
            `);
		});

		table_card.find("#invoice_table_foot").append(`
                        <tr class="grand-total-row">
                <td colspan="6" style="text-align: right; padding-right: 20px;">Total</td>
                <td style="text-align: right; font-weight: 700;">${flt(total_qty)}</td>
                <td style="text-align: right; font-weight: 700;">${format_currency_short(total_amt_detailed)}</td>
            </tr>
        `);

		const export_to_excel = (export_type = "all") => {
			frappe.call({
				method: "renu_customization.renu_customization.page.purchase_invoice_dashboard.purchase_invoice_dashboard.export_to_excel",
				args: {
					filters: page.filter_group.get_values(),
					export_type: export_type,
				},
				callback: function (r) {
					if (r.message) {
						const { filename, filecontent } = r.message;
						const byteCharacters = atob(filecontent);
						const byteNumbers = new Array(byteCharacters.length);
						for (let i = 0; i < byteCharacters.length; i++) {
							byteNumbers[i] = byteCharacters.charCodeAt(i);
						}
						const byteArray = new Uint8Array(byteNumbers);
						const blob = new Blob([byteArray], {
							type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
						});
						const link = document.createElement("a");
						link.href = window.URL.createObjectURL(blob);
						link.download = filename;
						link.click();
					}
				},
			});
		};

		const export_pdf = async () => {
			const report_date = frappe.datetime.now_datetime();
			const filters = page.filter_group.get_values();
			let period = "Custom Period";
			if (filters.fiscal_year) period = filters.fiscal_year;
			if (filters.from_date && filters.to_date)
				period = `${filters.from_date} to ${filters.to_date}`;

			const get_chart_png = (id) => {
				const svg_el = document.querySelector(`#wrapper_${id} svg`);
				if (!svg_el) return null;
				const clone = svg_el.cloneNode(true);
				const internal_legend = clone.querySelector(
					".chart-legend, .legend, .frappe-chart-legend",
				);
				if (internal_legend) internal_legend.style.display = "none";
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
					img.src =
						"data:image/svg+xml;base64," +
						btoa(unescape(encodeURIComponent(svg_data)));
				});
			};

			const [png1, png2] = await Promise.all([
				get_chart_png("top_10_suppliers"),
				get_chart_png("top_10_products"),
			]);

			const chart_h = (src, title) =>
				src
					? `<div style="margin-top:20px; text-align:center;"><h4 style="color:#444; margin-bottom: 15px; padding-bottom: 5px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">${title}</h4><img src="${src}" style="width:100%; max-width:900px; border:1px solid #f1f5f9; border-radius:12px; padding: 15px; background: #fff;"></div>`
					: "";

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
					if (l && l.includes(" - ")) {
						let parts = l.split(" - ");
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
				legend_html += "</div>";
				return legend_html;
			};

			const chart_t = (chart_id, title) => {
				const c_obj = data.charts[chart_id];
				if (!c_obj || !c_obj.data.labels.length) return "";
				const total_val = c_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;
				let rows = c_obj.data.labels
					.map((l, i) => {
						const val = c_obj.data.datasets[0].values[i];
						const share = ((val / total_val) * 100).toFixed(1);
						let display_label = l;
						if (l && l.includes(" - ")) {
							let parts = l.split(" - ");
							if (parts[0] === parts[1]) display_label = parts[0];
						}
						return `<tr><td style="text-align:center;">${i + 1}</td><td>${display_label}</td><td style="text-align:right;">${format_currency_short(val)}</td><td style="text-align:right;">${share}%</td></tr>`;
					})
					.join("");
				return `<div style="margin-top:10px; page-break-inside: avoid;"><table style="width:80%; margin: 10px auto; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;"><thead><tr style="background: #f8f9fa;"><th style="width: 40px; text-align:center; border-bottom:2px solid #3b82f6;">S.No.</th><th style="text-align:left; border-bottom:2px solid #3b82f6;">${title}</th><th style="width: 120px; text-align:right; border-bottom:2px solid #3b82f6;">Value (M)</th><th style="width: 80px; text-align:right; border-bottom:2px solid #3b82f6;">Share %</th></tr></thead><tbody>${rows}</tbody></table></div>`;
			};

			const html = `
				<html>
				<head>
					<style>
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 0; margin: 0; color: #1e293b; background: #fff; line-height: 1.2; }
                        @page { size: landscape; margin: 10mm; }
                        .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
                        
                        .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 20px; table-layout: fixed; }
                        .kpi-card { display: table-cell; border: 1px solid #e2e8f0; padding: 12px; border-radius: 10px; background: #f8fafc; text-align: center; vertical-align: top; }
                        .kpi-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
                        .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
                        .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
                        
                        h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 25px; border-left: 4px solid #3b82f6; padding-left: 12px; text-transform: uppercase; letter-spacing: 0.025em; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px; border: 1px solid #e2e8f0; table-layout: auto; page-break-inside: auto !important; }
                        tr { page-break-inside: auto !important; page-break-after: auto !important; }
                        td, th { page-break-inside: avoid !important; }
                        th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; word-wrap: break-word; }
                        thead { display: table-header-group; }
                        tfoot { display: table-row-group; }
                        th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #3b82f6; }
                        
                        .text-right { text-align: right; }
                        .text-center { text-align: center; }
                        .font-weight-bold { font-weight: 700; }
                        .page-break { page-break-after: always; }

                        /* Column Widths */
                        .col-sno { width: 40px; text-align: center; }
                        .col-customer, .col-supplier { width: 180px; }
                        .col-sp { width: 120px; }
                        .col-prod { width: 150px; }
                        .col-amt, .col-qty, .col-rate { width: 90px; text-align: right; }
                        .total-net-col, .grand-total-col { width: 100px; text-align: right; font-weight: 700; }

                        .pdf-legend { display: block; margin-top: 15px; text-align: left; padding: 15px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0; }
                        .pdf-legend-item { display: inline-block; width: 31%; margin-bottom: 12px; vertical-align: top; margin-right: 2%; }
                        .pdf-dot { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 8px; vertical-align: middle; }
                        .pdf-legend-info { display: inline-block; vertical-align: middle; width: calc(100% - 25px); }
                        .pdf-legend-label { font-size: 11px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                        .pdf-legend-val { font-size: 9px; color: #64748b; }
					</style>
				</head>
				<body>
					<div class="report-header">
						<h1 style="margin:0; font-size: 24px;">Purchase Invoice Dashboard</h1>
						<p style="font-size: 14px; color: #555; margin: 8px 0;">${period}</p>
						<p style="font-size: 11px; color: #999; margin: 0;">Generated: ${report_date}</p>
					</div>
					<div class="kpi-wrapper">
						${data.summary
							.map((m) => {
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
						`;
							})
							.join("")}
					</div>
					<h3>Visual Analytics</h3>
					${chart_h(png1, "Top Suppliers by Value")}
                    ${chart_l("top_10_suppliers")}
					${chart_t("top_10_suppliers", "Top Suppliers Data")}
                    <div class="page-break"></div>
					${chart_h(png2, "Top Products by Value")}
                    ${chart_l("top_10_products")}
					${chart_t("top_10_products", "Top Products Data")}
					<div class="page-break"></div>
					<h3>Month-Wise Purchase Breakdown (M)</h3>
					<table>
						${month_table_card.find("table").html()}
					</table>
                    <div class="page-break"></div>
					<h3>Detailed Purchase Invoices List (M)</h3>
					<table>
						${table_card.find("table:last").html()}
					</table>
				</body>
				</html>
			`;

			const method_url =
				"/api/method/renu_customization.renu_customization.page.purchase_invoice_dashboard.purchase_invoice_dashboard.export_to_pdf";
			const $form =
				$(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
                <input type="hidden" name="html" value="">
                <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
            </form>`).appendTo("body");
			$form.find('input[name="html"]').val(html);
			$form.submit();
			$form.remove();
		};

		$("#main_excel_export, #export_month_table").on("click", function () {
			const type = $(this).attr("data-export-type") || "all";
			export_to_excel(type);
		});
		$("#pdf_month_table, #pdf_invoice_table").on("click", () => export_pdf());

		page.add_menu_item(__("Export to Excel"), () => export_to_excel());
		page.add_menu_item(__("Export to PDF"), () => export_pdf());
	}

	setTimeout(() => page.refresh(), 100);
};
