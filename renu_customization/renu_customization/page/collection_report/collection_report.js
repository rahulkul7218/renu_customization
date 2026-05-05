/* Collection Report Dashboard - Version 3.3 */
frappe.pages["collection_report"].on_page_load = function (wrapper) {
	console.log("Collection Report Dashboard - Version 3.3 (Full PDF Sync)");
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Collection Report"),
		single_column: true,
	});

	// Define Export Functions
	const export_to_excel = (export_type = "all") => {
		const filters = page.filter_group.get_values();
		frappe.show_alert({ message: __("Generating Excel Report..."), indicator: "blue" });

		frappe.call({
			method: "renu_customization.renu_customization.page.collection_report.collection_report.export_to_excel",
			args: { filters: filters, export_type: export_type },
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
					frappe.show_alert({
						message: __("Excel Report Downloaded"),
						indicator: "green",
					});
				}
			},
		});
	};

	const export_pdf = async () => {
		if (!page.dashboard_data) return;

		const report_date = moment().format("YYYY-MM-DD HH:mm");
		const filters = page.filter_group.get_values();
		let period = "Custom Period";
		if (filters.from_date && filters.to_date)
			period = `${filters.from_date} to ${filters.to_date}`;

		const get_chart_png = () => {
			const svg = document.querySelector(`#chart_wrapper svg`);
			if (!svg) return null;
			const canvas = document.createElement("canvas");
			const context = canvas.getContext("2d");
			const svg_data = new XMLSerializer().serializeToString(svg);
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
					"data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg_data)));
			});
		};

		const chart_png = await get_chart_png();
		const data = page.dashboard_data;
		const total_val = data.chart.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;

		// Generate Legend Box HTML for PDF
		const legend_box_html = data.chart.data.labels
			.map((label, i) => {
				const val = data.chart.data.datasets[0].values[i];
				const color = data.chart.colors[i % data.chart.colors.length];
				const share = ((val / total_val) * 100).toFixed(1) + "%";
				return `
                <div style="display: inline-block; width: 45%; margin: 5px 2%; vertical-align: top; text-align: left;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${color}; margin-right: 8px;"></span>
                    <div style="display: inline-block; vertical-align: top;">
                        <div style="font-size: 11px; font-weight: 600; color: #475569;">${label}</div>
                        <div style="font-size: 10px; color: #94a3b8;">${format_currency_short(val)} (${share})</div>
                    </div>
                </div>
            `;
			})
			.join("");

		let html = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 0; margin: 0; color: #1e293b; background: #fff; }
                    @page { size: landscape; margin: 10mm; }
                    .header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 25px; }
                    .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 25px; table-layout: fixed; }
                    .kpi-card { display: table-cell; border: 1px solid #e2e8f0; padding: 12px; border-radius: 8px; text-align: center; background: #f8fafc; vertical-align: top; }
                    .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
                    .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; }
                    .chart-container { text-align: center; margin-bottom: 30px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; background: #fff; page-break-inside: avoid; }
                    .chart-img { max-width: 450px; height: auto; margin-bottom: 15px; }
                    
                    .pdf-legend-box { background: #fafafa; border-radius: 8px; padding: 12px; border: 1px solid #f1f5f9; margin-top: 15px; text-align: left; }
                    
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 10px; page-break-inside: auto !important; table-layout: auto; }
                    tr { page-break-inside: avoid !important; page-break-after: auto !important; }
                    th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; vertical-align: top; word-wrap: break-word; }
                    thead { display: table-header-group; }
                    th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-weight: 700; border-bottom: 2px solid #3b82f6; }
                    .analytics-table { border: 1px solid #e2e8f0; }

                    /* Column Widths */
                    .col-sno { width: 40px; text-align: center; }
                    .col-customer, .col-supplier { width: 180px; }
                    .col-sp { width: 120px; }
                    .col-prod { width: 150px; }
                    .col-amt, .col-qty, .col-rate { width: 90px; text-align: right; }
                    .total-net-col, .grand-total-col { width: 100px; text-align: right; font-weight: 700; }
                    .export-btn { font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; white-space: nowrap; }
        .export-btn:hover { color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; }

                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin:0;">Collection Report</h1>
                    <p style="color:#555;">${period}</p>
                    <p style="font-size:10px; color:#999;">Generated: ${report_date}</p>
                </div>
                <div class="kpi-wrapper">
                    ${data.summary
						.map(
							(m) => `
                        <div class="kpi-card">
                            <div class="kpi-label">${m.label}</div>
                            <div class="kpi-value">${format_currency_short(m.value)}</div>
                        </div>
                    `,
						)
						.join("")}
                </div>
                
                <div class="chart-container">
                    <h3 style="color:#334155; text-transform:uppercase; font-size:14px; margin-top:0;">${data.chart.title}</h3>
                    <img src="${chart_png}" class="chart-img">
                    
                    <div class="pdf-legend-box">
                        ${legend_box_html}
                    </div>

                    <table class="analytics-table">
                        <thead>
                            <tr>
                                <th style="width: 40px;">S.No.</th>
                                <th>COLLECTION TYPE DATA</th>
                                <th style="text-align:right;">VALUE</th>
                                <th style="text-align:right;">SHARE %</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.chart.data.labels
								.map((label, i) => {
									const val = data.chart.data.datasets[0].values[i];
									return `<tr>
                                    <td>${i + 1}</td>
                                    <td style="font-weight:bold;">${label.toUpperCase()}</td>
                                    <td style="text-align:right; font-weight:bold;">${format_currency_short(val)}</td>
                                    <td style="text-align:right;">${((val / total_val) * 100).toFixed(1)}%</td>
                                </tr>`;
								})
								.join("")}
                        </tbody>
                        <tfoot>
                            <tr style="background: #f8fafc; font-weight: 800;">
                                <td colspan="2" style="text-align:right;">TOTAL</td>
                                <td style="text-align:right;">${format_currency_short(total_val)}</td>
                                <td style="text-align:right;">100.0%</td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                <div style="page-break-before: always;"></div>
                <h3 style="color:#334155; text-transform:uppercase; font-size:14px;">Detailed Collection List</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Item</th>
                            <th>Sales Person</th>
                            <th style="text-align:right;">Amount</th>
                            <th>Type</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.results
							.map(
								(row) => `
                            <tr>
                                <td>${row.name}</td>
                                <td>${frappe.datetime.str_to_user(row.posting_date)}</td>
                                <td>${row.customer}</td>
                                <td>
                                    <div style="font-size: 8px; color: #64748b;">${row.item_code || "-"}</div>
                                    <div style="font-weight: 700; color: #1e293b;">${row.item_name || "-"}</div>
                                </td>
                                <td>${row.sales_person || "-"}</td>
                                <td style="text-align:right;">${format_currency_short(row.allocated_amount)}</td>
                                <td>${row.is_export ? "Export" : "Domestic"}</td>
                            </tr>
                        `,
							)
							.join("")}
                    </tbody>
                    <tfoot>
                        <tr style="background: #f8fafc; font-weight: 800;">
                            <td colspan="5" style="text-align:right;">GRAND TOTAL</td>
                            <td style="text-align:right;">${format_currency_short(data.results.reduce((sum, row) => sum + flt(row.allocated_amount), 0))}</td>
                            <td></td>
                        </tr>
                    </tfoot>
                </table>
            </body>
            </html>
        `;

		const method_url =
			"/api/method/renu_customization.renu_customization.page.collection_report.collection_report.export_to_pdf";
		const $form =
			$(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
            <input type="hidden" name="html" value="">
            <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
        </form>`).appendTo("body");

		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();
	};

	page.set_primary_action(__("Refresh"), () => page.refresh());
	page.add_menu_item(__("Export to PDF"), () => export_pdf());
	page.add_menu_item(__("Export to Excel"), () => export_to_excel("all"));

	let filter_parent = $(
		'<div class="dashboard-filter-area border-bottom" style="background: transparent; padding: 0;"></div>',
	).prependTo(page.main);
	const filter_fields = [
		{
			fieldname: "fiscal_year",
			label: __("Fiscal Year"),
			fieldtype: "Link",
			options: "Fiscal Year",
			placeholder: __("Select Year"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			placeholder: __("Start Date"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			placeholder: __("End Date"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
			placeholder: __("Select Customer"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "sales_person",
			label: __("Sales Person"),
			fieldtype: "Link",
			options: "Sales Person",
			placeholder: __("Select Sales Person"),
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "dom_exp",
			label: __("Type"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"],
			placeholder: __("Select Type"),
		},
	];

	page.filter_group = new frappe.ui.FieldGroup({ parent: filter_parent, fields: filter_fields });
	page.filter_group.make();

	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		field.on_change = () => page.refresh();
		if (field.$input) {
			field.$input.on("change input blur", () => {
				setTimeout(() => page.refresh(), 50);
			});
		}
	});

	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .layout-main-section { background-color: transparent !important; }
        .page-container { background-color: transparent !important; }
        .dashboard-content { padding: 20px; background: transparent !important; min-height: 100vh; font-family: 'Inter', sans-serif; color: #1e293b; width: 100% !important; }
        .summary-wrapper { 
            display: grid !important; 
            grid-template-columns: repeat(3, 1fr) !important; 
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
        .charts-row { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px; width: 100%; }
        .chart-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .chart-card .title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
        .custom-legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 30px; padding: 20px; border-top: 1px solid #f1f5f9; background: #fafafa; border-radius: 8px; }
        .legend-item { display: flex; align-items: flex-start; gap: 12px; }
        .legend-item .dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; margin-top: 2px; }
        .legend-item .info { display: flex; flex-direction: column; line-height: 1.2; }
        .legend-item .label { font-size: 11px; font-weight: 600; color: #475569; }
        .legend-item .val-pct { font-size: 10px !important; color: #94a3b8 !important; font-weight: 500 !important; }
        .analytics-table-wrapper { margin-top: 30px; overflow: hidden; border: 1px solid #f1f5f9; border-radius: 8px; }
        .analytics-table { width: 100%; border-collapse: collapse; }
        .analytics-table th { background: #f8fafc; padding: 10px 15px; text-align: left; font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; border-bottom: 1px solid #f1f5f9; }
        .analytics-table td { padding: 10px 15px; border-bottom: 1px solid #f1f5f9; font-size: 12px; color: #1e293b; }
        .analytics-table tr:last-child td { border-bottom: none; }
        
        /* Sticky Total Footer */
        tr.sticky-total td { 
            position: sticky; 
            bottom: 0; 
            z-index: 30; 
            background: #f8fafc !important; 
            font-weight: 700; 
            border-top: 2px solid #e2e8f0 !important;
            color: #0f172a;
            box-shadow: 0 -2px 5px rgba(0,0,0,0.05);
        }

        .table-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; overflow: hidden; border: 1px solid #e2e8f0; width: 100%; }
        .table-card .header { padding: 15px 24px; background: #fff; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; align-items: center; }
        .table-container { overflow: auto; width: 100%; max-height: 800px; }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .dashboard-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; }
        .dashboard-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; background: #fff; }
        .dashboard-table tr:hover td { background: #f8fafc; }
        .date-col { min-width: 120px !important; width: 120px !important; white-space: nowrap !important; }
        .item-col { min-width: 320px !important; width: 320px !important; }
        .customer-col { min-width: 220px !important; width: 220px !important; }
        .invoice-col { min-width: 130px !important; width: 130px !important; }
        .type-col { min-width: 100px !important; width: 100px !important; text-align: center !important; }
        .currency-col { min-width: 140px !important; width: 140px !important; text-align: right !important; }
        .sp-col { min-width: 150px !important; width: 150px !important; }

        /* Hide Internal Chart Legend */
        .frappe-chart .chart-legend, 
        .frappe-chart .legend, 
        .frappe-chart .frappe-chart-legend,
        .frappe-chart .legend-dataset-text { 
            display: none !important; 
            visibility: hidden !important; 
            opacity: 0 !important; 
            height: 0 !important; 
            overflow: hidden !important; 
        }
            .export-btn { font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; white-space: nowrap; }
        .export-btn:hover { color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; }

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

	page.refresh = function () {
		let filters = page.filter_group.get_values();
		frappe.call({
			method: "renu_customization.renu_customization.page.collection_report.collection_report.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
		});
	};

	function render_dashboard(data) {
		page.container.empty();
		if (!data.results || data.results.length === 0) {
			$(
				`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found")}</div></div>`,
			).appendTo(page.container);
			return;
		}

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

		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		let chart_card = $(`
            <div class="chart-card">
                <div class="title">${data.chart.title}</div>
                <div id="chart_wrapper" style="height: 350px;"></div>
                <div id="chart_legend" class="custom-legend"></div>
                <div class="analytics-table-wrapper">
                    <table class="analytics-table">
                        <thead>
                            <tr>
                                <th style="width: 50px;">S.No.</th>
                                <th>Collection Type Data</th>
                                <th style="text-align: right;">Collection Value</th>
                                <th style="text-align: right;">Share %</th>
                            </tr>
                        </thead>
                        <tbody id="analytics_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(charts_row);

		setTimeout(() => {
			page.chart = new frappe.Chart("#chart_wrapper", {
				data: data.chart.data,
				type: "donut",
				height: 350,
				colors: data.chart.colors,
				legend: 0,
				tooltipOptions: {
					formatTooltipY: (d) => format_currency_short(d),
				},
			});

			let legend_container = chart_card.find("#chart_legend");
			let analytics_tbody = chart_card.find("#analytics_table_body");
			let total_val = data.chart.data.datasets[0].values.reduce((a, b) => a + b, 0);

			data.chart.data.labels.forEach((label, idx) => {
				let val = data.chart.data.datasets[0].values[idx];
				let color = data.chart.colors[idx % data.chart.colors.length];
				let share = total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";

				legend_container.append(`
                    <div class="legend-item">
                        <span class="dot" style="background: ${color}"></span>
                        <div class="info">
                            <span class="label">${label}</span>
                            <span class="val-pct">${format_currency_short(val)} (${share})</span>
                        </div>
                    </div>
                `);

				analytics_tbody.append(`
                    <tr>
                        <td>${idx + 1}</td>
                        <td style="font-weight: 500;">${label}</td>
                        <td style="text-align: right; font-weight: 600;">${format_currency_short(val)}</td>
                        <td style="text-align: right; color: #64748b;">${share}</td>
                    </tr>
                `);
			});
		}, 100);

		let table_card = $(`
            <div class="table-card">
                <div class="header">
                    <span>${__("Detailed Collection List")}</span>
                    <div class="export-btn" id="export_excel_btn">
                        <i class="fa fa-file-excel-o"></i> Export to Excel
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th class="invoice-col">${__("Invoice ID")}</th>
                                <th class="date-col">${__("Date")}</th>
                                <th class="customer-col">${__("Customer")}</th>
                                <th class="item-col">${__("Item")}</th>
                                <th class="sp-col">${__("Sales Person")}</th>
                                <th class="currency-col" style="text-align: right;">${__("Amount")}</th>
                                <th class="type-col" style="text-align: center;">${__("Type")}</th>
                            </tr>
                        </thead>
                        <tbody id="collection_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let tbody = table_card.find("#collection_table_body");
		let total_amt = 0;
		data.results.forEach((row) => {
			let type_label = row.is_export ? "Export" : "Domestic";
			total_amt += flt(row.base_grand_total);
			$(`
                <tr>
                    <td class="invoice-col"><a href="/app/sales-invoice/${row.name}" style="font-weight: 600; color: #4338ca;">${row.name}</a></td>
                    <td class="date-col">${frappe.datetime.str_to_user(row.posting_date)}</td>
                    <td class="customer-col">${row.customer}</td>
                    <td class="item-col">
                        <div style="line-height: 1.4;">
                            <div style="font-size: 11px; color: #64748b; font-weight: 500;">${row.item_code || "-"}</div>
                            <div style="font-weight: 600; color: #1e293b;">${row.item_name || "-"}</div>
                        </div>
                    </td>
                    <td class="sp-col">${row.sales_person || "-"}</td>
                    <td class="currency-col" style="text-align: right; font-weight: 700; color: #0f172a;">${format_currency_short(row.allocated_amount)}</td>
                    <td class="type-col" style="text-align: center;"><span class="indicator-pill ${type_label}">${__(type_label)}</span></td>
                </tr>
            `).appendTo(tbody);
		});

		// Add Total Row
		$(`
			<tfoot>
				<tr class="sticky-total">
					<td colspan="5" style="text-align: right; font-weight: 700; color: #64748b; padding-right: 20px;">GRAND TOTAL</td>
					<td class="currency-col" style="text-align: right; font-weight: 800; color: #0f172a; border-left: 1px solid #e2e8f0; background: #f8fafc;">${format_currency_short(total_amt)}</td>
					<td class="type-col"></td>
				</tr>
			</tfoot>
		`).appendTo(table_card.find(".dashboard-table"));

		table_card.find("#export_excel_btn").click(() => export_to_excel("detail"));
	}
	page.refresh();
};
