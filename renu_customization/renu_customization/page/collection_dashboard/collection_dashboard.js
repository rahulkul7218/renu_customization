/* Collection Dashboard - Version 3.4 */
frappe.pages["collection_dashboard"].on_page_load = function (wrapper) {
	console.log("Collection Dashboard - Version 3.4 (Stable Load)");
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Collection Dashboard"),
		single_column: true,
	});

	// --- 1. SETUP CONTAINERS AND CSS ---
	$(`<style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        .layout-main-section { background-color: transparent !important; }
        .page-container { background-color: transparent !important; }
        .dashboard-content { padding: 20px; background: transparent !important; min-height: 100vh; font-family: 'Inter', sans-serif; color: #1e293b; width: 100% !important; }

        .dashboard-filter-area {
            padding: 10px 10px 10px 10px !important;
            background-color: #fff !important;
            border-bottom: 1px solid #e2e8f0 !important;
            margin-bottom: 0 !important;
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
            gap: 12px 12px !important;
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
            height: 28px !important;
            font-size: 13px !important;
        }
        .dashboard-filter-area label,
        .dashboard-filter-area .control-label {
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #475569 !important;
            margin-bottom: 6px !important;
            display: block !important;
            white-space: nowrap !important;
            text-overflow: ellipsis;
            overflow: hidden;
        }
        .dashboard-filter-area .help-box,
        .dashboard-filter-area .description {
            display: none !important;
        }

        /* Dashboard Cards */
        .summary-wrapper {
            display: grid !important;
            grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
            gap: 16px;
            margin-bottom: 24px;
            width: 100% !important;
        }
        .summary-card { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); border-left: 5px solid #cbd5e1; transition: all 0.3s ease; position: relative; }
        .summary-card:hover { transform: translateY(-4px); box-shadow: 0 12px 20px -5px rgba(0, 0, 0, 0.1); }
        .summary-card.blue { border-left-color: #3b82f6; }
        .summary-card.green { border-left-color: #10b981; }
        .summary-card.orange { border-left-color: #f59e0b; }
        .summary-card.purple { border-left-color: #8b5cf6; }
        .summary-card.red { border-left-color: #ef4444; }
        .summary-card.grey { border-left-color: #94a3b8; }
        .summary-card.cyan { border-left-color: #06b6d4; }

        .summary-card .label { font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 8px; display: flex; align-items: center; gap: 8px; }
        .summary-card .value { font-size: 20px; font-weight: 800; color: #0f172a; }
        .summary-card .indicator { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
        .bg-blue { background-color: #3b82f6; }
        .bg-green { background-color: #10b981; }
        .bg-orange { background-color: #f59e0b; }
        .bg-purple { background-color: #8b5cf6; }
        .bg-red { background-color: #ef4444; }
        .bg-grey { background-color: #94a3b8; }
        .bg-cyan { background-color: #06b6d4; }

        /* Charts & Tables */
        .charts-row { display: grid; grid-template-columns: 1fr; gap: 24px; margin-bottom: 24px; width: 100%; }
        .chart-card { background: #fff; border-radius: 12px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; }
        .chart-card .title { font-size: 13px; font-weight: 700; color: #1e293b; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 0.05em; }
        .custom-legend { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 16px; margin-top: 30px; padding: 20px; border-top: 1px solid #f1f5f9; background: #fafafa; border-radius: 8px; }
        .legend-item { display: flex; align-items: flex-start; gap: 12px; }
        .legend-item .dot { width: 10px; height: 10px; border-radius: 2px; flex-shrink: 0; margin-top: 2px; }
        .legend-item .label { font-size: 11px; font-weight: 600; color: #475569; }
        .legend-item .val-pct { font-size: 10px !important; color: #94a3b8 !important; font-weight: 500 !important; }

        .table-card { background: #fff; border-radius: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); margin-bottom: 24px; overflow: hidden; border: 1px solid #e2e8f0; width: 100%; }
        .table-card .header { padding: 15px 24px; background: #fff; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #0f172a; display: flex; justify-content: space-between; align-items: center; }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        .dashboard-table th { background: #f8fafc; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 700; color: #64748b; position: sticky; top: 0; z-index: 10; border-bottom: 1px solid #e2e8f0; text-transform: uppercase; white-space: nowrap; }
        .dashboard-table td { padding: 12px 16px; border-bottom: 1px solid #f1f5f9; font-size: 13px; color: #334155; }
        .dashboard-table tr:hover td { background: #f8fafc; }

        tr.sticky-total td { position: sticky; bottom: 0; z-index: 30; background: #f8fafc !important; font-weight: 700; border-top: 2px solid #e2e8f0 !important; color: #0f172a; }

        .export-btn { font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; }
        .export-btn:hover { color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; }

        /* Indicators */
        .indicator-pill { padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; }
        .indicator-pill.Export { background: #ecfdf5; color: #065f46; }
        .indicator-pill.Domestic { background: #fff7ed; color: #9a3412; }

        /* Hide default Frappe Chart legend */
        .frappe-chart .chart-legend { display: none !important; }

    </style>`).appendTo(page.main);

	let filter_parent = $('<div class="dashboard-filter-area"></div>').prependTo(page.main);
	page.container = $('<div class="dashboard-content"></div>').appendTo(page.main);

	// --- 2. DEFINE LOGIC FUNCTIONS ---
	function format_million(num) {
		if (!num && num !== 0) return "₹ 0.00 M";
		let val = flt(num) / 1000000;
		return "₹ " + val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " M";
	}

	function format_currency_short(num) {
		if (!num && num !== 0) return "₹ 0.00 M";
		return format_million(num);
	}

	page.refresh = function () {
		if (page._refresh_timer) clearTimeout(page._refresh_timer);
		page._refresh_timer = setTimeout(() => {
			page.execute_refresh();
		}, 150); // 150ms debounce
	};

	page.execute_refresh = function () {
		let filters = page.filter_group ? page.filter_group.get_values() : {};

		// Show loading indicator
		if (page.container.is(":empty") || page.container.find(".summary-wrapper").length === 0) {
			page.container.html(
				'<div class="text-center" style="padding: 100px 0;"><i class="fa fa-refresh fa-spin fa-2x text-muted"></i><div class="mt-2 text-muted">Loading Collection Data...</div></div>',
			);
		} else {
			page.container.css("opacity", 0.6);
		}

		frappe.call({
			method: "renu_customization.renu_customization.page.collection_dashboard.collection_dashboard.get_dashboard_data",
			args: { filters: filters },
			callback: function (r) {
				page.container.css("opacity", 1);
				if (r.message) {
					page.dashboard_data = r.message;
					render_dashboard(r.message);
				}
			},
		});
	};

	function render_dashboard(data) {
		page.container.empty();

		const get_slug = (dt) => (dt || "").toLowerCase().replace(/ /g, "-");

		// KPI Cards
		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((metric) => {
			let indicator = (metric.indicator || "blue").toLowerCase();
			$(`
                <div class="summary-card ${indicator}">
                    <div class="label"><span class="indicator bg-${indicator}"></span>${metric.label}</div>
                    <div class="value">${format_million(metric.value)}</div>
                    ${metric.ledger_val ? `<div style="font-size: 10px; color: #94a3b8; margin-top: 4px;">Ledger: ${format_currency_short(metric.ledger_val)}</div>` : ""}
                </div>
            `).appendTo(summary_row);
		});

		// Chart Section
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);
		let chart_card = $(`
            <div class="chart-card">
                <div class="title">${data.chart.title}</div>
                <div id="chart_wrapper" style="height: 350px;"></div>
                <div id="chart_legend" class="custom-legend"></div>
            </div>
        `).appendTo(charts_row);

		setTimeout(() => {
			if (page.chart) page.chart.destroy();
			page.chart = new frappe.Chart("#chart_wrapper", {
				data: data.chart.data,
				type: "donut",
				height: 350,
				colors: data.chart.colors,
				lineOptions: { hideDots: 1 },
				axisOptions: { xIsSeries: 1 },
				legend: false, // Strictly disable default legend
				tooltipOptions: { formatTooltipY: (d) => format_currency_short(d) },
			});

			// Force redraw after a short delay to fix potential dimension issues on first load
			setTimeout(() => {
				if (page.chart) page.chart.draw(true);
			}, 250);

			let legend_container = chart_card.find("#chart_legend");
			legend_container.empty();
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
			});
		}, 50);

		// 1. Upcoming Payments Due Table (PRIORITY)
		let due_table_card = $(`
            <div class="table-card" style="margin-bottom: 40px;">
                <div class="header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <span style="font-weight: 700; font-size: 14px;">${__("Payment Due in Next 15 Days (Invoices)")}</span>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <div class="search-container" style="position: relative; display: inline-block;">
                            <input type="text" id="due_search" placeholder="${__("Search customer, sales person...")}" class="form-control" style="width: 220px; height: 30px; padding: 4px 10px 4px 28px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                            <i class="fa fa-search" style="position: absolute; left: 10px; top: 9px; color: #94a3b8; font-size: 12px;"></i>
                        </div>
                        <select id="due_sort" class="form-control" style="width: 170px; height: 30px; padding: 2px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #fff; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <option value="due_days_asc">${__("Days Left: Ascending")}</option>
                            <option value="due_days_desc">${__("Days Left: Descending")}</option>
                            <option value="amount_desc">${__("Amount: High to Low")}</option>
                            <option value="amount_asc">${__("Amount: Low to High")}</option>
                            <option value="name_asc">${__("Doc ID: A-Z")}</option>
                            <option value="name_desc">${__("Doc ID: Z-A")}</option>
                            <option value="posting_date_desc">${__("Date: Newest")}</option>
                            <option value="posting_date_asc">${__("Date: Oldest")}</option>
                            <option value="due_date_desc">${__("Due Date: Newest")}</option>
                            <option value="due_date_asc">${__("Due Date: Oldest")}</option>
                            <option value="customer_asc">${__("Customer: A-Z")}</option>
                            <option value="customer_desc">${__("Customer: Z-A")}</option>
                            <option value="customer_group_asc">${__("Customer Group: A-Z")}</option>
                            <option value="customer_group_desc">${__("Customer Group: Z-A")}</option>
                            <option value="sales_person_asc">${__("Sales Person: A-Z")}</option>
                            <option value="sales_person_desc">${__("Sales Person: Z-A")}</option>
                        </select>
                        <div class="export-btn" id="export_due_excel_btn" style="height: 30px; display: inline-flex; align-items: center;">
                            <i class="fa fa-file-excel-o"></i> Export Due
                        </div>
                    </div>
                </div>
                <div style="overflow: auto; width: 100%; max-height: 500px;">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="min-width: 150px; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="name">${__("Document ID")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 120px; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="posting_date">${__("Date")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 120px; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="due_date">${__("Due Date")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 100px; text-align: center; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="due_days">${__("Days Left")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 350px; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="customer">${__("Customer")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 150px; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="customer_group">${__("Customer Group")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 200px; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="sales_person">${__("Sales Person")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 150px; text-align: right; cursor: pointer; user-select: none;" class="sortable-header" data-table="due" data-field="outstanding_amount">${__("Outstanding")} <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="due_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let due_tbody = due_table_card.find("#due_table_body");

		const filter_and_render_due = () => {
			const search_val = (page.container.find("#due_search").val() || "").toLowerCase().trim();
			const sort_val = page.container.find("#due_sort").val();

			// 1. Filter
			let filtered = (data.due_results || []).filter(row => {
				const customer = (row.customer || "").toLowerCase();
				const customer_group = (row.customer_group || "").toLowerCase();
				const sales_person = (row.sales_person || "").toLowerCase();
				const doc_id = (row.name || "").toLowerCase();
				return customer.includes(search_val) || customer_group.includes(search_val) || sales_person.includes(search_val) || doc_id.includes(search_val);
			});

			// 2. Sort
			filtered.sort((a, b) => {
				if (sort_val === "due_days_asc") return flt(a.due_days) - flt(b.due_days);
				if (sort_val === "due_days_desc") return flt(b.due_days) - flt(a.due_days);
				if (sort_val === "amount_desc") return flt(b.outstanding_amount) - flt(a.outstanding_amount);
				if (sort_val === "amount_asc") return flt(a.outstanding_amount) - flt(b.outstanding_amount);
				if (sort_val === "customer_asc") return (a.customer || "").localeCompare(b.customer || "");
				if (sort_val === "customer_desc") return (b.customer || "").localeCompare(a.customer || "");
				if (sort_val === "customer_group_asc") return (a.customer_group || "").localeCompare(b.customer_group || "");
				if (sort_val === "customer_group_desc") return (b.customer_group || "").localeCompare(a.customer_group || "");
				if (sort_val === "sales_person_asc") return (a.sales_person || "").localeCompare(b.sales_person || "");
				if (sort_val === "sales_person_desc") return (b.sales_person || "").localeCompare(a.sales_person || "");
				if (sort_val === "name_asc") return (a.name || "").localeCompare(b.name || "");
				if (sort_val === "name_desc") return (b.name || "").localeCompare(a.name || "");
				if (sort_val === "posting_date_desc") return new Date(b.posting_date) - new Date(a.posting_date);
				if (sort_val === "posting_date_asc") return new Date(a.posting_date) - new Date(b.posting_date);
				if (sort_val === "due_date_desc") return new Date(b.due_date) - new Date(a.due_date);
				if (sort_val === "due_date_asc") return new Date(a.due_date) - new Date(b.due_date);
				return 0;
			});

			// 3. Render
			due_tbody.empty();
			let total_due_amt = 0;

			filtered.forEach((row) => {
				total_due_amt += flt(row.outstanding_amount);
				let link = `/app/${get_slug(row.doctype)}/${row.name}`;
				$(`
					<tr>
						<td style="white-space: nowrap;"><a href="${link}" style="font-weight: 600; color: #4338ca;">${row.name}</a> <div style="font-size: 10px; color: #94a3b8;">${row.doctype}</div></td>
						<td style="white-space: nowrap;">${row.posting_date ? frappe.datetime.str_to_user(row.posting_date) : "-"}</td>
						<td style="white-space: nowrap;">${row.due_date ? frappe.datetime.str_to_user(row.due_date) : "-"}</td>
						<td style="text-align: center;"><span class="indicator-pill ${row.due_days <= 3 ? "Export" : "Domestic"}">${row.due_days || 0}</span></td>
						<td style="white-space: normal;">${row.customer || "-"}</td>
						<td style="white-space: normal;">${row.customer_group || "-"}</td>
						<td style="white-space: nowrap;">${row.sales_person || "-"}</td>
						<td style="text-align: right; font-weight: 700;">${format_million(row.outstanding_amount)}</td>
					</tr>
				`).appendTo(due_tbody);
			});

			if (filtered.length === 0) {
				$(`<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">No matching upcoming payments due</td></tr>`).appendTo(due_tbody);
			}

			// Add Total Footer for Due Table
			due_table_card.find("tfoot").remove();
			$(`
				<tfoot>
					<tr class="sticky-total">
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td style="font-weight: 800; text-align: left; padding-left: 10px; letter-spacing: 0.03em;">TOTAL DUE</td>
						<td></td>
						<td></td>
						<td style="text-align: right; font-weight: 800; border-left: 1px solid #e2e8f0; background: #f8fafc;">${format_million(total_due_amt)}</td>
					</tr>
				</tfoot>
			`).appendTo(due_table_card.find(".dashboard-table"));
		};

		// 2. Detailed Collection Table
		let table_card = $(`
            <div class="table-card" style="margin-bottom: 40px;">
                <div class="header" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                    <span style="font-weight: 700; font-size: 14px;">${__("Detailed Collection List")}</span>
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <div class="search-container" style="position: relative; display: inline-block;">
                            <input type="text" id="collection_search" placeholder="${__("Search customer, sales person...")}" class="form-control" style="width: 220px; height: 30px; padding: 4px 10px 4px 28px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; box-shadow: inset 0 1px 2px rgba(0,0,0,0.05);">
                            <i class="fa fa-search" style="position: absolute; left: 10px; top: 9px; color: #94a3b8; font-size: 12px;"></i>
                        </div>
                        <select id="collection_sort" class="form-control" style="width: 170px; height: 30px; padding: 2px 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 6px; background-color: #fff; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
                            <option value="date_desc">${__("Date: Newest First")}</option>
                            <option value="date_asc">${__("Date: Oldest First")}</option>
                            <option value="due_date_desc">${__("Due Date: Newest")}</option>
                            <option value="due_date_asc">${__("Due Date: Oldest")}</option>
                            <option value="amount_desc">${__("Amount: High to Low")}</option>
                            <option value="amount_asc">${__("Amount: Low to High")}</option>
                           <!-- <option value="due_days_desc">${__("Days Diff: High to Low")}</option> -->
                           <!-- <option value="due_days_asc">${__("Days Diff: Low to High")}</option> -->
                            <option value="payment_entry_asc">${__("Payment ID: A-Z")}</option>
                            <option value="payment_entry_desc">${__("Payment ID: Z-A")}</option>
                            <option value="name_asc">${__("Voucher: A-Z")}</option>
                            <option value="name_desc">${__("Voucher: Z-A")}</option>
                            <option value="customer_asc">${__("Customer: A-Z")}</option>
                            <option value="customer_desc">${__("Customer: Z-A")}</option>
                            <option value="sales_person_asc">${__("Sales Person: A-Z")}</option>
                            <option value="sales_person_desc">${__("Sales Person: Z-A")}</option>
                            <option value="type_asc">${__("Type: A-Z")}</option>
                            <option value="type_desc">${__("Type: Z-A")}</option>
                        </select>
                        <div class="export-btn" id="export_excel_btn" style="height: 30px; display: inline-flex; align-items: center;">
                            <i class="fa fa-file-excel-o"></i> Export Details
                        </div>
                    </div>
                </div>
                <div style="overflow: auto; width: 100%; max-height: 800px;">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="min-width: 150px; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="payment_entry">${__("Payment ID")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 150px; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="name">${__("Voucher")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 120px; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="posting_date">${__("Date")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <!-- <th style="min-width: 120px; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="due_date">${__("Due Date")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 100px; text-align: center; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="due_days">${__("Days Diff")} <i class="fa fa-sort text-muted ml-1"></i></th> -->
                                <th style="min-width: 350px; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="customer">${__("Customer")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 150px; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="customer_group">${__("Customer Group")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 200px; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="sales_person">${__("Sales Person")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 150px; text-align: right; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="allocated_amount">${__("Amount")} <i class="fa fa-sort text-muted ml-1"></i></th>
                                <th style="min-width: 120px; text-align: center; cursor: pointer; user-select: none;" class="sortable-header" data-table="collection" data-field="type">${__("Type")} <i class="fa fa-sort text-muted ml-1"></i></th>
                            </tr>
                        </thead>
                        <tbody id="collection_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(page.container);

		let tbody = table_card.find("#collection_table_body");

		const filter_and_render_collection = () => {
			const search_val = (page.container.find("#collection_search").val() || "").toLowerCase().trim();
			const sort_val = page.container.find("#collection_sort").val();

			// 1. Filter
			let filtered = (data.results || []).filter(row => {
				const customer = (row.customer || "").toLowerCase();
				const customer_group = (row.customer_group || "").toLowerCase();
				const sales_person = (row.sales_person || "").toLowerCase();
				const payment_id = (row.payment_entry || "").toLowerCase();
				const voucher = (row.name || "").toLowerCase();
				const type_label = (row.is_export ? "Export" : "Domestic").toLowerCase();
				return customer.includes(search_val) || customer_group.includes(search_val) || sales_person.includes(search_val) || payment_id.includes(search_val) || voucher.includes(search_val) || type_label.includes(search_val);
			});

			// 2. Sort
			filtered.sort((a, b) => {
				if (sort_val === "date_desc") return new Date(b.posting_date) - new Date(a.posting_date);
				if (sort_val === "date_asc") return new Date(a.posting_date) - new Date(b.posting_date);
				if (sort_val === "due_date_desc") return new Date(b.due_date) - new Date(a.due_date);
				if (sort_val === "due_date_asc") return new Date(a.due_date) - new Date(b.due_date);
				if (sort_val === "amount_desc") return flt(b.allocated_amount) - flt(a.allocated_amount);
				if (sort_val === "amount_asc") return flt(a.allocated_amount) - flt(b.allocated_amount);
				if (sort_val === "customer_asc") return (a.customer || "").localeCompare(b.customer || "");
				if (sort_val === "customer_desc") return (b.customer || "").localeCompare(a.customer || "");
				if (sort_val === "sales_person_asc") return (a.sales_person || "").localeCompare(b.sales_person || "");
				if (sort_val === "sales_person_desc") return (b.sales_person || "").localeCompare(a.sales_person || "");
				if (sort_val === "due_days_desc") return flt(b.due_days) - flt(a.due_days);
				if (sort_val === "due_days_asc") return flt(a.due_days) - flt(b.due_days);
				if (sort_val === "payment_entry_asc") return (a.payment_entry || "").localeCompare(b.payment_entry || "");
				if (sort_val === "payment_entry_desc") return (b.payment_entry || "").localeCompare(a.payment_entry || "");
				if (sort_val === "name_asc") return (a.name || "").localeCompare(b.name || "");
				if (sort_val === "name_desc") return (b.name || "").localeCompare(a.name || "");
				if (sort_val === "type_asc") {
					let type_a = a.is_export ? "Export" : "Domestic";
					let type_b = b.is_export ? "Export" : "Domestic";
					return type_a.localeCompare(type_b);
				}
				if (sort_val === "type_desc") {
					let type_a = a.is_export ? "Export" : "Domestic";
					let type_b = b.is_export ? "Export" : "Domestic";
					return type_b.localeCompare(type_a);
				}
				return 0;
			});

			// 3. Render
			tbody.empty();
			let total_amt = 0;

			filtered.forEach((row) => {
				let type_label = row.is_export ? "Export" : "Domestic";
				total_amt += flt(row.allocated_amount);

				let voucher_link = `/app/${get_slug(row.voucher_type)}/${row.payment_entry}`;
				let ref_link = row.name ? `/app/sales-invoice/${row.name}` : "#";
				if (row.name && row.name.startsWith("SO")) ref_link = `/app/sales-order/${row.name}`;

				$(`
					<tr>
						<td style="white-space: nowrap;"><a href="${voucher_link}" style="font-weight: 600; color: #4338ca;">${row.payment_entry}</a> <div style="font-size: 10px; color: #94a3b8;">${row.voucher_type}</div></td>
						<td style="white-space: nowrap;">
							${row.name
						? `<a href="${ref_link}" style="font-weight: 500; color: #64748b;">${row.name}</a>`
						: `<span class="text-muted">-</span>`}
						</td>
						<td style="white-space: nowrap;">${row.posting_date ? frappe.datetime.str_to_user(row.posting_date) : "-"}</td>
						<!-- <td style="white-space: nowrap; color: #64748b;">${row.due_date ? frappe.datetime.str_to_user(row.due_date) : "-"}</td>
						<td style="text-align: center;"><span class="indicator-pill ${row.due_days > 0 ? "Domestic" : "Export"}">${row.due_days || 0}</span></td> -->
						<td style="white-space: normal; min-width: 250px;">${row.customer || "-"}</td>
						<td style="white-space: normal;">${row.customer_group || "-"}</td>
						<td style="white-space: nowrap;">${row.sales_person || "-"}</td>
						<td style="text-align: right; font-weight: 700; white-space: nowrap;">${format_million(row.allocated_amount)}</td>
						<td style="text-align: center;"><span class="indicator-pill ${type_label}">${__(type_label)}</span></td>
					</tr>
				`).appendTo(tbody);
			});

			if (filtered.length === 0) {
				$(`<tr><td colspan="8" class="text-center text-muted" style="padding: 20px;">No matching detailed collection entries</td></tr>`).appendTo(tbody);
			}

			// Grand Total Footer
			table_card.find("tfoot").remove();
			$(`
				<tfoot>
					<tr class="sticky-total">
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td></td>
						<td style="font-weight: 800; text-align: left; padding-left: 10px; letter-spacing: 0.03em;">GRAND TOTAL</td>
						
						<td style="text-align: right; font-weight: 800; border-left: 1px solid #e2e8f0; background: #f8fafc;">${format_million(total_amt)}</td>
						<td></td>
					</tr>
				</tfoot>
			`).appendTo(table_card.find(".dashboard-table"));
		};

		// 3. Event Listeners for search, sort and header clicks
		page.container.find("#due_search").on("input", filter_and_render_due);
		page.container.find("#due_sort").on("change", filter_and_render_due);

		page.container.find("#collection_search").on("input", filter_and_render_collection);
		page.container.find("#collection_sort").on("change", filter_and_render_collection);

		// Header clicks for real-time sort toggling
		page.container.on("click", ".sortable-header", function () {
			const table_type = $(this).data("table");
			const field = $(this).data("field");
			const current_asc = $(this).hasClass("sorted-asc");

			// Reset other headers' sort classes and icons
			page.container.find(`.sortable-header[data-table="${table_type}"]`).removeClass("sorted-asc sorted-desc");
			page.container.find(`.sortable-header[data-table="${table_type}"] i`).removeClass("fa-sort-asc fa-sort-desc").addClass("fa-sort text-muted");

			let new_sort_val = "";
			if (table_type === "due") {
				if (field === "due_days") new_sort_val = current_asc ? "due_days_desc" : "due_days_asc";
				else if (field === "outstanding_amount") new_sort_val = current_asc ? "amount_desc" : "amount_asc";
				else if (field === "customer") new_sort_val = current_asc ? "customer_desc" : "customer_asc";
				else if (field === "customer_group") new_sort_val = current_asc ? "customer_group_desc" : "customer_group_asc";
				else if (field === "sales_person") new_sort_val = current_asc ? "sales_person_desc" : "sales_person_asc";
				else if (field === "name") new_sort_val = current_asc ? "name_desc" : "name_asc";
				else if (field === "posting_date") new_sort_val = current_asc ? "posting_date_desc" : "posting_date_asc";
				else if (field === "due_date") new_sort_val = current_asc ? "due_date_desc" : "due_date_asc";
				else new_sort_val = current_asc ? `${field}_desc` : `${field}_asc`;

				page.container.find("#due_sort").val(new_sort_val);
				filter_and_render_due();
			} else {
				if (field === "posting_date") new_sort_val = current_asc ? "date_desc" : "date_asc";
				else if (field === "allocated_amount") new_sort_val = current_asc ? "amount_desc" : "amount_asc";
				else if (field === "customer") new_sort_val = current_asc ? "customer_desc" : "customer_asc";
				else if (field === "customer_group") new_sort_val = current_asc ? "customer_group_desc" : "customer_group_asc";
				else if (field === "sales_person") new_sort_val = current_asc ? "sales_person_desc" : "sales_person_asc";
				else if (field === "due_days") new_sort_val = current_asc ? "due_days_desc" : "due_days_asc";
				else if (field === "due_date") new_sort_val = current_asc ? "due_date_desc" : "due_date_asc";
				else if (field === "payment_entry") new_sort_val = current_asc ? "payment_entry_desc" : "payment_entry_asc";
				else if (field === "name") new_sort_val = current_asc ? "name_desc" : "name_asc";
				else if (field === "type") new_sort_val = current_asc ? "type_desc" : "type_asc";
				else new_sort_val = current_asc ? `${field}_desc` : `${field}_asc`;

				page.container.find("#collection_sort").val(new_sort_val);
				filter_and_render_collection();
			}

			// Add active class and update icon
			if (new_sort_val.endsWith("asc")) {
				$(this).addClass("sorted-asc");
				$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-asc");
			} else {
				$(this).addClass("sorted-desc");
				$(this).find("i").removeClass("fa-sort text-muted").addClass("fa-sort-desc");
			}
		});

		// Initial Renders
		filter_and_render_due();
		filter_and_render_collection();

		table_card.find("#export_excel_btn").click(() => export_to_excel("detail"));
		due_table_card.find("#export_due_excel_btn").click(() => export_to_excel("due"));
	}

	// --- 3. INITIALIZE FILTERS AND ACTIONS ---
	const filter_fields = [
		{
			fieldname: "fiscal_year",
			label: __("Fiscal Year"),
			fieldtype: "Link",
			options: "Fiscal Year",
			placeholder: __("Select Year"),
		},
		{
			fieldname: "from_date",
			label: __("From Date"),
			fieldtype: "Date",
			placeholder: __("Start Date"),
		},
		{
			fieldname: "to_date",
			label: __("To Date"),
			fieldtype: "Date",
			placeholder: __("End Date"),
		},
		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
			placeholder: __("Select Group"),
		},
		{
			fieldname: "customer",
			label: __("Customer"),
			fieldtype: "Link",
			options: "Customer",
			placeholder: __("Select Customer"),
		},
		{
			fieldname: "sales_person",
			label: __("Sales Person"),
			fieldtype: "Link",
			options: "Sales Person",
			placeholder: __("Select Sales Person"),
		},
		{
			fieldname: "business_region_name",
			label: __("Business Region"),
			fieldtype: "Select",
			options: ["All"],
			default: "All",
			placeholder: __("Select Region"),
		},
		{
			fieldname: "dom_exp",
			label: __("Domestic/Export"),
			fieldtype: "Select",
			options: ["All", "Domestic", "Export"],
			default: "All",
			placeholder: __("Select"),
		},
	];

	// Initialize filters
	setTimeout(() => {
		page.filter_group = new frappe.ui.FieldGroup({
			parent: filter_parent,
			fields: filter_fields,
		});
		page.filter_group.make();

		// Dependent Filter: Customer Group -> Customer
		page.filter_group.fields_dict.customer.get_query = function () {
			let group = page.filter_group.get_values().customer_group;
			if (group) {
				return { filters: { customer_group: group } };
			}
		};

		// Populate Business Region options dynamically from Business Region Code doctype
		frappe.call({
			method: "frappe.client.get_list",
			args: {
				doctype: "Business Region Code",
				fields: ["business_region_name"],
				filters: [["Business Region Code", "enable", "=", 1]],
				order_by: "business_region_name asc",
				limit_page_length: 500,
			},
			callback: function (r) {
				if (r.message) {
					const names = [...new Set(r.message.map((x) => x.business_region_name))].filter(Boolean).sort();
					page.filter_group.set_df_property("business_region_name", "options", ["All", ...names]);
				}
			},
		});

		setup_filter_events();

		renu_customization.dashboard_fiscal_year.init(page, { refresh_delay: 300 });
	}, 100);

	function setup_filter_events() {
		Object.keys(page.filter_group.fields_dict).forEach((key) => {
			let field = page.filter_group.fields_dict[key];

			const trigger_refresh = () => {
				if (key === "customer_group") {
					page.filter_group.set_value("customer", "");
				}
				page.refresh();
			};

			// Comprehensive event binding
			field.df.on_change = trigger_refresh;
			field.on_change = trigger_refresh;

			if (field.$input) {
				field.$input.on("change input blur", () => {
					setTimeout(() => trigger_refresh(), 100);
				});
			}
		});
	}

	page.set_primary_action(__("Refresh"), () => page.refresh());
	page.add_menu_item(__("Export to PDF"), () => export_pdf());
	page.add_menu_item(__("Export to Excel"), () => export_to_excel("all"));

	// --- 4. EXPORT FUNCTIONS ---
	const export_to_excel = (export_type = "all") => {
		const filters = page.filter_group.get_values();
		frappe.show_alert({ message: __("Generating Excel Report..."), indicator: "blue" });
		frappe.call({
			method: "renu_customization.renu_customization.page.collection_dashboard.collection_dashboard.export_to_excel",
			args: { filters: filters, export_type: export_type },
			callback: function (r) {
				if (r.message) {
					const { filename, filecontent } = r.message;
					const byteCharacters = atob(filecontent);
					const byteNumbers = new Array(byteCharacters.length);
					for (let i = 0; i < byteCharacters.length; i++)
						byteNumbers[i] = byteCharacters.charCodeAt(i);
					const blob = new Blob([new Uint8Array(byteNumbers)], {
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
		frappe.show_alert({ message: __("Preparing PDF..."), indicator: "blue" });

		const data = page.dashboard_data;
		const report_date = frappe.datetime.now_datetime();
		const filters = page.filter_group.get_values();
		let period = "All Time";
		if (filters.from_date && filters.to_date) {
			period = `${frappe.datetime.str_to_user(filters.from_date)} to ${frappe.datetime.str_to_user(filters.to_date)}`;
		}

		// Standard Chart Capture Logic
		const get_chart_image = (wrapper_id) => {
			const chart_svg = document.querySelector(`#${wrapper_id} svg`);
			if (!chart_svg) return null;

			const clone = chart_svg.cloneNode(true);
			const internal_legend = clone.querySelector(
				".chart-legend, .legend, .frappe-chart-legend",
			);
			if (internal_legend) internal_legend.style.display = "none";

			return new Promise((resolve) => {
				const canvas = document.createElement("canvas");
				const svg_data = new XMLSerializer().serializeToString(clone);
				const img = new Image();

				img.onload = () => {
					canvas.width = img.width * 2;
					canvas.height = img.height * 2;
					const ctx = canvas.getContext("2d");
					ctx.fillStyle = "white";
					ctx.fillRect(0, 0, canvas.width, canvas.height);
					ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
					resolve(canvas.toDataURL("image/png"));
				};
				img.src =
					"data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg_data)));
			});
		};

		// Helper for Chart Legend in PDF
		const chart_l = (chart_obj) => {
			if (!chart_obj || !chart_obj.data.labels.length) return "";
			const total_val = chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0) || 1;

			let legend_html = '<div class="pdf-legend">';
			chart_obj.data.labels.forEach((l, i) => {
				const val = chart_obj.data.datasets[0].values[i];
				const color = chart_obj.colors[i % chart_obj.colors.length];
				const share = ((val / total_val) * 100).toFixed(1);
				legend_html += `
					<div class="pdf-legend-item">
						<span class="pdf-dot" style="background: ${color}"></span>
						<div class="pdf-legend-info">
							<div class="pdf-legend-label">${l}</div>
							<div class="pdf-legend-val">${format_currency_short(val)} (${share}%)</div>
						</div>
					</div>
				`;
			});
			legend_html += "</div>";
			return legend_html;
		};

		const chart_png = await get_chart_image("chart_wrapper");

		const html = `
			<html>
			<head>
				<style>
					body { font-family: 'Inter', sans-serif; padding: 15px; color: #1e293b; background: #fff; line-height: 1.4; font-size: 10px; }
					@page { size: landscape; margin: 8mm; }

					.report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 15px; margin-bottom: 20px; }
					.header-title { margin: 0; font-size: 22px; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }

					.kpi-wrapper { width: 100%; clear: both; margin-bottom: 20px; display: block; overflow: hidden; }
					.kpi-card { float: left; width: 23.5%; border: 1px solid #e2e8f0; padding: 12px 6px; margin: 0.5%; border-radius: 8px; background: #f8fafc; text-align: center; border-left: 4px solid #3b82f6; box-sizing: border-box; }
					.kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 4px; }
					.kpi-value { font-size: 14px; font-weight: 800; color: #0f172a; }

					.pdf-card { background: #fff; border: 1px solid #e2e8f0; border-radius: 10px; padding: 15px; margin-bottom: 20px; page-break-inside: avoid; }
					.card-title { margin: 0 0 12px 0; font-size: 12px; font-weight: 700; color: #475569; text-transform: uppercase; text-align: center; border-bottom: 1px solid #f1f5f9; padding-bottom: 8px; }

					.chart-content { text-align: center; }
					.chart-img { width: 60%; max-height: 280px; object-fit: contain; margin-bottom: 15px; }

					.pdf-legend { display: block; text-align: left; padding: 12px; background: #f8fafc; border-radius: 8px; border: 1px solid #f1f5f9; margin-top: 10px; overflow: hidden; }
					.pdf-legend-item { display: inline-block; width: 31%; margin-bottom: 8px; vertical-align: top; margin-right: 2%; }
					.pdf-dot { display: inline-block; width: 8px; height: 8px; border-radius: 2px; margin-right: 6px; vertical-align: middle; }
					.pdf-legend-info { display: inline-block; vertical-align: middle; width: calc(100% - 20px); }
					.pdf-legend-label { font-size: 9px; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
					.pdf-legend-val { font-size: 8px; color: #64748b; }

					table { width: 100%; border-collapse: collapse; font-size: 9px; border: 1px solid #e2e8f0; }
					th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; }
					thead th { background: #f1f5f9 !important; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #3b82f6; }
					.text-right { text-align: right; }
					.text-center { text-align: center; }
					.bold { font-weight: 700; }

					.section-title { font-size: 13px; font-weight: 700; color: #3b82f6; margin-top: 25px; margin-bottom: 10px; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; text-transform: uppercase; }
					.page-break { page-break-after: always; }
				</style>
			</head>
			<body>
				<div class="report-header">
					<h1 class="header-title">Collection Dashboard</h1>
					<p style="font-size: 11px; color: #64748b; margin: 4px 0;">Period: ${period}</p>
					<p style="font-size: 9px; color: #94a3b8; margin: 0;">Generated: ${report_date}</p>
				</div>

				<div class="kpi-wrapper">
					${data.summary
				.map(
					(m) => `
						<div class="kpi-card" style="border-left-color: ${m.indicator === "green" ? "#10b981" : m.indicator === "orange" ? "#f59e0b" : m.indicator === "red" ? "#ef4444" : m.indicator === "purple" ? "#8b5cf6" : m.indicator === "grey" ? "#94a3b8" : m.indicator === "cyan" ? "#06b6d4" : "#3b82f6"}">
							<div class="kpi-label">${m.label}</div>
							<div class="kpi-value">${format_million(m.value)}</div>
						</div>
					`,
				)
				.join("")}
				</div>

				<div class="pdf-card chart-section">
					<h4 class="card-title">Collection Breakdown</h4>
					<div class="chart-content">
						<img src="${chart_png}" class="chart-img">
						${chart_l(data.chart)}
					</div>
				</div>


				${data.due_results && data.due_results.length > 0
				? `
					<div class="page-break"></div>
					<h3 class="section-title" style="color: #ef4444; border-bottom-color: #ef4444;">Upcoming Payments Due (Next 15 Days)</h3>
					<table>
						<thead>
							<tr>
								<th width="15%">Invoice ID</th>
								<th width="25%">Customer</th>
								<th width="15%">Sales Person</th>
								<th width="12%">Posting Date</th>
								<th width="12%">Due Date</th>
								<th width="8%" class="text-center">Days</th>
								<th width="13%" class="text-right">Outstanding (M)</th>
							</tr>
						</thead>
						<tbody>
							${data.due_results
					.map(
						(row) => `
								<tr>
									<td class="bold">${row.name}</td>
									<td>${row.customer}</td>
									<td>${row.sales_person || "-"}</td>
									<td>${frappe.datetime.str_to_user(row.posting_date)}</td>
									<td style="color: #ef4444; font-weight: bold;">${frappe.datetime.str_to_user(row.due_date)}</td>
									<td class="text-center">${row.due_days}</td>
									<td class="text-right bold" style="color: #ef4444;">${format_million(row.outstanding_amount)}</td>
								</tr>
							`,
					)
					.join("")}
						</tbody>
						<tfoot>
							<tr style="background: #fef2f2; font-weight: bold; color: #ef4444;">
								<td colspan="6" class="text-right">TOTAL OUTSTANDING</td>
								<td class="text-right">${format_million(data.due_results.reduce((a, b) => a + flt(b.outstanding_amount), 0))}</td>
							</tr>
						</tfoot>
					</table>
				`
				: ""
			}

				<div class="page-break"></div>
				<h3 class="section-title">Detailed Collection List</h3>
				<table>
					<thead>
						<tr>
							<th width="15%">Payment ID</th>
							<th width="15%">Voucher</th>
							<th width="10%">Date</th>
							<th width="10%">Due Date</th>
							<th width="8%" class="text-center">Diff</th>
							<th width="18%">Customer</th>
							<th width="12%">Sales Person</th>
							<th width="12%" class="text-right">Amount (M)</th>
						</tr>
					</thead>
					<tbody>
						${data.results
				.map(
					(row) => `
							<tr>
								<td class="bold">${row.payment_entry}</td>
								<td style="color: #64748b;">${row.name}</td>
								<td>${frappe.datetime.str_to_user(row.posting_date)}</td>
								<td>${row.due_date ? frappe.datetime.str_to_user(row.due_date) : "-"}</td>
								<td class="text-center ${row.due_days > 0 ? "bold" : ""}" style="${row.due_days > 0 ? "color: #ef4444;" : ""}">${row.due_days || 0}</td>
								<td>${row.customer}</td>
								<td>${row.sales_person || "-"}</td>
								<td class="text-right bold">${format_million(row.allocated_amount)}</td>
							</tr>
						`,
				)
				.join("")}
					</tbody>
					<tfoot>
						<tr style="background: #f8fafc; font-weight: bold;">
							<td colspan="6" class="text-right">GRAND TOTAL</td>
							<td colspan="2" class="text-right">${format_million(data.results.reduce((a, b) => a + flt(b.allocated_amount), 0))}</td>
						</tr>
					</tfoot>
				</table>

				<div style="margin-top: 30px; font-size: 8px; color: #94a3b8; text-align: center;">
					Printed on: ${frappe.datetime.now_datetime()} | renu_customization - Collection Analysis Report
				</div>
			</body></html>
		`;

		const $form = $(
			`<form action="/api/method/renu_customization.renu_customization.page.collection_dashboard.collection_dashboard.export_to_pdf" method="POST" target="_blank" style="display:none;"><input type="hidden" name="html" value=""><input type="hidden" name="csrf_token" value="${frappe.csrf_token}"></form>`,
		).appendTo("body");
		$form.find('input[name="html"]').val(html);
		$form.submit();
		$form.remove();
	};
};
