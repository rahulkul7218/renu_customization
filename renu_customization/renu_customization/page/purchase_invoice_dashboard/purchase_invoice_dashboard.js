frappe.pages["purchase_invoice_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Purchase Invoice Dashboard (Million INR)"),
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
		{ fieldtype: "Column Break" },
		{
			fieldname: "date_range",
			label: __("Date Range"),
			fieldtype: "DateRange",
			placeholder: [__("Start Date"), __("End Date")],
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "supplier",
			label: __("Supplier"),
			fieldtype: "Link",
			placeholder: __("Select Supplier"),
			options: "Supplier",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "item_code",
			label: __("Product"),
			fieldtype: "Link",
			placeholder: __("Select Product"),
			options: "Item",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "supplier_group",
			label: __("Supplier Group"),
			fieldtype: "Link",
			placeholder: __("Select Supplier Group"),
			options: "Supplier Group",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "status",
			label: __("Status"),
			fieldtype: "MultiSelect",
			placeholder: __("Select Status"),
			options: ["Draft", "To Pay", "Completed", "Cancelled"],
		},
		{ fieldtype: "Column Break" },
		{ fieldtype: "Column Break" },
		{ fieldtype: "Column Break" },
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
            // padding: 20px 25px 5px 25px !important;
            background-color: #fff !important;
            border-bottom: 1px solid #ddd !important;
        }
        .dashboard-filter-area .section-body {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            // gap: 20px !important;
            align-items: end !important;
        }
        .dashboard-filter-area .section-body .form-column {
            width: 180px !important;
            padding: 0 !important;
            margin: 5px !important;
            flex: none !important;
            min-width: 0 !important;
        }
        .dashboard-filter-area .frappe-control {
            margin-bottom: 5px !important;
			width: 180px !important;
        }
        .dashboard-filter-area .control-label {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #555 !important;
            margin-bottom: 6px !important;
            white-space: nowrap !important;
        }
        .dashboard-content { padding: 25px; background: #fff; min-height: 100vh; }
        .summary-wrapper { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 30px; }
        .summary-card { 
            background: #fff; border: 1px solid var(--border-color); border-radius: 12px; 
            padding: 20px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .summary-card:hover { transform: translateY(-3px); box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
        .summary-card .label { font-size: 13px; color: var(--text-muted); font-weight: 500; margin-bottom: 12px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 24px; font-weight: 700; color: #000; }
        .summary-card .indicator { display: inline-block; width: 10px; height: 10px; border-radius: 50%; }

        /* Monthly Table Styles */
        .month-col { min-width: 140px; text-align: right !important; white-space: nowrap; }
        .total-col { min-width: 160px; text-align: right !important; font-weight: 700; color: #000; white-space: nowrap; }
        .dashboard-table th.sticky-total-header { position: sticky; right: 0; background: #f8f9fa; z-index: 5; border-left: 1px solid #ddd; color: #000 !important; }
        .dashboard-table td.sticky-total-cell { position: sticky; right: 0; background: #fff; z-index: 4; border-left: 1px solid #ddd; font-weight: 700; color: #000; }
        .grand-total-row { position: sticky; bottom: 0; z-index: 10 !important; background-color: #f8f9fa !important; font-weight: 700 !important; border-top: 2px solid #ddd; }
        .grand-total-row td { position: sticky; bottom: 0; background-color: #f8f9fa !important; color: #000 !important; border-top: 2px solid #ddd; z-index: 10; }
        .grand-total-row td.sticky-total-cell { z-index: 11; right: 0; }
        
        .bg-blue { background-color: #3498db; }
        .bg-green { background-color: #2ecc71; }
        .bg-orange { background-color: #e67e22; }
        .bg-cyan { background-color: #1abc9c; }
        .bg-purple { background-color: #9b59b6; }
        .bg-red { background-color: #e74c3c; }

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
        .dashboard-table td { padding: 12px 14px; border-top: 1px solid var(--border-color); font-size: 13px; }
        .indicator-pill { padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 500; }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.blue { background: #dbeafe; color: #1e40af; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        .indicator-pill.orange { background: #ffedd5; color: #9a3412; }
        .indicator-pill.purple { background: #f3e8ff; color: #6b21a8; }
        .indicator-pill.cyan { background: #cffafe; color: #0e7490; }
    </style>`).appendTo(page.main);

	function format_currency_short(num) {
		if (!num && num !== 0) return "₹ 0.00 M";
		let value = flt(num) / 1000000;
		return (
			"₹ " +
			value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) +
			" M"
		);
	}

	function render_dashboard(data) {
		page.container.empty();
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
				$(`
                    <div class="summary-card">
                        <div class="label"><span class="indicator bg-${metric.indicator}"></span>${metric.label}</div>
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
                    <div id="wrapper_${chart_id}" style="min-height: 300px;"></div>
                </div>
            `).appendTo(charts_row);

			setTimeout(() => {
				new frappe.Chart(`#wrapper_${chart_id}`, {
					data: chart_obj.data,
					type: "donut",
					height: 300,
					colors: chart_obj.colors,
					tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
				});
			}, 100);
		});

		// 3. Month-Wise Consolidated Table
		let months_map = {};
		let months = [];
		data.results.forEach((row) => {
            let date_obj = new Date(row.invoice_date);
            let m_label = date_obj.toLocaleString('default', { month: 'short' }) + " " + date_obj.getFullYear();
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
            let m_label = date_obj.toLocaleString('default', { month: 'short' }) + " " + date_obj.getFullYear();
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
			consolidated_data[key].months[m_label] = (consolidated_data[key].months[m_label] || 0) + amt;
			consolidated_data[key].total += amt;
		});

		let grand_total_months = {};
		let grand_total_all = 0;
		Object.values(consolidated_data).forEach((row) => {
			months.forEach((m) => {
				grand_total_months[m.label] = (grand_total_months[m.label] || 0) + (row.months[m.label] || 0);
			});
			grand_total_all += row.total;
		});

		let month_table_card = $(`
            <div class="table-card" style="margin-bottom: 30px;">
                <div class="header">
                    <span style="font-weight: 600;">Month-Wise Consolidated Purchase</span>
                    <span class="export-btn" id="export_month_table">Export to Excel</span>
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
            <div class="table-card">
                <div class="header">
                    <span style="font-weight: 600;">Purchase Invoices List</span>
                    <span class="export-btn" id="main_excel_export">Export to Excel</span>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">S.No.</th>
                                <th style="min-width: 150px; white-space: nowrap;">Invoice ID</th>
                                <th style="min-width: 110px; white-space: nowrap;">Date</th>
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

		$("#main_excel_export, #export_month_table").on("click", () => export_to_excel());

		page.add_menu_item(__("Export to Excel"), () => export_to_excel());

		page.add_menu_item(__("Export to PDF"), async () => {
			const report_date = frappe.datetime.now_datetime();
			const period = page.filter_group.get_values().date_range
				? page.filter_group.get_values().date_range.join(" to ")
				: "All Time";

			// Robust SVG to PNG Converter (Preserves Aspect Ratio)
			const get_chart_png = (chart_id) => {
				return new Promise((resolve) => {
					const svg_el = document.querySelector(`#wrapper_${chart_id} svg`);
					if (!svg_el) return resolve("");

					try {
						const bbox = svg_el.getBoundingClientRect();
						const width = bbox.width || 800;
						const height = bbox.height || 450;

						const svg_data = new XMLSerializer().serializeToString(svg_el);
						const canvas = document.createElement("canvas");
						const ctx = canvas.getContext("2d");
						const img = new Image();

						img.onload = () => {
							canvas.width = width * 2;
							canvas.height = height * 2;
							ctx.fillStyle = "#ffffff";
							ctx.fillRect(0, 0, canvas.width, canvas.height);
							ctx.drawImage(img, 0, 0, width * 2, height * 2);
							resolve(canvas.toDataURL("image/png"));
						};

						img.onerror = () => resolve("");
						img.src =
							"data:image/svg+xml;base64," +
							btoa(unescape(encodeURIComponent(svg_data)));
					} catch (e) {
						resolve("");
					}
				});
			};

			// Wait for all charts to be converted to PNG
			frappe.show_alert({ message: __("Preparing charts for PDF..."), indicator: "blue" });
			const [png1, png2] = await Promise.all([
				get_chart_png("top_10_suppliers"),
				get_chart_png("top_10_products"),
			]);

			const chart_h = (png, title) => {
				if (!png) return "";
				return `
                    <div style="text-align: center; margin-bottom: 20px; page-break-inside: avoid;">
                        <h4 style="margin-bottom: 10px; font-size: 16px; color: #000; text-transform: uppercase;">${title}</h4>
                        <img src="${png}" style="width: 850px; height: auto; max-width: 100%; border:none; display: block; margin: 0 auto;">
                    </div>
                `;
			};

			const chart_t = (chart_key, title) => {
				const chart = data.charts[chart_key];
				if (!chart || !chart.data.labels.length) return "";
				const total_val = data.summary[0].value || 1;
				return `
                    <div style="page-break-inside: avoid; margin-bottom: 40px;">
                        <h4 style="margin-bottom: 10px; color: #333;">${title} Data</h4>
                        <table>
                            <thead>
                                <tr>
                                    <th style="width: 35px; text-align: center;">S.No.</th>
                                    <th>Name</th>
                                    <th style="width: 100px; text-align: right;">Amount (M)</th>
                                    <th style="width: 60px; text-align: right;">Share %</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${chart.data.labels
									.map((l, i) => {
										const val = chart.data.datasets[0].values[i];
										const share = ((val / total_val) * 100).toFixed(1);
										return `<tr><td style="text-align: center;">${i + 1}</td><td>${l}</td><td style="text-align: right;">${format_currency_short(val)}</td><td style="text-align: right;">${share}%</td></tr>`;
									})
									.join("")}
                            </tbody>
                        </table>
                    </div>
                `;
			};

			let html = `
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: sans-serif; padding: 20px; color: #333; margin: 0; background-color: #ffffff !important; }
                        .report-header { text-align: center; margin-bottom: 30px; border-bottom: 2pt solid #000; padding-bottom: 12px; }
                        .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 12px; margin-bottom: 30px; }
                        .kpi-card { 
                            display: table-cell; padding: 18px; background: #ffffff; 
                            border: 1px solid #e2e8f0; border-radius: 12px; width: 25%; 
                            vertical-align: top; box-shadow: 0 1px 3px rgba(0,0,0,0.05);
                        }
                        .kpi-label { font-size: 10px; color: #64748b; text-transform: uppercase; margin-bottom: 8px; font-weight: 700; letter-spacing: 0.5px; }
                        .kpi-value { font-size: 16px; font-weight: 800; color: #1e293b; }
                        .kpi-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
                        h3 { margin-top: 30px; border-bottom: 1pt solid #000; padding-bottom: 6px; color: #000; font-size: 16px; page-break-after: avoid; }
                        h4 { margin: 15px 0 10px 0; color: #444; font-size: 13px; border-bottom: 0.5pt solid #eee; }
                        table { width: 100%; border-collapse: collapse; margin-bottom: 25px; table-layout: auto; border: 0.5pt solid #000; }
                        th, td { border: 0.5pt solid #000; padding: 6px 8px; text-align: left; font-size: 8pt; line-height: 1.2; word-wrap: break-word; overflow-wrap: break-word; white-space: normal !important; vertical-align: top; }
                        th { background-color: #f8f9fa; font-weight: bold; text-transform: uppercase; color: #475569; }
                        tr { page-break-inside: avoid !important; }
                        .sticky-total-header, .sticky-total-cell { position: static !important; background: #fff !important; }
                        .indicator-pill { padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: 600; white-space: nowrap !important; }
                        .indicator-pill.green { background: #dcfce7; color: #166534; }
                        .indicator-pill.blue { background: #dbeafe; color: #1e40af; }
                        .indicator-pill.orange { background: #fef3c7; color: #92400e; }
                        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
                        .month-col { text-align: right; }
                        .page-break { page-break-after: always; }
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
								return `
                            <div class="kpi-card">
                                <div class="kpi-label"><span class="kpi-dot" style="background: ${color};"></span>${m.label}</div>
                                <div class="kpi-value">${format_currency_short(m.value)}</div>
                            </div>
                        `;
							})
							.join("")}
                    </div>
    
                    <h3>Visual Analytics Breakdown</h3>
                    <div style="text-align: center;">
                        ${chart_h(png1, "Top 10 Suppliers by Value")}
                        ${chart_t("top_10_suppliers", "Top 10 Suppliers")}
                        ${chart_h(png2, "Top 10 Products by Value")}
                        ${chart_t("top_10_products", "Top 10 Products")}
                    </div>
    
                    <div class="page-break"></div>
    
                    <h3>Month-Wise Purchase Breakdown (M)</h3>
                    <table>
                        ${month_table_card.find("table").html()}
                    </table>
    
                    <h3>Detailed Purchase Invoices List (M)</h3>
                    <table class="invoice-list-table">
                        <thead>${table_card.find("table thead").html()}</thead>
                        <tbody>${table_card.find("table tbody").html()}</tbody>
                        <tfoot>${table_card.find("table tfoot").html()}</tfoot>
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
		});
	}

	setTimeout(() => page.refresh(), 100);
};
