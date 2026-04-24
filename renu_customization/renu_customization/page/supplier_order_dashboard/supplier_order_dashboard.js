frappe.pages["supplier_order_dashboard"].on_page_load = function (wrapper) {
	var page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("Supplier Order Dashboard (Million INR)"),
		single_column: true,
	});

	window.cur_page = page;
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
			method: "renu_customization.renu_customization.page.supplier_order_dashboard.supplier_order_dashboard.get_dashboard_data",
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
			fieldname: "purchase_order",
			label: __("PO Details"),
			fieldtype: "Link",
			options: "Purchase Order",
			placeholder: __("Select PO"),
		},
		{
			fieldname: "supplier",
			label: __("Supplier"),
			fieldtype: "Link",
			options: "Supplier",
			placeholder: __("Select Supplier"),
		},
		{
			fieldname: "expected_delivery_date",
			label: __("Expected Delivery Date"),
			fieldtype: "Date",
		},
		{
			fieldname: "actual_delivery_time",
			label: __("Actual Delivery Time"),
			fieldtype: "Date",
		},
		{
			fieldname: "delivery_time_as_per_po",
			label: __("Delivery Time as per PO"),
			fieldtype: "Date",
		},
		{
			fieldname: "supplier_agreed_time",
			label: __("Supplier Agreed Time"),
			fieldtype: "Date",
		},
		{
			fieldname: "open_po_details",
			label: __("Open PO Details"),
			fieldtype: "Check",
		},
		{
			fieldname: "is_overdue",
			label: __("Overdue Deliveries"),
			fieldtype: "Check",
		},
		{
			fieldname: "due_next_week",
			label: __("Due in Next Week"),
			fieldtype: "Check",
		}
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

        .frappe-chart .chart-legend, .frappe-chart .legend { display: none !important; visibility: hidden !important; opacity: 0 !important; height: 0 !important; overflow: hidden !important; }
        .frappe-chart text { font-size: 11px !important; }

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
        }
        .table-actions { display: flex; gap: 12px; align-items: center; }
        .export-btn { font-size: 12px; cursor: pointer; color: #475569; font-weight: 600; padding: 6px 14px; border-radius: 6px; transition: all 0.2s; display: inline-flex; align-items: center; gap: 6px; background: #fff; border: 1px solid #e2e8f0; white-space: nowrap; }
        .export-btn:hover { color: #2563eb !important; background: #eff6ff !important; border-color: #bfdbfe !important; }
        tr.sticky-total td { position: sticky; bottom: 0; z-index: 9; background: #f1f3f5 !important; font-weight: 700; border-top: 2px solid #ddd; }
        
        .table-container { 
            overflow: auto; width: 100%; max-height: 750px; 
            position: relative;
        }
        .dashboard-table { width: 100%; border-collapse: separate; border-spacing: 0; }
        
        .dashboard-table th { 
            background: #f8fafc; padding: 12px 16px; text-align: left; 
            font-size: 11px; font-weight: 700; color: #64748b; 
            position: sticky; top: 0; z-index: 50; 
            border-bottom: 1px solid #e2e8f0;
            text-transform: uppercase;
            white-space: nowrap;
        }
        
        .dashboard-table td { 
            padding: 12px 16px; border-bottom: 1px solid #f1f5f9; 
            font-size: 13px; color: #334155; 
            background: #fff;
            vertical-align: middle;
            white-space: nowrap;
        }

        .col-sno { width: 60px !important; min-width: 60px !important; text-align: center !important; }
        .col-supplier { width: 280px !important; min-width: 280px !important; white-space: normal !important; word-wrap: break-word; }
        .col-po { width: 160px !important; min-width: 160px !important; }
        .col-date { width: 130px !important; min-width: 130px !important; }
        .col-status { width: 140px !important; min-width: 140px !important; }
        .col-amt { width: 140px !important; min-width: 140px !important; text-align: right !important; }

        .indicator-pill { 
            padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 600;
            text-transform: uppercase; letter-spacing: 0.025em;
        }
        .indicator-pill.green { background: #dcfce7; color: #166534; }
        .indicator-pill.blue { background: #dbeafe; color: #1e40af; }
        .indicator-pill.orange { background: #fef3c7; color: #92400e; }
        .indicator-pill.red { background: #fee2e2; color: #991b1b; }
        .indicator-pill.gray { background: #f1f5f9; color: #475569; }
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

		let summary_row = $('<div class="summary-wrapper"></div>').appendTo(page.container);
		data.summary.forEach((metric) => {
            let indicator = (metric.indicator || "blue").toLowerCase();
            let val = metric.fieldtype === 'Currency' ? format_currency(metric.value / 1000000, "INR") + " M" : metric.value;
			$(`
                <div class="summary-card ${indicator}">
                    <div class="label">${metric.label}</div>
                    <div class="value">${val}</div>
                </div>
            `).appendTo(summary_row);
		});

		let tables_container = $('<div class="tables-view"></div>').appendTo(page.container);

		let tables_html = $(`
            <div class="table-card" style="margin-top: 32px;">
                <div class="header">
                    <span style="font-size: 15px;">${__("Supplier Orders")}</span>
                    <div class="table-actions">
                        <span class="export-btn" id="export_excel_btn"><i class="fa fa-file-excel-o"></i> Export</span>
                        <span class="export-btn" id="export_pdf_btn"><i class="fa fa-file-pdf-o"></i> PDF</span>
                    </div>
                </div>
                <div class="table-container">
                    <table class="dashboard-table">
                        <thead>
                            <tr>
                                <th class="col-sno">S.No.</th>
                                <th class="col-po">PO No</th>
                                <th class="col-supplier">Supplier</th>
                                <th class="col-date">PO Date</th>
                                <th class="col-date">Expected Del.</th>
                                <th class="col-date">Agreed Time</th>
                                <th class="col-date">Delivery as per PO</th>
                                <th class="col-date">Actual Delivery</th>
                                <th class="col-status">Status</th>
                                <th class="col-amt">Net Total</th>
                            </tr>
                        </thead>
                        <tbody id="po_list_body"></tbody>
                    </table>
                </div>
            </div>
        `).appendTo(tables_container);

		let tbody_list = tables_container.find("#po_list_body");
        tbody_list.empty();

        let total_amt = 0;

        data.results.forEach((row, idx) => {
            let status_color = "gray";
            if (["Completed", "Closed"].includes(row.status)) status_color = "green";
            if (["Draft"].includes(row.status)) status_color = "blue";
            if (["To Receive", "To Bill", "To Receive and Bill"].includes(row.status)) status_color = "orange";
            if (["Cancelled"].includes(row.status)) status_color = "red";

            let amt = flt(row.net_total);
            total_amt += amt;

            tbody_list.append(`
                <tr>
                    <td class="col-sno" style="color: #94a3b8; font-weight: 600;">${idx + 1}</td>
                    <td class="col-po"><a href="/app/purchase-order/${row.name}" style="font-weight: 600; color: #4338ca;">${row.name}</a></td>
                    <td class="col-supplier" style="font-weight: 500;">${row.supplier}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.transaction_date) || "-"}</td>
                    <td class="col-date" style="${row.is_overdue ? 'color: red; font-weight: 600;' : ''}">${frappe.datetime.str_to_user(row.schedule_date) || "-"}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.supplier_agreed_time) || "-"}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.delivery_time_as_per_po) || "-"}</td>
                    <td class="col-date">${frappe.datetime.str_to_user(row.actual_delivery_time) || "-"}</td>
                    <td class="col-status"><span class="indicator-pill ${status_color}">${row.status}</span></td>
                    <td class="col-amt" style="font-weight: 700; color: #0f172a;">${format_currency(amt / 1000000, "INR")} M</td>
                </tr>
            `);
        });

        let tfoot_list = $('<tfoot id="po_list_tfoot"></tfoot>').appendTo(tables_html.find(".dashboard-table"));
        tfoot_list.append(`
            <tr class="sticky-total">
                <td colspan="9" style="text-align: right; padding-right: 24px; color: #64748b; font-weight: 700;">GRAND TOTAL</td>
                <td style="text-align: right; font-weight: 800; color: #0f172a; border-left: 1px solid #e2e8f0;">${format_currency(total_amt / 1000000, "INR")} M</td>
            </tr>
        `);

        const export_to_excel = () => {
            let filters = page.filter_group.get_values();
            frappe.call({
                method: "renu_customization.renu_customization.page.supplier_order_dashboard.supplier_order_dashboard.export_to_excel",
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
                        const blob = new Blob([byteArray], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = filename;
                        link.click();
                    }
                }
            });
        };

        const export_to_pdf = () => {
            const report_date = frappe.datetime.now_datetime();
            const html = `
                <html>
                <head>
                    <style>
                        body { font-family: 'Helvetica', 'Arial', sans-serif; padding: 20px; color: #1e293b; line-height: 1.4; }
                        .report-header { text-align: center; border-bottom: 3px solid #3b82f6; padding-bottom: 20px; margin-bottom: 30px; }
                        
                        .kpi-wrapper { display: table; width: 100%; border-collapse: separate; border-spacing: 10px; margin-bottom: 20px; table-layout: fixed; }
                        .kpi-card { display: table-cell; padding: 12px; border: 1px solid #e2e8f0; border-radius: 10px; background: #f8fafc; text-align: center; vertical-align: top; }
                        .kpi-label { font-size: 9px; color: #64748b; font-weight: 700; text-transform: uppercase; margin-bottom: 5px; white-space: nowrap; }
                        .kpi-value { font-size: 15px; font-weight: 800; color: #0f172a; white-space: nowrap; }
                        
                        h3 { font-size: 16px; font-weight: 700; color: #1e293b; margin-top: 30px; border-left: 4px solid #3b82f6; padding-left: 12px; text-transform: uppercase; letter-spacing: 0.025em; }
                        
                        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 8px; border: 1px solid #e2e8f0; table-layout: auto; }
                        th, td { border: 1px solid #e2e8f0; padding: 6px 4px; text-align: left; word-wrap: break-word; overflow: hidden; }
                        th { background: #f1f5f9; font-weight: 700; color: #475569; text-transform: uppercase; font-size: 7px; }
                        td { background: #fff; }
                        
                        .indicator-pill { padding: 4px 8px; border-radius: 9999px; font-size: 9px; font-weight: 600; text-transform: uppercase; display: inline-block; border: 1px solid #e2e8f0; }
                    </style>
                </head>
                <body>
                    <div class="report-header">
                        <h1 style="margin:0; font-size: 24px;">Supplier Order Dashboard</h1>
                        <p style="font-size: 11px; color: #999; margin: 8px 0 0 0;">Generated: ${report_date}</p>
                    </div>

                    <div class="kpi-wrapper">
                        ${data.summary.map(m => `
                            <div class="kpi-card">
                                <div class="kpi-label">${m.label}</div>
                                <div class="kpi-value">${m.fieldtype === 'Currency' ? format_currency(m.value / 1000000, "INR") + " M" : m.value}</div>
                            </div>
                        `).join("")}
                    </div>

                    <h3>Supplier Orders List</h3>
                    <table>
                        <thead>${tables_html.find(".dashboard-table thead").html()}</thead>
                        <tbody>${tables_html.find("#po_list_body").html()}</tbody>
                        <tfoot>${tables_html.find("#po_list_tfoot").html()}</tfoot>
                    </table>
                </body>
                </html>
            `;

            const method_url = "/api/method/renu_customization.renu_customization.page.supplier_order_dashboard.supplier_order_dashboard.export_to_pdf";
            const $form = $(`<form action="${method_url}" method="POST" target="_blank" style="display:none;">
                <input type="hidden" name="html" value="">
                <input type="hidden" name="csrf_token" value="${frappe.csrf_token}">
            </form>`).appendTo("body");

            $form.find('input[name="html"]').val(html);
            $form.submit();
            $form.remove();
        };

        tables_html.find("#export_excel_btn").on("click", export_to_excel);
        tables_html.find("#export_pdf_btn").on("click", export_to_pdf);

        page.add_menu_item(__("Export to PDF"), export_to_pdf);
        page.add_menu_item(__("Export to Excel"), export_to_excel);
	}

	page.refresh();
};
