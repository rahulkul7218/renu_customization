frappe.provide("frappe.pages");
frappe.pages["gross_margin_dashboard"] = frappe.pages["gross_margin_dashboard"] || {};
frappe.pages["gross_margin_dashboard"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Gross Margin Dashboard"),
		single_column: true,
	});

	page.set_primary_action(__("Refresh"), () => page.refresh());

	// Standard Frappe Filters
	const filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);
	filter_parent.addClass("border-bottom").css({ "background-color": "#fff", "margin-bottom": "0" });

	let refresh_timer = null;
	page.refresh = function () {
		if (refresh_timer) clearTimeout(refresh_timer);
		refresh_timer = setTimeout(() => perform_refresh(), 50);
	};

	function perform_refresh() {
		const filters = page.filter_group.get_values();
		if (page.container) page.container.css("opacity", "0.6");

		frappe.call({
			method: "renu_customization.renu_customization.page.gross_margin_dashboard.gross_margin_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: (r) => {
				if (page.container) page.container.css("opacity", "1");
				if (r.message) render_dashboard(r.message);
			},
		});
	}

	const filter_fields = [
		{ fieldname: "fiscal_year", label: __("Fiscal Year"), fieldtype: "Link", options: "Fiscal Year" },
		{ fieldtype: "Column Break" },
		{ fieldname: "customer", label: __("Customer"), fieldtype: "Link", options: "Customer" },
		{ fieldtype: "Column Break" },
		{ fieldname: "customer_group", label: __("Customer Group"), fieldtype: "Link", options: "Customer Group" },
		{ fieldtype: "Column Break" },
		{ fieldname: "item_code", label: __("Product (Item)"), fieldtype: "Link", options: "Item" },
		{ fieldtype: "Column Break" },
		{ fieldname: "item_group", label: __("Product Group"), fieldtype: "Link", options: "Item Group" },
		{ fieldtype: "Section Break" },
		{ fieldname: "sales_person", label: __("Sales Person"), fieldtype: "Link", options: "Sales Person" },
		{ fieldtype: "Column Break" },
		{ fieldname: "territory", label: __("Territory"), fieldtype: "Link", options: "Territory" },
		{ fieldtype: "Column Break" },
		{ fieldname: "status", label: __("Status"), fieldtype: "MultiSelect", options: "Draft\nTo Bill\nTo Deliver and Bill\nTo Deliver\nCompleted" },
		{ fieldtype: "Column Break" },
		{ fieldname: "dom_exp", label: __("Type"), fieldtype: "Select", options: "\nDomestic\nExport" },
		{ fieldtype: "Column Break" },
		{ fieldname: "invoice_type", label: __("Invoice Type"), fieldtype: "Select", options: "\nProduct Domestic\nProduct Export\nEngineering Service Domestic\nEngineering Service Export" },
	];

	page.filter_group = new frappe.ui.FieldGroup({ parent: filter_parent, fields: filter_fields });
	page.filter_group.make();

	Object.keys(page.filter_group.fields_dict).forEach((key) => {
		let field = page.filter_group.fields_dict[key];
		if (!["Column Break", "Section Break"].includes(field.df.fieldtype)) {
			field.on_change = () => page.refresh();
			if (field.$input) field.$input.on("change input blur", () => setTimeout(() => page.refresh(), 50));
		}
	});

	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	$(`<style>
        .dashboard-content { padding: 24px; background: #fff; min-height: 100vh; }
        .summary-wrapper { display: grid !important; grid-template-columns: repeat(4, 1fr) !important; gap: 16px; margin-bottom: 24px; width: 100% !important; }
        .summary-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border-left: 4px solid #cbd5e1; transition: all 0.2s ease; }
        .summary-card:hover { transform: translateY(-2px); box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .summary-card .label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 20px; font-weight: 800; color: #0f172a; }
        .summary-card .indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
        .bg-blue { background-color: #3b82f6; } .bg-green { background-color: #10b981; } .bg-orange { background-color: #f59e0b; } .bg-purple { background-color: #8b5cf6; }

        .charts-row { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px; width: 100%; }
        .chart-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .chart-card.full-width { grid-column: 1 / -1; }
        .chart-card .title { font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.025em; display: flex; justify-content: space-between; align-items: center; }
        .reset-btn { font-size: 11px; color: #2563eb; cursor: pointer; text-transform: none; font-weight: 600; }
        
        .custom-legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; margin-top: 30px; padding: 20px; border-top: 1px solid #f1f5f9; background: #fafafa; border-radius: 8px; }
        .legend-item { display: flex; align-items: flex-start; gap: 12px; cursor: pointer; }
        .legend-item .dot { width: 12px; height: 12px; border-radius: 3px; flex-shrink: 0; margin-top: 2px; }
        .legend-item .info { display: flex; flex-direction: column; line-height: 1.2; }
        .legend-item .label { font-size: 12px; font-weight: 600; color: #475569; text-decoration: none !important; }
        .legend-item .val { font-size: 11px; color: #94a3b8; }

        .frappe-chart .chart-legend, .frappe-chart .legend { display: none !important; visibility: hidden !important; }
        .frappe-chart text { font-size: 11px !important; }
        .chart-actions, .table-actions { display: flex; gap: 12px; align-items: center; }
        .export-btn { font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; white-space: nowrap; }
        .export-btn:hover { color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; }

        .table-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); margin-bottom: 30px; overflow: visible; display: flex; flex-direction: column; }
        .table-card .header { padding: 15px 24px; border-bottom: 1px solid #f1f5f9; font-weight: 600; display: flex; justify-content: space-between; align-items: center; background: #fff; }
        .table-container { overflow: auto; width: 100%; max-height: 500px; position: relative; }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .dashboard-table th { background: #f8f9fa; padding: 12px 14px; text-align: left; font-size: 11px; color: #555; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #dee2e6; white-space: nowrap; }
        .dashboard-table td { padding: 12px 14px; border-top: 1px solid #eee; font-size: 13px; color: #333; background: #fff; white-space: nowrap; }
        .text-right { text-align: right !important; }
        .font-weight-bold { font-weight: 700 !important; }
        .indicator-pill { padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        
        .sticky-right-1 { position: sticky; right: 0; z-index: 5; background: #f8f9fa !important; border-left: 1px solid #ddd; }
        .sticky-right-2 { position: sticky; right: 100px; z-index: 5; background: #f8f9fa !important; border-left: 1px solid #ddd; }
        tr.sticky-total td { position: sticky; bottom: 0; z-index: 9; background: #f1f3f5 !important; font-weight: 700; border-top: 2px solid #ddd; }

        @media print {
            @page { size: landscape; margin: 5mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            .dashboard-filter-area, .page-head, .refresh-btn, .export-btn, .no-print, .reset-btn { display: none !important; }
            .dashboard-table th, .dashboard-table td { border: 0.5pt solid #000 !important; }
        }
    </style>`).appendTo(page.main);

	function format_currency_short(num, fieldtype) {
		if (!num && num !== 0) return fieldtype === "Percent" ? "0.00%" : "₹ 0.00 M";
		if (fieldtype === "Percent") return flt(num).toFixed(2) + "%";
		return "₹ " + (flt(num) / 1000000).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M";
	}

	function render_dashboard(data) {
		page.container.empty();
		page.clear_menu();
		if (!data.results || data.results.length === 0) {
			$(`<div class="text-center text-muted" style="padding: 100px 0;"><div>${__("No data found")}</div></div>`).appendTo(page.container);
			return;
		}

		// KPI Cards
		if (data.summary) {
			let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
			data.summary.forEach((m) => {
				$(`
                    <div class="summary-card">
                        <div class="label"><span class="indicator bg-${m.indicator.toLowerCase()}"></span>${m.label}</div>
                        <div class="value">${format_currency_short(m.value, m.fieldtype)}</div>
                    </div>
                `).appendTo(summary_row);
			});
		}

		// Charts
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		const chart_config = {
			margin_trend: { title: "Monthly Revenue vs Margin" },
			top_10_salesperson: { field: "sales_person", title: "Top 10 Salesperson" },
			top_10_customers: { field: "customer", title: "Top 10 Customers" },
			top_10_products: { field: "item_code", title: "Top 10 Products" },
		};

		Object.keys(data.charts).forEach((id) => {
			let chart_obj = data.charts[id];
			let config = chart_config[id];
			if (!chart_obj.data.labels || chart_obj.data.labels.length === 0) return;

			let is_full = id === "margin_trend";
			let wrapper = $(`
                <div class="chart-card ${is_full ? "full-width" : ""}">
                    <div class="title">
                        <span>${chart_obj.title}</span>
                        ${config && config.field && page.filter_group.get_value(config.field) ? `<span class="reset-btn" data-field="${config.field}">Reset</span>` : ""}
                    </div>
                    <div id="wrapper_${id}" style="height: 350px;"></div>
                    ${!is_full ? `<div id="legend_${id}" class="custom-legend"></div>` : ""}
                </div>
            `).appendTo(charts_row);

			setTimeout(() => {
				let chart = new frappe.Chart(`#wrapper_${id}`, {
					data: chart_obj.data,
					type: chart_obj.type || "donut",
					height: 350,
					colors: chart_obj.colors,
                    legend: 0,
					tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
					onClick: (event) => {
						if (config && config.field && event.label) {
							page.filter_group.set_value(config.field, event.label);
							page.refresh();
						}
					},
				});

                if (!is_full) {
                    let legend_container = wrapper.find(`.custom-legend`);
                    let total_val = chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0);
                    chart_obj.data.labels.forEach((label, idx) => {
                        let val = chart_obj.data.datasets[0].values[idx];
                        let share = total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";
                        let display_label = label;
                        if (label && label.includes(' - ')) {
                            let parts = label.split(' - ');
                            if (parts[0] === parts[1]) display_label = parts[0];
                        }
                        let $item = $(`
                            <div class="legend-item">
                                <span class="dot" style="background: ${chart_obj.colors[idx % chart_obj.colors.length]}"></span>
                                <div class="info">
                                    <span class="label">${display_label}</span>
                                    <span class="val">${format_currency_short(val)} (${share})</span>
                                </div>
                            </div>
                        `).appendTo(legend_container);
                        $item.on("click", () => {
                            if (config && config.field) {
                                page.filter_group.set_value(config.field, label);
                                page.refresh();
                            }
                        });
                    });
                }
			}, 100);
		});

		// Table Logic
		let months_map = {}; let months = [];
		data.results.forEach((r) => {
			let date = r.invoice_date || r.posting_date;
			let m_key = moment(date).format("MMM YYYY");
			let m_sort = moment(date).format("YYYYMM");
			if (!months_map[m_key]) { months_map[m_key] = m_sort; months.push({ key: m_key, sort: m_sort }); }
		});
		months.sort((a, b) => a.sort - b.sort);

		let tables_container = $('<div style="margin-top: 24px;"></div>').appendTo(page.container);
		let card = $(`
            <div class="table-card">
                <div class="header">
                    <span>${__("Month-Wise Gross Margin")}</span>
                    <div class="table-actions">
                        <div id="filter_customer_link" style="width: 200px;"></div>
                        <div id="filter_sp_link" style="width: 200px;"></div>
                        <span class="export-btn" id="export_month_btn"><i class="fa fa-file-excel-o"></i> Export</span>
                        <span class="export-btn" id="pdf_month_table"><i class="fa fa-file-pdf-o"></i> PDF</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">S.No.</th>
                                <th style="min-width: 200px;">Customer</th>
                                <th style="min-width: 150px;">Sales Person</th>
                                <th style="min-width: 200px;">Product</th>
                                ${months.map(m => `<th class="text-right">${m.key}</th>`).join("")}
                                <th class="text-right sticky-right-2">Total Margin (M)</th>
                                <th class="text-right sticky-right-1">Margin %</th>
                            </tr>
                        </thead>
                        <tbody id="consolidated_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_container);

		const render_table = (results) => {
			let tbody = card.find("#consolidated_table_body");
			tbody.empty();
			let merged = {};
			results.forEach(r => {
				let key = (r.sales_person||"-") + "|" + (r.customer_name||"-") + "|" + r.item_code;
				if (!merged[key]) merged[key] = { sp: r.sales_person, cust: r.customer_name, prod: r.item_code, months: {}, total: 0, total_rev: 0 };
				let m_key = moment(r.invoice_date).format("MMM YYYY");
				merged[key].months[m_key] = (merged[key].months[m_key] || 0) + flt(r.margin);
				merged[key].total += flt(r.margin);
				merged[key].total_rev += flt(r.base_amount);
			});

			Object.values(merged).sort((a,b) => b.total - a.total).slice(0, 100).forEach((r, i) => {
				let cells = months.map(m => `<td class="text-right">${format_currency_short(r.months[m.key] || 0)}</td>`).join("");
				let pct = (r.total / r.total_rev) * 100 || 0;
				tbody.append(`
                    <tr>
                        <td class="text-center">${i+1}</td><td>${r.cust}</td><td>${r.sp}</td><td>${r.prod}</td>
                        ${cells}
                        <td class="text-right font-weight-bold sticky-right-2">${format_currency_short(r.total)}</td>
                        <td class="text-right sticky-right-1"><span class="indicator-pill ${pct > 20 ? "green" : pct < 5 ? "red" : ""}">${pct.toFixed(2)}%</span></td>
                    </tr>
                `);
			});
		};

		render_table(data.results);
        
        // Detailed List Table
		let detail_card = $(`
            <div class="table-card" style="margin-top: 30px;">
                <div class="header">
                    <span>${__("Detailed Gross Margin List")}</span>
                    <div class="table-actions">
                        <span class="export-btn" id="export_detail_btn"><i class="fa fa-file-excel-o"></i> Export</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="width: 50px; text-align: center;">S.No.</th>
                                <th>Invoice ID</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Product</th>
                                <th class="text-right">Qty</th>
                                <th class="text-right">Revenue (M)</th>
                                <th class="text-right">COGS (M)</th>
                                <th class="text-right">Margin (M)</th>
                                <th class="text-right">Margin %</th>
                            </tr>
                        </thead>
                        <tbody id="detail_table_body">
                            ${data.results.map((r, i) => `
                                <tr>
                                    <td class="text-center">${i+1}</td>
                                    <td>${r.invoice_id}</td>
                                    <td>${r.invoice_date}</td>
                                    <td>${r.customer_name}</td>
                                    <td>${r.item_code}</td>
                                    <td class="text-right">${flt(r.qty).toFixed(2)}</td>
                                    <td class="text-right">${format_currency_short(r.base_amount)}</td>
                                    <td class="text-right">${format_currency_short(r.cogs)}</td>
                                    <td class="text-right font-weight-bold">${format_currency_short(r.margin)}</td>
                                    <td class="text-right">${flt(r.margin_pct).toFixed(2)}%</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

        // Export handlers
        const export_to_excel = () => {
            frappe.call({
                method: "renu_customization.renu_customization.page.gross_margin_dashboard.gross_margin_dashboard.export_to_excel",
                args: { filters: page.filter_group.get_values() },
                callback: (r) => {
                    if (r.message) {
                        const blob = b64toBlob(r.message.filecontent, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = r.message.filename;
                        link.click();
                    }
                }
            });
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

			const [png_trend, png1, png2, png3] = await Promise.all([
				get_chart_png("margin_trend"),
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
				return `<div style="margin-top:10px; page-break-inside: avoid;"><table style="width:80%; margin: 10px auto; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;"><thead><tr style="background: #f8f9fa;"><th style="width: 40px; text-align:center; border-bottom:2px solid #3498db;">S.No.</th><th style="text-align:left; border-bottom:2px solid #3498db;">${title}</th><th style="width: 120px; text-align:right; border-bottom:2px solid #3498db;">Margin (M)</th><th style="width: 80px; text-align:right; border-bottom:2px solid #3498db;">Share %</th></tr></thead><tbody>${rows}</tbody></table></div>`;
			};

			const html = `
				<html>
				<head>
					<style>
						body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #1e293b; line-height: 1.4; }
						.report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                        .indicator-pill.red { background: #fee2e2; color: #991b1b; }

                        .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 20px; table-layout: fixed; }
                        .kpi-card { display: table-cell; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; text-align: center; vertical-align: top; }
                        .kpi-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 5px; vertical-align: middle; }
                        .kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; white-space: nowrap; }
                        .kpi-value { font-size: 15px; font-weight: 800; color: #0f172a; white-space: nowrap; }
                        
                        h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 12px; text-transform: uppercase; letter-spacing: 0.025em; }
                        
                        @page { size: landscape; margin: 10mm; }
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 10px; color: #1e293b; line-height: 1.2; zoom: 0.9; }
                        .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8px; border: 1px solid #e2e8f0; table-layout: fixed; }
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
					</style>
				</head>
				<body>
					<div class="report-header">
						<h1 style="margin:0; font-size: 24px;">Gross Margin Dashboard</h1>
						<p style="font-size: 14px; color: #555; margin: 8px 0;">${period}</p>
						<p style="font-size: 11px; color: #999; margin: 0;">Generated: ${report_date}</p>
					</div>
					<div class="kpi-wrapper">
						${data.summary.map((m) => {
                            let color = "#3498db";
                            if (m.indicator === "green") color = "#2ecc71";
                            if (m.indicator === "orange") color = "#e67e22";
                            if (m.indicator === "red") color = "#e74c3c";
                            if (m.indicator === "purple") color = "#9b59b6";
                            return `
							<div class="kpi-card">
								<div class="kpi-label"><span class="kpi-dot" style="background: ${color};"></span>${m.label}</div>
								<div class="kpi-value">${format_currency_short(m.value, m.fieldtype)}</div>
							</div>
						`}).join("")}
					</div>
					<h3>Analytics Summary</h3>
					${chart_h(png_trend, "Monthly Revenue vs Margin")}
					${chart_h(png1, "Top Salesperson by Margin")}
                    ${chart_l("top_10_salesperson")}
					${chart_t("top_10_salesperson", "Top Salesperson Data")}
                    <div class="page-break"></div>
					${chart_h(png2, "Top Customers by Margin")}
                    ${chart_l("top_10_customers")}
					${chart_t("top_10_customers", "Top Customers Data")}
					${chart_h(png3, "Top Products by Margin")}
                    ${chart_l("top_10_products")}
					${chart_t("top_10_products", "Top Products Data")}
					<div class="page-break"></div>
					<h3>Month-Wise Margin Summary (M)</h3>
					<table>
						${card.find("table").html()}
					</table>
                    <div class="page-break"></div>
					<h3>Detailed Gross Margin List (M)</h3>
					<table>
						${detail_card.find("table").html()}
					</table>
				</body>
				</html>
			`;


            // Standard way to handle PDF binary response in new tab
            const method_url = "/api/method/renu_customization.renu_customization.page.gross_margin_dashboard.gross_margin_dashboard.export_to_pdf";
            const $form = $(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
                <input type="hidden" name="html" value="">
                <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
            </form>`).appendTo("body");
            $form.find('input[name="html"]').val(html);
            $form.submit();
            $form.remove();
		};

        // Local Table Handlers
        card.find("#export_month_btn, #pdf_month_table").on("click", (e) => {
            if (e.currentTarget.id === "export_month_btn") export_to_excel();
            else export_pdf();
        });
        detail_card.find("#export_detail_btn").on("click", () => export_to_excel());

        page.container.on("click", ".reset-btn", (e) => {
            const field = $(e.currentTarget).data("field");
            page.filter_group.set_value(field, "");
            page.refresh();
        });

        page.add_menu_item(__("Export to PDF"), () => export_pdf());
        page.add_menu_item(__("Export to Excel"), () => export_to_excel());
	}

	function b64toBlob(b64Data, contentType = "", sliceSize = 512) {
		const byteCharacters = atob(b64Data);
		const byteArrays = [];
		for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
			const slice = byteCharacters.slice(offset, offset + sliceSize);
			const byteNumbers = new Array(slice.length);
			for (let i = 0; i < slice.length; i++) byteNumbers[i] = slice.charCodeAt(i);
			byteArrays.push(new Uint8Array(byteNumbers));
		}
		return new Blob(byteArrays, { type: contentType });
	}

	page.refresh();
};
