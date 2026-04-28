# Copyright (c) 2026, Assimilate Technologies Pvt Ltd and contributors
# For license information, please see license.txt

import frappe
from frappe import _
from frappe.utils import flt, getdate, add_months, add_days, formatdate

def execute(filters=None):
    if not filters:
        filters = {}

    # Handle empty dates by finding min/max posting_date in database
    if not filters.get("from_date") or not filters.get("to_date"):
        min_max = frappe.db.sql("""SELECT MIN(posting_date) as min_date, MAX(posting_date) as max_date FROM `tabSales Invoice` WHERE docstatus = 1""", as_dict=True)
        if min_max and min_max[0].min_date:
            if not filters.get("from_date"):
                filters["from_date"] = min_max[0].min_date
            if not filters.get("to_date"):
                filters["to_date"] = min_max[0].max_date
        else:
            # Fallback if no invoices found
            if not filters.get("from_date"):
                filters["from_date"] = add_months(getdate(), -12)
            if not filters.get("to_date"):
                filters["to_date"] = getdate()

    columns = get_columns(filters)
    data = get_data(filters, columns)

    return columns, data

def get_columns(filters):
    # Base columns
    columns = [
        {"label": _("Customer"), "fieldname": "customer", "fieldtype": "Link", "options": "Customer", "width": 150},
        {"label": _("Sales Person"), "fieldname": "sales_person", "fieldtype": "Link", "options": "Sales Person", "width": 150},
        {"label": _("Product (Item)"), "fieldname": "item_code", "fieldtype": "Link", "options": "Item", "width": 150},
    ]

    period_type = filters.get("period_type")
    from_date = getdate(filters.get("from_date"))
    to_date = getdate(filters.get("to_date"))

    periods = get_periods(from_date, to_date, period_type)

    for p in periods:
        columns.append({
            "label": p['label'],
            "fieldname": p['fieldname'],
            "fieldtype": "Currency",
            "options": "Company:currency",
            "width": 120
        })

    # Add Total column
    columns.append({
        "label": _("Gross Total"),
        "fieldname": "total_revenue",
        "fieldtype": "Currency",
        "options": "Company:currency",
        "width": 140
    })

    return columns

def get_periods(from_date, to_date, period_type):
    periods = []
    
    current_date = from_date
    if period_type == "Monthly":
        current_date = current_date.replace(day=1)
    elif period_type == "Quarterly":
        month = current_date.month
        if month in [1, 2, 3]: q_start = 1
        elif month in [4, 5, 6]: q_start = 4
        elif month in [7, 8, 9]: q_start = 7
        else: q_start = 10
        current_date = current_date.replace(month=q_start, day=1)
    elif period_type == "Yearly":
        current_date = current_date.replace(month=1, day=1)
    elif period_type == "Fiscal Year":
        fy_year = current_date.year if current_date.month >= 4 else current_date.year - 1
        current_date = current_date.replace(year=fy_year, month=4, day=1)

    while current_date <= to_date:
        period_start = current_date
        period_end = None
        label = ""
        fieldname = ""

        if period_type == "Monthly":
            period_end = add_days(add_months(period_start, 1), -1)
            label = period_start.strftime("%b %Y").upper()
            fieldname = period_start.strftime("%b_%Y").lower()
            current_date = add_months(period_start, 1)

        elif period_type == "Quarterly":
            period_end = add_days(add_months(period_start, 3), -1)
            q_num = (period_start.month - 1) // 3 + 1
            label = f"{period_start.strftime('%b')}-{period_end.strftime('%b')} {period_start.year}".upper()
            fieldname = f"q{q_num}_{period_start.year}".lower()
            current_date = add_months(period_start, 3)

        elif period_type == "Yearly":
            period_end = period_start.replace(month=12, day=31)
            label = f"{period_start.year}"
            fieldname = f"year_{period_start.year}"
            current_date = add_months(period_start, 12)

        elif period_type == "Fiscal Year":
            period_end = period_start.replace(year=period_start.year + 1, month=3, day=31)
            label = f"{period_start.year}-{period_start.year + 1}"
            fieldname = f"fy_{period_start.year}_{period_start.year + 1}"
            current_date = add_months(period_start, 12)

        elif period_type == "Aging":
            return [
                {"label": "0-30 Days", "fieldname": "aging_0_30", "min_days": 0, "max_days": 30},
                {"label": "31-60 Days", "fieldname": "aging_31_60", "min_days": 31, "max_days": 60},
                {"label": "61-90 Days", "fieldname": "aging_61_90", "min_days": 61, "max_days": 90},
                {"label": "91-120 Days", "fieldname": "aging_91_120", "min_days": 91, "max_days": 120},
                {"label": "Above 120 Days", "fieldname": "aging_121_plus", "min_days": 121, "max_days": 99999}
            ]

        # Final period might exceed to_date, but we keep the full month/period labels
        # The data bucketing will handle the date range filtering
        periods.append({
            "from_date": period_start,
            "to_date": period_end,
            "label": label,
            "fieldname": fieldname
        })

    return periods

def get_data(filters, columns):
    period_type = filters.get("period_type")
    from_date = filters.get("from_date")
    to_date = filters.get("to_date")
    
    periods = get_periods(getdate(from_date), getdate(to_date), period_type)
    
    conditions = get_conditions(filters)
    
    # Query breakdown by Customer, Sales Person, and Item (simplified again)
    query = f"""
        SELECT 
            si.customer,
            st.sales_person,
            st.allocated_percentage,
            sii.item_code,
            si.posting_date,
            dn.posting_date AS delivery_date,
            sii.base_amount,
            si.base_net_total,
            si.base_grand_total
        FROM `tabSales Invoice` si
        JOIN `tabSales Invoice Item` sii ON sii.parent = si.name
        LEFT JOIN `tabSales Team` st ON st.parent = si.name
        LEFT JOIN `tabCustomer` cust ON cust.name = si.customer
        LEFT JOIN `tabItem` it ON it.name = sii.item_code
        LEFT JOIN `tabDelivery Note Item` dni ON sii.dn_detail = dni.name
        LEFT JOIN `tabDelivery Note` dn ON dn.name = dni.parent
        WHERE si.docstatus = 1 
        AND si.status != 'Cancelled'
        AND si.posting_date >= %(from_date)s 
        AND si.posting_date <= %(to_date)s
        {conditions}
        ORDER BY si.posting_date DESC
    """
    
    invoices = frappe.db.sql(query, filters, as_dict=True)
    
    # Detailed mapping
    data_map = {}
    for inv in invoices:
        cust = inv.get("customer")
        sp = inv.get("sales_person") or ""
        item = inv.get("item_code")
        
        row_key = f"{cust}|{sp}|{item}"
        
        if row_key not in data_map:
            data_map[row_key] = {
                "customer": cust,
                "sales_person": sp,
                "item_code": item,
                "total_revenue": 0.0
            }
            # Initialize period columns
            for p in periods:
                data_map[row_key][p['fieldname']] = 0.0
        
        # Calculate distributed Gross Total (including taxes proportionally)
        net_total = flt(inv.base_net_total)
        grand_total = flt(inv.base_grand_total)
        item_base = flt(inv.base_amount)
        
        # Factor to scale net line amount to grand total share
        factor = grand_total / net_total if net_total else 1
        
        # Multiply by allocated percentage if available (for multiple sales persons)
        alloc_p = flt(inv.get("allocated_percentage") or 100)
        distributed_amount = (item_base * factor) * (alloc_p / 100)
        
        # Determine which period this invoice falls into
        inv_date = getdate(inv.get("delivery_date") or inv.get("posting_date"))
        today = getdate()
        
        if period_type == "Aging":
            days_diff = (today - inv_date).days
            for p in periods:
                if p['min_days'] <= days_diff <= p['max_days']:
                    data_map[row_key][p['fieldname']] += distributed_amount
                    data_map[row_key]["total_revenue"] += distributed_amount
                    break
        else:
            for p in periods:
                if p['from_date'] <= inv_date <= p['to_date']:
                    data_map[row_key][p['fieldname']] += distributed_amount
                    data_map[row_key]["total_revenue"] += distributed_amount
                    break
                
    # Convert map to list
    data = list(data_map.values())
    
    # Sort by total revenue descending
    data.sort(key=lambda x: x['total_revenue'], reverse=True)
    
    return data

def get_conditions(filters):
    conditions = ""
    if filters.get("customer"):
        conditions += " AND si.customer = %(customer)s"
    
    if filters.get("sales_person"):
        conditions += " AND st.sales_person = %(sales_person)s"
        
    if filters.get("item"):
        conditions += " AND sii.item_code = %(item)s"
        
    if filters.get("territory"):
        conditions += " AND si.territory = %(territory)s"
        
    if filters.get("customer_group"):
        conditions += " AND cust.customer_group = %(customer_group)s"
        
    if filters.get("item_group"):
        conditions += " AND it.item_group = %(item_group)s"
        
    if filters.get("dom_exp"):
        if filters.get("dom_exp") == "Domestic":
            conditions += " AND si.is_domestic = 1"
        elif filters.get("dom_exp") == "Export":
            conditions += " AND si.is_export = 1"
            
    if filters.get("invoice_type"):
        conditions += " AND si.invoice_type = %(invoice_type)s"
        
    return conditions
