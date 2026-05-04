frappe.pages["sales_revenue_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Sales Revenue Dashboard (Million INR)"),
		single_column: true,
	});

	page.set_primary_action(__("Refresh"), () => page.refresh());

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
		{
			label: __("Customer"),
			placeholder: __("Select Customer"),
			fieldname: "customer",
			fieldtype: "Link",
			options: "Customer",
		},
		{
			fieldname: "customer_group",
			label: __("Customer Group"),
			placeholder: __("Select Customer Group"),
			fieldtype: "Link",
			options: "Customer Group",
		},
		{
			label: __("Product (Item)"),
			placeholder: __("Select Product"),
			fieldname: "item_code",
			fieldtype: "Link",
			options: "Item",
		},

		{
			fieldname: "item_group",
			label: __("Product Group"),
			placeholder: __("Select Product Group"),
			fieldtype: "Link",
			options: "Item Group",
		},

		{
			label: __("Sales Person"),
			placeholder: __("Select Sales Person"),
			fieldname: "sales_person",
			fieldtype: "Link",
			options: "Sales Person",
		},
		{
			fieldname: "territory",
			label: __("Territory"),
			placeholder: __("Select Territory"),
			fieldtype: "Link",
			options: "Territory",
		},

		{
			fieldname: "dom_exp",
			label: __("Type"),
			placeholder: __("Select Type"),
			fieldtype: "Select",
			options: ["", "Domestic", "Export"],
		},

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

        @media print {
            /* 1. Global Reset & Orientation */
            @page { size: landscape; margin: 5mm; }
            * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
            body { background: #fff !important; margin: 0 !important; padding: 0 !important; font-family: Inter, sans-serif !important; width: 100% !important; }
            
            /* 2. Hide Dashboard UI Elements & Menu Overlap */
            .dashboard-filter-area, .page-head, .refresh-btn, .btn, .chart-actions, .table-actions, 
            .pill-status, .indicator-pill.red, .reset-btn, .no-print, .table-filters, .export-btn, #table_export_btn,
            .frappe-control, .card-header .d-flex, .menu-btn-group, .page-actions-menu, .standard-actions, 
            .btn-group, [data-label="Menu"] { display: none !important; }
            
            /* 3. Container Unwrapping */
            html, body, .page-container, .layout-main-section, .layout-main, .dashboard-content, .table-card, .table-container { 
                height: auto !important; 
                overflow: visible !important; 
                display: block !important; 
                max-height: none !important;
                max-width: none !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 0 !important;
                box-shadow: none !important;
            }

            /* 4. KPI Cards */
            .summary-wrapper { display: flex !important; flex-wrap: nowrap !important; gap: 8px !important; margin: 10px 0 25px 0 !important; width: 100% !important; }
            .summary-card { flex: 1 !important; border: 1px solid #ddd !important; padding: 10px !important; border-radius: 4px !important; page-break-inside: avoid !important; }

            /* 5. Chart Preservation */
            .chart-card { border: 1px solid #eee !important; margin-bottom: 25px !important; padding: 10px !important; page-break-inside: avoid !important; }
            .frappe-chart, .frappe-chart svg { width: 100% !important; height: auto !important; overflow: visible !important; }

            /* 6. TABLE OPTIMIZATION - No Truncation */
            .table-card { border: none !important; margin-bottom: 30px !important; width: 100% !important; }
            .card-header { display: block !important; border-bottom: 1.5pt solid #000 !important; margin-bottom: 8px !important; padding: 5px 0 !important; }
            .card-header h6 { font-size: 14pt !important; font-weight: bold !important; color: #000 !important; margin: 0 !important; }

            .dashboard-table { 
                width: 100% !important; 
                border: 0.5pt solid #000 !important; 
                border-collapse: collapse !important; 
                table-layout: auto !important;
                margin: 0 !important;
            }
            
            /* Scaling to fit all columns in Landscape */
            .table-container { overflow: visible !important; }
            .dashboard-table { 
                table-layout: fixed !important;
                width: 100% !important;
                zoom: 0.8; 
            }
            
            .dashboard-table th, .dashboard-table td { 
                border: 0.5pt solid #000 !important; 
                padding: 2pt 4pt !important; 
                font-size: 7.5pt !important; 
                color: #000 !important;
                word-wrap: break-word !important;
                overflow-wrap: break-word !important;
                white-space: normal !important;
                vertical-align: top !important;
            }
            
            /* Column Widths to ensure fit in Landscape */
            .dashboard-table th:nth-child(1), .dashboard-table td:nth-child(1) { width: 40px !important; } /* S.No. */
            .dashboard-table th:nth-child(2), .dashboard-table td:nth-child(2) { width: 14% !important; } /* Customer */
            .dashboard-table th:nth-child(3), .dashboard-table td:nth-child(3) { width: 11% !important; } /* Sales Person */
            .dashboard-table th:nth-child(4), .dashboard-table td:nth-child(4) { width: 18% !important; } /* Product */
            
            /* The remaining columns (Months + Totals) will automatically share the rest of the space */
            
            .dashboard-table th { background-color: #f8f8f8 !important; font-weight: bold !important; position: static !important; }
            .total-col, .sticky-total, .sticky-total-header { background: #fff !important; position: static !important; font-weight: bold !important; }
            .month-col, .total-col { text-align: right !important; }
        }

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
            background: #fff;
            border-bottom-left-radius: 8px;
            border-bottom-right-radius: 8px;
            z-index: 2;
        }
        .table-container.month-revenue-container { max-height: 650px; }
        .table-container.invoice-list-container { max-height: 800px; }
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
            font-weight: 600;
        }
        .dashboard-table td { 
            padding: 10px 12px; 
            border-top: 1px solid var(--border-color); 
            font-size: 12px; 
            background: #fff;
            color: #333;
            line-height: 1.2;
            vertical-align: middle;
        }
        .month-col { text-align: right !important; min-width: 110px; width: 110px; white-space: nowrap !important; }
        .total-col { 
            text-align: right !important; 
            font-weight: 700; 
            min-width: 150px; 
            background: #fff !important; 
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
        .dashboard-table tr:hover td { background: #f8faff; }
        
        /* Special Gross Column Styling */
        .gross-col { 
            background: #f8faff !important; 
            color: #4338ca !important; 
        }
        .dashboard-table th.gross-col { 
            background: #eef2ff !important; 
            color: #4338ca !important; 
        }

        /* Enhanced Sticky Total Footer */
        tr.sticky-total td { 
            position: sticky; 
            background: #f8fafc !important; 
            font-weight: 700; 
            border-top: 1.5px solid #cbd5e1; 
            color: #1e293b;
            box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
            z-index: 20;
        }

        /* Logic for stacking multiple sticky footer rows (e.g. Month-Wise Revenue table) */
        /* The row above the last one */
        tr.sticky-total:nth-last-child(2) td { 
            bottom: 37px; 
            z-index: 21;
            border-bottom: 1px solid #e2e8f0;
        }
        
        /* The very last row */
        tr.sticky-total:last-child td { 
            bottom: 0; 
            z-index: 22;
        }

        /* Ensure right-sticky total columns maintain their horizontal position while being vertically sticky */
        tr.sticky-total td.total-col { 
            z-index: 25 !important; 
        }
        
        /* Fixed Column Offsets for the two total columns */
        .net-total-col { right: 130px !important; }
        .gross-total-col { right: 0 !important; }
        
        .sticky-total-header { 
            position: sticky !important; 
            right: 0; 
            background: #f1f3f5 !important; 
            z-index: 6 !important; 
            border-left: 1px solid #dee2e6; 
            color: #333 !important;
        }
        
        
        /* Sticky Primary Columns for Consolidated Table */
        #consolidated_table th:nth-child(1), #consolidated_table td:nth-child(1) { position: sticky; left: 0; z-index: 3; background: #fff !important; }
        #consolidated_table th:nth-child(2), #consolidated_table td:nth-child(2) { position: sticky; left: 40px; z-index: 3; background: #fff !important; }
        
        #consolidated_table th:nth-child(1), #consolidated_table th:nth-child(2) { z-index: 6; background: #f1f3f5 !important; }
        #consolidated_table td:nth-child(1), #consolidated_table td:nth-child(2) { border-right: 1px solid #eee; }
        #consolidated_table tr:hover td:nth-child(1), #consolidated_table tr:hover td:nth-child(2) { background: #f8faff !important; }

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
        .month-col { min-width: 90px !important; width: 90px !important; text-align: right !important; white-space: nowrap; }
        .total-col { min-width: 130px !important; width: 130px !important; text-align: right !important; font-weight: 700; color: var(--primary); white-space: nowrap; }
        /* Base table cell padding and font adjustments */
        .dashboard-table th, .dashboard-table td { padding: 8px 10px; }
        .dashboard-table th:first-child, .dashboard-table td:first-child { min-width: 40px !important; width: 40px !important; text-align: center !important; }
        
        /* Specific widths for primary info columns in Month Table */
        #consolidated_table th:nth-child(2), #consolidated_table td:nth-child(2) { min-width: 180px !important; width: 180px !important; } /* Customer */
        #consolidated_table th:nth-child(3), #consolidated_table td:nth-child(3) { min-width: 130px !important; width: 130px !important; } /* Sales Person */
        #consolidated_table th:nth-child(4), #consolidated_table td:nth-child(4) { min-width: 220px !important; width: 220px !important; } /* Product */

        /* Specific widths for Sales Invoice Table */
        .invoice-list-container th:nth-child(2), .invoice-list-container td:nth-child(2) { min-width: 120px !important; } /* Invoice ID */
        .invoice-list-container th:nth-child(7), .invoice-list-container td:nth-child(7) { min-width: 180px !important; } /* Customer */
        .invoice-list-container th:nth-child(8), .invoice-list-container td:nth-child(8) { min-width: 180px !important; } /* Item */
        .invoice-list-container th:nth-child(9), .invoice-list-container td:nth-child(9) { min-width: 130px !important; } /* Sales Person */

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
			data.summary.forEach((metric, idx) => {
				let indicator = (metric.indicator || "blue").toLowerCase();
				let card = $(`
                    <div class="summary-card ${indicator}" id="summary_card_${idx}">
                        <div class="label"><span class="indicator bg-${indicator}"></span>${metric.label}</div>
                        <div class="value">${format_currency_short(metric.value, metric.fieldtype)}</div>
                    </div>
                `).appendTo(summary_row);
			});
		}

		function format_currency_short(num, fieldtype) {
			if (!num && num !== 0) return "₹ 0.0000 M";
			if (fieldtype === "Int") return num;

			// Value is already in Million INR from backend
			let value = flt(num);

			return (
				"₹ " +
				value.toLocaleString("en-US", {
					minimumFractionDigits: 4,
					maximumFractionDigits: 4,
				}) +
				" M"
			);
		}

		// 2. Charts Row
		let charts_row = $('<div class="charts-row"></div>').appendTo(page.container);

		// Render each chart object provided by the standard controller
		const chart_config = {
			top_10_salesperson: { field: "sales_person", title: "Salesperson" },
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
                    <div id="wrapper_${chart_id}" style="height: 350px;"></div>
                    <div id="legend_${chart_id}" class="custom-legend"></div>
                </div>
            `).appendTo(charts_row);

			page.chart_instances = page.chart_instances || {};
			setTimeout(() => {
				try {
					page.chart_instances[chart_id] = new frappe.Chart(`#wrapper_${chart_id}`, {
						data: chart_obj.data,
						type: chart_obj.type || "donut",
						height: 350,
						colors: chart_obj.colors,
						regionFill: 1,
						legend: 0,
						show_legend: 0,
						legendOptions: { showLegend: false },
						valuesOverPoints: 1,
						onClick: (event) => {
							if (event.label) {
								page.filter_group.set_value(config.field, event.label);
								page.refresh();
							}
						},
						tooltipOptions: {
							formatTooltipY: (d) => format_currency_short(d),
						},
					});

					// Render Custom Legend
					let legend_container = page.container.find(`#legend_${chart_id}`);
					let total_val = chart_obj.data.datasets[0].values.reduce((a, b) => a + b, 0);

					chart_obj.data.labels.forEach((label, idx) => {
						let val = chart_obj.data.datasets[0].values[idx];
						let color = chart_obj.colors[idx % chart_obj.colors.length];
						let share =
							total_val > 0 ? ((val / total_val) * 100).toFixed(1) + "%" : "0%";

						// Clean double names (e.g. "John Doe - John Doe")
						let display_label = label;
						if (label && label.includes(" - ")) {
							let parts = label.split(" - ");
							if (parts[0] === parts[1]) display_label = parts[0];
						}

						legend_container.append(`
                                <div class="legend-item" style="cursor: pointer;" onclick="frappe.pages['sales_revenue_dashboard'].on_legend_click('${config.field}', '${label.replace(/'/g, "\\'")}')">
                                    <span class="dot" style="background: ${color}"></span>
                                    <div class="info">
                                        <span class="label">${display_label}</span>
                                        <span class="val">${format_currency_short(val)} (${share})</span>
                                    </div>
                                </div>
                            `);
					});
				} catch (e) {
					console.error("Error rendering chart " + chart_id, e);
				}
			}, 100);
		});

		// Add legend click handler
		frappe.pages["sales_revenue_dashboard"].on_legend_click = function (field, value) {
			page.filter_group.set_value(field, value);
			page.refresh();
		};

		// 2.5 Table Section
		let tables_row = $(
			'<div class="charts-row" style="margin-top: 24px; display: block; width: 100%;"></div>',
		).appendTo(page.container);

		// Pre-calculate stable months across all results for consistent columns
		let all_months_map = {};
		let months = [];
		data.results.forEach((row) => {
			let date = row.delivery_date || row.invoice_date || row.posting_date;
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
                        <div class="d-flex" style="gap: 8px; align-self: center; margin-left: 10px;">
                            <span class="export-btn" id="export_month_table" title="Export this table to Excel">
                                <i class="fa fa-file-excel-o"></i>Export to Excel
                            </span>
                        </div>
                    </div>
                </div>
                <div class="table-container month-revenue-container">
                    <table class="dashboard-table" id="consolidated_table">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">S.No.</th>
                                <th style="min-width: 180px;">Customer</th>
                                <th style="min-width: 130px;">Sales Person</th>
                                <th style="min-width: 220px;">Product</th>
                                ${months.map((m) => `<th class="month-col">${m.key}</th>`).join("")}
                                <th class="total-col sticky-total-header net-total-col">Total (Net)</th>
                                <th class="total-col sticky-total-header gross-total-col gross-col">Grand Total (Gross)</th>
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
                        <span class="export-btn" id="export_invoice_table" title="Export this table to Excel">
                            <i class="fa fa-file-excel-o"></i>Export to Excel
                        </span>
                    </div>
                </div>
                <div class="table-container invoice-list-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th style="width: 40px; text-align: center;">S.No.</th>
                                <th style="min-width: 120px;">Invoice ID</th>
                                <th style="min-width: 110px;">Date</th>
                                <th style="min-width: 100px;">Type</th>
                                <th style="min-width: 120px;">Invoice Type</th>
                                <th style="min-width: 110px;">Status</th>
                                <th style="min-width: 180px;">Customer</th>
                                <th style="min-width: 150px;">Item</th>
                                <th style="min-width: 130px;">Sales Person</th>
                                <th style="text-align: right; min-width: 80px;">Qty</th>
                                <th style="text-align: right; min-width: 130px; border-right: none;">Amount (Net)</th>
                            </tr>
                        </thead>
                        <tbody id="invoice_table_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_row);

		const update_summary_cards = (results) => {
			let t_rev = 0,
				g_rev = 0,
				d_rev = 0,
				e_rev = 0,
				c_rev = 0;

			results.forEach((row) => {
				let amt = flt(row.amt_allocated || 0);
				let gross_amt = flt(row.gross_amount || amt);

				t_rev += amt;
				g_rev += gross_amt;
				if (row.dom_exp === "Domestic") d_rev += amt;
				if (row.dom_exp === "Export") e_rev += amt;
				if (row.is_channel_partner) c_rev += amt;
			});

			page.container.find("#summary_card_0 .value").text(format_currency_short(t_rev));
			page.container.find("#summary_card_1 .value").text(format_currency_short(g_rev));
			page.container.find("#summary_card_2 .value").text(format_currency_short(d_rev));
			page.container.find("#summary_card_3 .value").text(format_currency_short(e_rev));
			page.container.find("#summary_card_4 .value").text(format_currency_short(c_rev));
		};

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
				let amt = flt(row.amt_allocated || 0);
				let gross_amt = flt(row.gross_amount || amt);

				let date = row.delivery_date || row.invoice_date || row.posting_date;
				let month_key = moment(date).format("MMM YYYY");

				let row_key = sp + "|" + cust + "|" + prod;
				if (!merged_data[row_key]) {
					merged_data[row_key] = {
						sp,
						cust,
						prod,
						prod_name,
						months: {},
						total: 0,
						total_gross: 0,
					};
				}
				merged_data[row_key].months[month_key] =
					(merged_data[row_key].months[month_key] || 0) + amt;
				merged_data[row_key].total += amt;
				merged_data[row_key].total_gross += gross_amt;
			});

			let summary_list = Object.values(merged_data).sort((a, b) => b.total - a.total);
			let total_month_amts = {};
			let total_month_gross_amts = {};
			let grand_total_net = 0;
			let grand_total_gross = 0;

			// Calculate totals across ALL rows before slicing for rendering
			summary_list.forEach((row) => {
				grand_total_net += row.total;
				grand_total_gross += row.total_gross;
				months.forEach((m) => {
					total_month_amts[m.key] =
						(total_month_amts[m.key] || 0) + (row.months[m.key] || 0);

					// Proportionally estimate gross for the month
					// Since we don't store month-wise gross in merged_data, we calculate it here
				});
			});

			// We need to group gross amounts by month too for the footer
			results.forEach((row) => {
				let date = row.delivery_date || row.invoice_date || row.posting_date;
				let m_key = moment(date).format("MMM YYYY");
				let amt = flt(row.amt_allocated || 0);
				let gross_amt = flt(row.gross_amount || amt);

				total_month_gross_amts[m_key] = (total_month_gross_amts[m_key] || 0) + gross_amt;
			});

			// Update Summary Cards at the top
			update_summary_cards(results);

			if (summary_list.length === 0) {
				tbody_summary.append(
					`<tr><td colspan="${6 + months.length}" class="text-center text-muted" style="padding: 20px;">No data matching filters</td></tr>`,
				);
			} else {
				summary_list.slice(0, 100).forEach((row, idx) => {
					let month_cells = months
						.map((m) => {
							let val = row.months[m.key] || 0;
							return `<td class="month-col">${format_currency_short(val)}</td>`;
						})
						.join("");

					tbody_summary.append(`
                        <tr>
                            <td style="text-align: center;">${idx + 1}</td>
                            <td><div title="${row.cust}">${row.cust}</div></td>
                            <td><div title="${row.sp}">${row.sp}</div></td>
                            <td>
                                <div title="${row.prod}: ${row.prod_name}">
                                    <span class="text-muted" style="font-size: 10px;">${row.prod}</span><br>${row.prod_name}
                                </div>
                            </td>
                            ${month_cells}
                            <td class="total-col net-total-col">${format_currency_short(row.total)}</td>
                            <td class="total-col gross-total-col gross-col">${format_currency_short(row.total_gross)}</td>
                        </tr>
                    `);
				});

				let footer_cells_net = months
					.map(
						(m) =>
							`<td class="month-col" style="font-weight: 700;">${format_currency_short(total_month_amts[m.key] || 0)}</td>`,
					)
					.join("");

				let footer_cells_gross = months
					.map(
						(m) =>
							`<td class="month-col" style="font-weight: 700; background: #f8faff !important;">${format_currency_short(total_month_gross_amts[m.key] || 0)}</td>`,
					)
					.join("");

				tbody_summary.append(`
                    <tr class="sticky-total">
                        <td colspan="4" style="text-align: right; font-weight: 700;">Grand Total (Net)</td>
                        ${footer_cells_net}
                        <td class="total-col net-total-col">${format_currency_short(grand_total_net)}</td>
                        <td class="total-col gross-total-col gross-col" style="background: #e9ecef !important; opacity: 0.5;">-</td>
                    </tr>
                    <tr class="sticky-total">
                        <td colspan="4" style="text-align: right; font-weight: 800; color: #4338ca;">Grand Total (Gross)</td>
                        ${footer_cells_gross}
                        <td class="total-col net-total-col" style="background: #e9ecef !important; opacity: 0.5;">-</td>
                        <td class="total-col gross-total-col gross-col" style="font-weight: 800;">${format_currency_short(grand_total_gross)}</td>
                    </tr>
                `);
			}

			// 2. Render Detail Table
			card.find("#invoice_count_label").text(`Showing ${results.length} records`);
			let total_qty = 0,
				total_amt = 0;

			if (results.length === 0) {
				tbody_detail.append(
					`<tr><td colspan="11" class="text-center text-muted" style="padding: 20px;">No data matching filters</td></tr>`,
				);
			} else {
				results.forEach((row, idx) => {
					let b_amt = flt(row.base_amount || 0);
					if (row.is_return) b_amt = -Math.abs(b_amt);
					let row_amt = b_amt * (flt(row.allocated_percentage || 100) / 100);

					total_qty += flt(row.qty);
					total_amt += row_amt;

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
                            <td style="text-align: center;">${idx + 1}</td>
                            <td>
                                <div style="display: flex; align-items: center; gap: 8px;">
                                    <a href="/app/sales-invoice/${row.invoice_id}" style="color: var(--primary); font-weight: 500;">${row.invoice_id}</a>
                                </div>
                            </td>
                            <td>${frappe.datetime.str_to_user(row.delivery_date || row.invoice_date)}</td>
                            <td>
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
                            <td style="text-align: right; font-weight: 600;">
                                ${format_currency_short(row.amt_allocated || 0)}
                            </td>
                        </tr>
                    `);
				});

				tbody_detail.append(`
                    <tr class="sticky-total">
                        <td colspan="9" style="text-align: right; font-weight: 700;">Total</td>
                        <td style="text-align: right; font-weight: 700; white-space: nowrap;">${frappe.format(total_qty, { fieldtype: "Float" })}</td>
                        <td style="text-align: right; font-weight: 700; color: var(--primary); white-space: nowrap;">${format_currency_short(total_amt)}</td>
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
			let parent = card.find("#" + parent_id);
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

				// Capture all possible ways the value can change
				ctrl.$input.on("input change", () => {
					if (ctrl.$input.val()) clear_btn.show();
					else clear_btn.hide();
					apply_local_filters();
				});

				// Specifically handle selection from the Frappe/Awesomplete dropdown
				ctrl.$input.on("awesomplete-selectcomplete", () => {
					if (ctrl.$input.val()) clear_btn.show();
					else clear_btn.hide();
					// Small delay to ensure the value is fully committed to the input field
					setTimeout(() => apply_local_filters(), 10);
				});

				clear_btn.on("click", function () {
					ctrl.$input.val("").trigger("change");
					ctrl.$input.focus();
					clear_btn.hide();
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
		const export_to_excel = (export_type = "all") => {
			let filters = page.filter_group.get_values();

			frappe.show_alert({ message: __("Generating Excel Report..."), indicator: "blue" });

			frappe.call({
				method: "renu_customization.renu_customization.page.sales_revenue_dashboard.sales_revenue_dashboard.export_to_excel",
				args: {
					filters: filters,
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
						link.href = URL.createObjectURL(blob);
						link.download = filename;
						link.click();
						frappe.show_alert({
							message: __("Excel Report Generated Successfully"),
							indicator: "green",
						});
					}
				},
			});
		};

		// 0. Button Management - Clear existing to avoid duplicates
		page.clear_inner_toolbar();
		page.clear_menu();
		page.clear_custom_actions();

		// 1. Primary Action: Refresh
		page.set_primary_action(__("Refresh"), () => page.refresh());

		// 2. Export Menu Options
		const export_pdf = async () => {
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
						// Get actual dimensions to preserve aspect ratio
						const bbox = svg_el.getBoundingClientRect();
						const width = bbox.width || 800;
						const height = bbox.height || 450;

						const clone = svg_el.cloneNode(true);
						const internal_legend = clone.querySelector(
							".chart-legend, .legend, .frappe-chart-legend",
						);
						if (internal_legend) internal_legend.style.display = "none";

						const svg_data = new XMLSerializer().serializeToString(clone);
						const canvas = document.createElement("canvas");
						const ctx = canvas.getContext("2d");
						const img = new Image();

						img.onload = () => {
							// Use a high-quality 2x multiplier
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

			const [png1, png2, png3] = await Promise.all([
				get_chart_png("top_10_salesperson"),
				get_chart_png("top_10_customers"),
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
						return `<tr>
							<td style="text-align:center;">${i + 1}</td>
							<td>${l}</td>
							<td style="text-align:right;">${format_currency_short(val)}</td>
							<td style="text-align:right;">${share}%</td>
						</tr>`;
					})
					.join("");
				return `
					<div style="margin-top:10px; page-break-inside: avoid;">
						<table style="width:75%; margin: 10px auto; border-collapse: collapse; font-size: 10px; border: 1px solid #eee;">
							<thead>
								<tr style="background: #f8f9fa;">
									<th style="width: 40px; text-align:center; border-bottom:2px solid #3498db;">S.No.</th>
									<th style="text-align:left; border-bottom:2px solid #3498db;">${title}</th>
									<th style="width: 100px; text-align:right; border-bottom:2px solid #3498db;">Value (M)</th>
									<th style="width: 70px; text-align:right; border-bottom:2px solid #3498db;">Share %</th>
								</tr>
							</thead>
							<tbody>${rows}</tbody>
						</table>
					</div>
				`;
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
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 9px; border: 1px solid #e2e8f0; table-layout: fixed; page-break-inside: auto; }
                        tr { page-break-inside: avoid !important; page-break-after: auto !important; }
                        td, th { page-break-inside: avoid !important; border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; vertical-align: top; word-wrap: break-word; position: static !important; }
                        thead { display: table-header-group; }
                        tfoot { display: table-footer-group; }
                        thead th { background: #f1f5f9 !important; font-weight: 700; color: #475569; text-transform: uppercase; border-bottom: 2px solid #3b82f6; position: static !important; }
                        tr.sticky-total td { position: static !important; background: #f8fafc !important; font-weight: 700; }
                        
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
						<h1 style="margin:0; font-size: 24px;">Sales Revenue Dashboard</h1>
						<p style="font-size: 14px; color: #555; margin: 8px 0;">${period}</p>
						<p style="font-size: 11px; color: #999; margin: 0;">Generated: ${report_date}</p>
					</div>

					<div class="kpi-wrapper">
						${data.summary
							.map((m) => {
								let color = "#3498db";
								if (m.indicator === "green") color = "#2ecc71";
								if (m.indicator === "orange") color = "#e67e22";
								if (m.indicator === "purple") color = "#9b59b6";
								return `
							<div class="kpi-card">
								<div class="kpi-label">
									<span class="kpi-dot" style="background: ${color};"></span>
									${m.label}
								</div>
								<div class="kpi-value">${format_currency_short(m.value, m.fieldtype)}</div>
							</div>
						`;
							})
							.join("")}
					</div>

					<h3>Visual Analytics Breakdown</h3>
					<div style="text-align: center;">
						${chart_h(png1, "Top 10 Salesperson Performance")}
                        ${chart_l("top_10_salesperson")}
						${chart_t("top_10_salesperson", "Top 10 Salesperson Data")}

						${chart_h(png2, "Top 10 Customers Performance")}
                        ${chart_l("top_10_customers")}
						${chart_t("top_10_customers", "Top 10 Customers Data")}

						${chart_h(png3, "Top 10 Products Performance")}
                        ${chart_l("top_10_products")}
						${chart_t("top_10_products", "Top 10 Products Data")}
					</div>

					<div class="page-break"></div>

					<h3>Month-Wise Revenue Breakdown (M)</h3>
					<table>
						${card.find("#consolidated_table").html()}
					</table>

					<h3>Detailed Sales Invoices List (M)</h3>
					<table class="invoice-list-table">
						<thead>${$("#invoice_table_body").closest("table").find("thead").html()}</thead>
						<tbody>${$("#invoice_table_body").html()}</tbody>
					</table>
				</body>
				</html>
			`;

			const method_url =
				"/api/method/renu_customization.renu_customization.page.sales_revenue_dashboard.sales_revenue_dashboard.export_to_pdf";
			const $form =
				$(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
				<input type="hidden" name="html" value="">
				<input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
			</form>`).appendTo("body");

			$form.find('input[name="html"]').val(html);
			$form.submit();
			$form.remove();
		};

		page.add_menu_item(__("Export to PDF"), () => export_pdf());
		page.add_menu_item(__("Export to Excel"), () => export_to_excel());

		// Attach handlers to the localized buttons in table headers
		page.container.on("click", "#export_month_table", () => export_to_excel("summary"));
		page.container.on("click", "#pdf_month_table", () => export_pdf());
		page.container.on("click", "#export_invoice_table", () => export_to_excel("detail"));

		// 3. Force-remove default duplicates (be specific to avoid hiding our own menu)
		$(".page-head .standard-actions .btn-secondary:contains('Refresh')").hide();

		// 6. Remove small local buttons (except the ones we just added in headers)
		$(".chart-card .export-btn, .row-export-btn").remove();
	}

	// Trigger initial load automatically
	setTimeout(() => {
		page.refresh();
	}, 100);
};
