frappe.pages["margin_build"].on_page_load = function(wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Margin Build (Million INR)"),
		single_column: true
	});

	page.set_primary_action(__("Refresh"), () => page.refresh());

	// Export Functions
	const export_to_excel = () => {
		const filters = page.filter_group.get_values();
        frappe.show_alert({ message: __("Generating Excel Report..."), indicator: "blue" });

		frappe.call({
			method: "renu_customization.renu_customization.page.margin_build.margin_build.export_to_excel",
			args: { filters: filters },
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
                    frappe.show_alert({ message: __("Excel Report Downloaded"), indicator: "green" });
				}
			},
		});
	};

	const export_pdf = async () => {
		if (!page.dashboard_data) return;

		const report_date = moment().format("YYYY-MM-DD HH:mm");
		const data = page.dashboard_data;
		
		const get_chart_png = () => {
			const svg = document.querySelector(`#margin-chart svg`);
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
				img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg_data)));
			});
		};

		const chart_png = await get_chart_png();
        const total_val = data.charts.margin_breakdown.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;

        // Generate Legend Box HTML for PDF
        const legend_box_html = data.charts.margin_breakdown.data.labels.map((label, i) => {
            const val = data.charts.margin_breakdown.data.datasets[0].values[i];
            const color = data.charts.margin_breakdown.colors[i % data.charts.margin_breakdown.colors.length];
            const share = ((val / total_val) * 100).toFixed(1) + "%";
            return `
                <div style="display: inline-block; width: 45%; margin: 5px 2%; vertical-align: top; text-align: left;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: ${color}; margin-right: 8px;"></span>
                    <div style="display: inline-block; vertical-align: top;">
                        <div style="font-size: 10px; font-weight: 600; color: #475569;">${label}</div>
                        <div style="font-size: 9px; color: #94a3b8;">${format_currency(val)} (${share})</div>
                    </div>
                </div>
            `;
        }).join('');

		let html = `
            <html>
            <head>
                <style>
                    body { font-family: 'Helvetica', sans-serif; padding: 20px; color: #1e293b; }
                    .header { text-align: center; border-bottom: 3px solid #10b981; padding-bottom: 20px; margin-bottom: 30px; }
                    .kpi-wrapper { display: flex; justify-content: space-between; margin-bottom: 30px; }
                    .kpi-card { border: 1px solid #e2e8f0; padding: 15px; border-radius: 10px; flex: 1; margin: 0 10px; text-align: center; background: #f8fafc; }
                    .kpi-label { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; }
                    .kpi-value { font-size: 18px; font-weight: 800; }
                    .chart-container { text-align: center; margin-bottom: 40px; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; background: #fff; page-break-inside: avoid; }
                    .chart-img { max-width: 400px; margin-bottom: 20px; }
                    .pdf-legend-box { background: #fafafa; border-radius: 8px; padding: 15px; border-top: 1px solid #f1f5f9; margin-top: 20px; text-align: left; }
                    
                    table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 20px; page-break-inside: auto; }
                    tr { page-break-inside: avoid; page-break-after: auto; }
                    thead { display: table-header-group; }
                    tfoot { display: table-row-group; }
                    th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #10b981; color: #64748b; text-transform: uppercase; }
                    td { padding: 8px; border-bottom: 1px solid #eee; }
                    .text-right { text-align: right; }
                    .text-center { text-align: center; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1 style="margin:0;">Margin Build Report (Million INR)</h1>
                    <p style="font-size:10px; color:#999;">Generated: ${report_date}</p>
                </div>
                <div class="kpi-wrapper">
                    ${data.summary.map(m => `
                        <div class="kpi-card">
                            <div class="kpi-label">${m.label}</div>
                            <div class="kpi-value">${m.fieldtype === 'Currency' ? format_currency(m.value) : m.value}</div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="chart-container">
                    <h3 style="color:#334155; text-transform:uppercase; font-size:14px; margin-top:0;">${data.charts.margin_breakdown.title}</h3>
                    <img src="${chart_png}" class="chart-img">
                    <div class="pdf-legend-box">
                        ${legend_box_html}
                    </div>
                </div>

                <h3 style="color:#334155; text-transform:uppercase; font-size:14px;">Detailed Margin List</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Invoice ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th class="text-center">Type</th>
                            <th class="text-right">Revenue (M)</th>
                            <th class="text-right">COGS (M)</th>
                            <th class="text-right">Margin (M)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.results.map(row => `
                            <tr>
                                <td>${row.name}</td>
                                <td>${frappe.datetime.str_to_user(row.posting_date)}</td>
                                <td>${row.customer_name || row.customer}</td>
                                <td class="text-center">${row.type}</td>
                                <td class="text-right">${format_currency(row.revenue)}</td>
                                <td class="text-right">${format_currency(row.cogs)}</td>
                                <td class="text-right" style="font-weight: bold; color: ${row.margin < 0 ? '#ef4444' : '#10b981'}">${format_currency(row.margin)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </body>
            </html>
        `;

		const method_url = "/api/method/renu_customization.renu_customization.page.margin_build.margin_build.export_to_pdf";
		const $form = $(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
            <input type="hidden" name="html" value="">
            <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
        </form>`).appendTo("body");

		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();
	};

    page.add_menu_item(__("Export to PDF"), () => export_pdf());
    page.add_menu_item(__("Export to Excel"), () => export_to_excel());

	let filter_area = $('<div class="dashboard-filter-area border-bottom"></div>').prependTo(page.main);
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	const filter_fields = [
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			default: frappe.datetime.add_months(frappe.datetime.get_today(), -1)
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			default: frappe.datetime.get_today()
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
		},
		{ fieldtype: "Column Break" },
		{
			fieldname: "type",
			label: __("Type"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"]
		}
	];

	page.filter_group = new frappe.ui.FieldGroup({
		parent: filter_area,
		fields: filter_fields,
	});
	page.filter_group.make();

	filter_area.css({
		"padding": "10px 20px",
		"background-color": "#fff",
		"border-bottom": "1px solid #f1f5f9"
	});

	Object.keys(page.filter_group.fields_dict).forEach(key => {
		let field = page.filter_group.fields_dict[key];
		field.df.on_change = () => page.refresh();
		if (field.$input) {
			field.$input.on("change input blur", () => { setTimeout(() => page.refresh(), 50); });
		}
	});

	page.refresh = function() {
		let filters = page.filter_group.get_values();
		
		frappe.call({
			method: "renu_customization.renu_customization.page.margin_build.margin_build.get_dashboard_data",
			args: { filters: filters },
			callback: function(r) {
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			}
		});
	};

	function render_dashboard(data) {
		page.container.empty();

		if (!$('#margin-dashboard-style').length) {
			$(`<style id="margin-dashboard-style">
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
                
                .dashboard-content { 
                    padding: 20px; 
                    background: transparent !important; 
                    min-height: 100vh; 
                    font-family: 'Inter', sans-serif; 
                    color: #1e293b; 
                    width: 100% !important; 
                }

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
                    transition: transform 0.2s;
				}
                .summary-card:hover { transform: translateY(-2px); }
				.summary-card.border-red { border-left-color: #ef4444; }
				.summary-card.border-orange { border-left-color: #f59e0b; }
				.summary-card.border-blue { border-left-color: #3b82f6; }
				.summary-card.border-green { border-left-color: #10b981; }
				.summary-card.border-purple { border-left-color: #8b5cf6; }
				
                .summary-card .label { 
                    font-size: 11px; 
                    color: #64748b; 
                    font-weight: 700; 
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                    margin-bottom: 8px;
                }
				.summary-card .value { 
                    font-size: 20px; 
                    font-weight: 800; 
                    color: #0f172a; 
                }

				.chart-card { 
                    background: #fff; 
                    border-radius: 12px; 
                    padding: 24px; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
                    border: 1px solid #e2e8f0; 
                    margin-bottom: 24px;
                }
                .chart-card .title { 
                    font-size: 13px; 
                    font-weight: 700; 
                    color: #1e293b; 
                    margin-bottom: 20px; 
                    text-transform: uppercase; 
                    letter-spacing: 0.05em; 
                }
                
                .custom-legend { 
                    display: grid !important; 
                    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)) !important; 
                    gap: 12px 24px !important; 
                    margin-top: 20px; 
                    padding: 16px !important; 
                    background: #f8fafc !important; 
                    border-radius: 8px !important; 
                    border: 1px solid #eef2f6 !important; 
                }
                .legend-item { 
                    display: flex !important; 
                    align-items: center !important; 
                    gap: 10px !important; 
                }
                .legend-item .dot { width: 10px !important; height: 10px !important; border-radius: 2px !important; flex-shrink: 0; }
                .legend-item .info { display: flex !important; align-items: center !important; gap: 8px !important; width: 100%; }
                .legend-item .label { font-size: 11px !important; font-weight: 600 !important; color: #475569 !important; white-space: nowrap; }
                .legend-item .val-pct { font-size: 10px !important; color: #94a3b8 !important; }
                .legend-item .val-amount { font-size: 11px !important; font-weight: 700 !important; color: #1e293b !important; margin-left: auto; }
				
				.table-card { 
                    background: #fff; 
                    border-radius: 12px; 
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1); 
                    margin-bottom: 24px; 
                    overflow: hidden; 
                    border: 1px solid #e2e8f0; 
                    width: 100%; 
                }
				.table-card .header { 
                    padding: 15px 24px; 
                    background: #fff; 
                    border-bottom: 1px solid #f1f5f9; 
                    font-weight: 700; 
                    color: #0f172a; 
                    display: flex; 
                    justify-content: space-between; 
                    align-items: center; 
                }
                .table-container { 
                    overflow: auto; 
                    width: 100%; 
                    max-height: 600px; 
                }
				.dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
				.dashboard-table th { 
                    background: #f8fafc; 
                    padding: 12px 16px; 
                    text-align: left; 
                    font-size: 11px; 
                    font-weight: 700; 
                    color: #64748b; 
                    position: sticky; 
                    top: 0; 
                    z-index: 10; 
                    border-bottom: 1px solid #e2e8f0; 
                    text-transform: uppercase; 
                }
				.dashboard-table td { 
                    padding: 12px 16px; 
                    border-bottom: 1px solid #f1f5f9; 
                    font-size: 13px; 
                    color: #334155; 
                    background: #fff; 
                }
				.dashboard-table tr:hover td { background: #f8fafc; }
				.text-right { text-align: right; }
                .text-center { text-align: center; }
				
                .indicator-pill {
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 10px;
                    font-weight: 700;
                    text-transform: uppercase;
                }
                .indicator-pill.Domestic { background: #e0f2fe; color: #0369a1; }
                .indicator-pill.Export { background: #fef3c7; color: #92400e; }
                .indicator-pill.Other { background: #f1f5f9; color: #475569; }

                .export-btn { 
                    font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; 
                    padding: 6px 14px; border-radius: 6px; transition: all 0.2s;
                    display: inline-flex; align-items: center; gap: 6px;
                    background: #fff; border: 1px solid #e2e8f0;
                    white-space: nowrap;
                }
                .export-btn:hover { color: #2563eb; background: #eff6ff; border-color: #bfdbfe; }
			</style>`).appendTo('head');
		}

		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach(s => {
			$(`
				<div class="summary-card border-${s.indicator.toLowerCase()}">
					<div class="label">${s.label}</div>
					<div class="value">${s.fieldtype === 'Currency' ? format_currency(s.value) : s.value}</div>
				</div>
			`).appendTo(summary_row);
		});

		let chart_card = $(`
            <div class="chart-card">
                <div class="title">${data.charts.margin_breakdown.title}</div>
                <div id="margin-chart" style="height: 350px;"></div>
                <div id="margin-legend" class="custom-legend"></div>
            </div>
        `).appendTo(page.container);
        
		setTimeout(() => {
            let chart = new frappe.Chart("#margin-chart", {
                data: data.charts.margin_breakdown.data,
                type: 'donut',
                height: 350,
                colors: data.charts.margin_breakdown.colors,
                legend: 0,
            });

            // Render Custom Legend
            let legend_container = chart_card.find("#margin-legend");
            let total_val = data.charts.margin_breakdown.data.datasets[0].values.reduce((a, b) => a + b, 0);

            data.charts.margin_breakdown.data.labels.forEach((label, idx) => {
                let val = data.charts.margin_breakdown.data.datasets[0].values[idx];
                let color = data.charts.margin_breakdown.colors[idx % data.charts.margin_breakdown.colors.length];
                let share = total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";
                
                legend_container.append(`
                    <div class="legend-item">
                        <span class="dot" style="background: ${color}"></span>
                        <div class="info">
                            <span class="label">${label}</span>
                            <span class="val-pct">(${share})</span>
                            <span class="val-amount">${format_currency(val)}</span>
                        </div>
                    </div>
                `);
            });
        }, 100);

		let table_card = $(`
            <div class="table-card">
                <div class="header">
                    <span>${__("Detailed Margin List")}</span>
                    <div class="export-btn" id="export_excel_table">
                        <i class="fa fa-file-excel-o"></i> Export
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th>${__("Invoice ID")}</th>
                                <th>${__("Date")}</th>
                                <th>${__("Customer")}</th>
                                <th class="text-center">${__("Type")}</th>
                                <th class="text-right">${__("Revenue (M)")}</th>
                                <th class="text-right">${__("COGS (M)")}</th>
                                <th class="text-right">${__("Margin (M)")}</th>
                            </tr>
                        </thead>
                        <tbody></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let tbody = table_card.find('tbody');
		data.results.forEach(row => {
			$(`
				<tr>
					<td><a href="/app/sales-invoice/${row.name}" style="font-weight: 600; color: #4338ca;">${row.name}</a></td>
					<td style="white-space: nowrap;">${frappe.datetime.str_to_user(row.posting_date)}</td>
					<td style="font-weight: 500;">${row.customer_name || row.customer}</td>
                    <td class="text-center">
                        <span class="indicator-pill ${row.type}">${__(row.type)}</span>
                    </td>
					<td class="text-right">${format_currency(row.revenue)}</td>
					<td class="text-right">${format_currency(row.cogs)}</td>
					<td class="text-right" style="font-weight: 700; color: ${row.margin < 0 ? '#ef4444' : '#10b981'};">${format_currency(row.margin)}</td>
				</tr>
			`).appendTo(tbody);
		});

        table_card.find("#export_excel_table").click(() => export_to_excel());
	}

	function format_currency(v) {
		if (!v && v !== 0) return "₹ 0.00 M";
		
		let value = flt(v) / 1000000;
		
		return (
			"₹ " +
			value.toLocaleString("en-US", {
				minimumFractionDigits: 2,
				maximumFractionDigits: 2,
			}) + " M"
		);
	}

	page.refresh();
};
