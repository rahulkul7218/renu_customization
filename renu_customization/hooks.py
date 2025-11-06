app_name = "renu_customization"
app_title = "Renu Customization"
app_publisher = "Assimilate Technologies Pvt Ltd"
app_description = "For renu actory automation"
app_email = "info@assimilatetechnologies.com"
app_license = "mit"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "renu_customization",
# 		"logo": "/assets/renu_customization/logo.png",
# 		"title": "Renu Factory Automation Pvt Ltd",
# 		"route": "/renu_customization",
# 		"has_permission": "renu_customization.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/renu_customization/css/renu_customization.css"
# app_include_js = "/assets/renu_customization/js/renu_customization.js"

# include js, css files in header of web template
# web_include_css = "/assets/renu_customization/css/renu_customization.css"
# web_include_js = "/assets/renu_customization/js/renu_customization.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "renu_customization/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "renu_customization/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "renu_customization.utils.jinja_methods",
# 	"filters": "renu_customization.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "renu_customization.install.before_install"
# after_install = "renu_customization.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "renu_customization.uninstall.before_uninstall"
# after_uninstall = "renu_customization.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "renu_customization.utils.before_app_install"
# after_app_install = "renu_customization.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "renu_customization.utils.before_app_uninstall"
# after_app_uninstall = "renu_customization.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "renu_customization.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"renu_customization.tasks.all"
# 	],
# 	"daily": [
# 		"renu_customization.tasks.daily"
# 	],
# 	"hourly": [
# 		"renu_customization.tasks.hourly"
# 	],
# 	"weekly": [
# 		"renu_customization.tasks.weekly"
# 	],
# 	"monthly": [
# 		"renu_customization.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "renu_customization.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "renu_customization.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "renu_customization.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["renu_customization.utils.before_request"]
# after_request = ["renu_customization.utils.after_request"]

# Job Events
# ----------
# before_job = ["renu_customization.utils.before_job"]
# after_job = ["renu_customization.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"renu_customization.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

after_migrate = [
    "renu_customization.patches.v_0.add_business_fields_to_item.execute",
    "renu_customization.patches.v_0.addbusiness_region_field_on_customer.execute",
    "renu_customization.patches.v_0.add_supplier_code_field_on_supplier.execute",
    "renu_customization.patches.v_0.add_business_unit_field_on_sales_invoice_item.execute",
    "renu_customization.patches.v_0.add_customer_field_on_customer.execute",
    "renu_customization.patches.v_0.add_under_development_checkbox_on_item.execute",
    "renu_customization.patches.v_0.add_designation_field_on_customer.execute",
    "renu_customization.patches.v_0.add_model_name_field_on_item.execute",
    "renu_customization.patches.v_0.add_business_region_name_on_customer.execute",
    "renu_customization.patches.v_0.make_mandatory_fields_on_item.execute",
    "renu_customization.patches.v_0.add_business_group_field_on_item.execute",
    "renu_customization.patches.v_0.make_field_mandatory_on_address.execute",
    "renu_customization.patches.v_0.add_district_fileld_on_address.execute",
    "renu_customization.patches.v_0.make_fields_unmandatory_on_customer.execute",
    "renu_customization.patches.v_0.add_payment_term_code_field_on_payment_terms.execute",
    "renu_customization.patches.v_0.add_po_no_field_on_purchase_receipt.execute",
    "renu_customization.patches.v_0.purchase_receipt_item_checkbox_checked.execute",
    "renu_customization.patches.v_0.create_role_profiles_with_roles.execute",
    "renu_customization.patches.v_0.create_module_profiles.execute",
    "renu_customization.patches.v_0.make_item_name_unmandatory_on_purchase_receipt.execute",
    "renu_customization.patches.v_0.add_invoice_type_field_on_sales_order.execute",
    "renu_customization.patches.v_0.add-sales_order_field_on_picklist.execute",
    "renu_customization.patches.v_0.add_picklist_field_on_delivery_note.execute",
    "renu_customization.patches.v_0.add_delivery_note_field_on_sales_invoice.execute",
    "renu_customization.patches.v_0.add_invoice_type_field_fetched_from_sales_order.execute",
    "renu_customization.patches.v_0.add_invoice_type_fetched_from_picklist.execute",
    "renu_customization.patches.v_0.add_invoice_type_field_salesinvoice_fetched_from_delivery_note.execute",
    
    "renu_customization.patches.v_0.hide_fields_on_sales_invoice.execute",
    "renu_customization.patches.v_0.hide_field_on_delivery_note.execute",
    "renu_customization.patches.v_0.hide_fields_on_picklist.execute",
    "renu_customization.patches.v_0.add_dependa_on_invoicetype_on_salesinvoice.execute",
    "renu_customization.patches.v_0.add_invoice_type_filed_on_sales_invoice.execute",
    "renu_customization.patches.v_0.add_purchaseorder_linkfield_on_ourchasereceipt.execute",
    "renu_customization.patches.v_0.create_po_date_filed_on_purchase_receipt.execute",
    "renu_customization.patches.v_0.hide_po_no_fileld-on_purchase_receipt.execute",
    "renu_customization.patches.v_0.create_new-field-supplier_invoice_no_on_purchase_receipt.execute",
    "renu_customization.patches.v_0.create_supplier_invoice_date_on_purchase_receipt.execute",
    "renu_customization.patches.v_0.create_old_customer_code_field_on_customer.execute",
    
    "renu_customization.patches.v_0.remove_read_only_old_customer_code.execute",
    "renu_customization.patches.v_0.add_purchase_receipt_on_purchase_invoice.execute",
    "renu_customization.patches.v_0.add_party_item_code_on_salesorderitem.execute",
    "renu_customization.patches.v_0.add_partyitemcode_on_picklist_deliverynote_salesinvoice.execute",
    # "renu_customization.patches.v_0.add_warranty_field_on_so.execute",
    "renu_customization.patches.v_0.add_fields_invoice_and_delivery_note_on_serial_no.execute",
    "renu_customization.patches.v_0.add_warranty_start_date_on_serial_no.execute",
    
    
    
    "renu_customization.patches.v_0.add_serial_no_filed_on_sales_invouce_item.execute",
    "renu_customization.patches.v_0.add_sales_warranty_and_noofdays_on_item.execute",
    "renu_customization.patches.v_0.add_purchase_warranty_and_noofdays_on_item.execute",
    "renu_customization.patches.v_0.add_warranty_begins_field_on_serial_no.execute",
    "renu_customization.patches.v_0.add_fields_warranty_on_sales_invoice_item.execute",
    "renu_customization.patches.v_0.add_warranty_fields_on_sales_order_item.execute",
    "renu_customization.patches.v_0.add_fieldswarranty_on_pick_list_item.execute",
    "renu_customization.patches.v_0.add_warranty_fields_on_delivery_note_item.execute",
    "renu_customization.patches.v_0.add_field_warranty_date_deliverynoteitem.execute",
    "renu_customization.patches.v_0.add_warranty_days_field_on_serial_no.execute",
    "renu_customization.patches.v_0.add_warranty_end_date_on_delivery_note_item.execute",
    "renu_customization.patches.v_0.add_warranty_field_on_sales_order.execute",
  

    
    #print format fields
    "renu_customization.patches.v_0.add_fields_in_company_for_pf.execute",
    "renu_customization.patches.v_0.add_fields_sales_invoice_pf.execute",
    "renu_customization.patches.v_0.add_fields_in_sales_order_wi_pf.execute",
    "renu_customization.patches.v_0.add_fields_in_bank_account.execute",
    "renu_customization.patches.v_0.add_delivery_term_field_in_si.execute",
    "renu_customization.patches.v_0.add_delivery_term_field_in_so.execute",
    "renu_customization.patches.v_0.add_fields_in_si_docket_no.execute",
    
   
   #Naming series
    # "renu_customization.patches.v_0.create_document_naming_rule_on_salesinvoice_if_invoice_is_productdomestic.execute",
    # "renu_customization.patches.v_0.document_series_rule_if_invoice_type_is_productexport.execute",
    # "renu_customization.patches.v_0.add_naming_series_invoicetype_engg_ser_domestic.execute",
    # "renu_customization.patches.v_0.add_naming_series_for_engg_service_export.execute",
    # "renu_customization.patches.v_0.add_naming_series_for_delivery_note.execute",
    # "renu_customization.patches.v_0.add_naming_series_on_sales_order_product_domestic.execute",
    # "renu_customization.patches.v_0.create_naming_series_on_sales_order_productexport.execute",
    # "renu_customization.patches.v_0.create_naming_series_on_sales-order_engg_domestic_service.execute",
    # "renu_customization.patches.v_0.create_naming_series_on_sales_order_engg_service_export.execute",


]
#  "renu_customization.patches.v_0.allow_data_import_for_all_doctypes.execute",

doctype_js = {
    

    "Customer": ["public/js/fetched_from_business_code.js",
    "public/js/make_fields_mandatory.js"],
    "Item":["public/js/when_under_development_check_disable_checkbox_checked.js","public/js/onlyshow_purchase_warranty.js","public/js/only_show_sales_warranty.js",
    "public/js/show_purchase_warranty_only_serialno_and_allow_purchase_checked.js",
    "public/js/show_sale_warranty_only_serialno_and_allow_sale_checked.js","public/js/fetched_warrantydays_of_purchase.js",
    "public/js/fetched_warrantydays_of_sales.js"],
    "Address":"public/js/make_mandatory_fields_on_address.js",
    "Purchase Receipt":"public/js/upload_bulk_serial_no.js",
    "Delivery Note":["public/js/add_logic_fetched_id_and_invoicetype_of_pick_on_delivery_note.js",
    "public/js/fetched_warrantydetails_on_deliverynoteitem.js", "public/js/fetched_warranty_date_from_delievrynote_if_date_of_dispatch.js"],
    # "public/js/calculate_end_date_on_delivery_note_and_update_serial_no.js"
    "Sales Invoice":["public/js/if_invoice_type_have_data_then_fetched_stored_in_invoice_typ_field.js",
    "public/js/fetched_warrantydate_on_salesinvoiceitem_if_date_of_invoice.js","public/js/calculate_package_wait.js", "public/js/calculate_warranty_end_date.js", 
    "public/js/update_serial_no_on_sales_invoice_while_submitting.js", "public/js/set_by_default_value_of_delivery_terms_on_sales_invoice.js"],

    "Purchase Invoice":"public/js/unmandatory_supplier_invoice_no_on_purchaseinvoice.js",
    
    "Sales Order": ["public/js/fetched_warranty_on_selecteditem_and_warrantdays_warrantybegins.js",
    "public/js/set_bydefalut_value_of_deliveryterms_packing_and_insurance_on_sales_order.js", "public/js/concatenate_warranty_name_andwarranty_description_on_sales_order.js"],
    "Pick List": "public.js/fetched_warranty_details_on_salesorder_picklistitem.js",
    "Serial No": ["public/js/hide_warranty_field_onserial_no.js","public/js/make_warranty_expiry_date_read_only.js"]
     
    

}

doc_events = {
    # "Document Naming Rule": {
    #     "after_insert": "renu_customization.api.update_background_prefix_1.set_prefix_digits"
    # },
    "Purchase Invoice": {
        "before_validate": "renu_customization.api.supplier_invoice_no_and_date_fetched_from_receipt.supplier_invoice_no_and_date_fetched_from_receipt"
    },
    "Pick List Item": {
        "before_insert": "renu_customization.api.fetched_party_item_code.get_party_item_code"
    },
    "Delivery Note Item": {
       "before_insert": "renu_customization.api.fetched_party_item_code_from_picklist_ti_deliverytnote.get_party_item_code_from_picklist"
    },
    "Sales Invoice Item": {
        "before_insert": "renu_customization.api.fetched_partitemcode_from_deliverynote_to_salesinvoice.get_party_item_code_from_dn"
        
    },
    "Sales Invoice": {
        "before_insert": "renu_customization.api.fetched_serial_no_from_delivery_note.fetch_serial_no_on_invoice",
        "before_submit": "renu_customization.api.set_serial_no_warranty_info_from_si.set_serial_no_warranty_info_from_si"
    }


}

app_include_js = [
    "/assets/renu_customization/js/uat_banner.js",
    "/assets/renu_customization/js/serial_no_track_on_packing_slip.js"
]

# custom_masters/hooks.py

# hooks.py


