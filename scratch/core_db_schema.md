# Database Schema (Core Tables)

## Table: `jobs`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **job_number** | `text` | NO | *NULL* |
| **customer_id** | `uuid` | YES | *NULL* |
| **customer_name** | `text` | NO | *NULL* |
| **technician_id** | `uuid` | YES | *NULL* |
| **technician_name** | `text` | YES | *NULL* |
| **category** | `text` | NO | *NULL* |
| **subcategory** | `text` | YES | *NULL* |
| **appliance** | `text` | YES | *NULL* |
| **brand** | `text` | YES | *NULL* |
| **model** | `text` | YES | *NULL* |
| **issue** | `text` | YES | *NULL* |
| **status** | `text` | YES | `'pending'::text` |
| **priority** | `text` | YES | `'medium'::text` |
| **scheduled_date** | `date` | YES | *NULL* |
| **scheduled_time** | `text` | YES | *NULL* |
| **property** | `jsonb` | YES | *NULL* |
| **description** | `text` | YES | *NULL* |
| **notes** | `text` | YES | *NULL* |
| **amount** | `numeric` | YES | `0` |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **source** | `text` | YES | *NULL* |
| **property_id** | `uuid` | YES | *NULL* |
| **rental_id** | `uuid` | YES | *NULL* |
| **amc_id** | `uuid` | YES | *NULL* |
| **arrived_at** | `timestamp with time zone` | YES | *NULL* |
| **customer_rating** | `smallint` | YES | *NULL* |
| **rating_note** | `text` | YES | *NULL* |
| **rated_at** | `timestamp with time zone` | YES | *NULL* |
| **on_way_at** | `timestamp with time zone` | YES | *NULL* |
| **quotation_approved_at** | `timestamp with time zone` | YES | *NULL* |
| **repair_note_added_at** | `timestamp with time zone` | YES | *NULL* |
| **started_at** | `timestamp with time zone` | YES | *NULL* |
| **completed_at** | `timestamp with time zone` | YES | *NULL* |
| **warranty** | `boolean` | YES | `false` |
| **warranty_proof** | `text` | YES | *NULL* |
| **priority_note** | `text` | YES | *NULL* |

## Table: `customers`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **name** | `text` | NO | *NULL* |
| **email** | `text` | YES | *NULL* |
| **phone** | `text` | NO | *NULL* |
| **address** | `jsonb` | YES | `'{}'::jsonb` |
| **gstin** | `text` | YES | *NULL* |
| **properties** | `jsonb` | YES | `'[]'::jsonb` |
| **opening_balance** | `numeric` | YES | `0` |
| **closing_balance** | `numeric` | YES | `0` |
| **jobs_done** | `integer` | YES | `0` |
| **active** | `boolean` | YES | `true` |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **firebase_uid** | `text` | YES | *NULL* |
| **ledger_id** | `uuid` | YES | *NULL* |
| **fcm_token** | `text` | YES | *NULL* |
| **username** | `text` | YES | *NULL* |
| **password_hash** | `text` | YES | *NULL* |
| **full_name** | `text` | YES | *NULL* |
| **source** | `text` | YES | *NULL* |
| **profile_complete** | `boolean` | YES | `false` |
| **image_url** | `text` | YES | *NULL* |

## Table: `technicians`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **name** | `text` | NO | *NULL* |
| **email** | `text` | YES | *NULL* |
| **phone** | `text` | NO | *NULL* |
| **skills** | `ARRAY` | YES | `'{}'::text[]` |
| **status** | `text` | YES | `'available'::text` |
| **active** | `boolean` | YES | `true` |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **username** | `text` | YES | *NULL* |
| **password_hash** | `text` | YES | *NULL* |
| **is_active** | `boolean` | YES | `true` |
| **ledger_id** | `uuid` | YES | *NULL* |
| **firebase_uid** | `text` | YES | *NULL* |
| **fcm_token** | `text` | YES | *NULL* |
| **photo_url** | `text` | YES | *NULL* |
| **rating** | `numeric` | YES | `0` |
| **years_experience** | `integer` | YES | `0` |
| **bio** | `text` | YES | *NULL* |
| **specializations** | `ARRAY` | YES | *NULL* |
| **customer_card_fields** | `jsonb` | YES | `'{"show_bio": false, "show_name": true, "show_photo": true, "show_rating": true, "show_experience": true}'::jsonb` |
| **current_session_token** | `text` | YES | *NULL* |
| **last_device_ip** | `text` | YES | *NULL* |
| **date_joined** | `date` | YES | *NULL* |
| **last_working_day** | `date` | YES | *NULL* |
| **weekly_off_day** | `text` | YES | `'Sunday'::text` |
| **aadhaar_url** | `text` | YES | *NULL* |
| **pan_url** | `text` | YES | *NULL* |
| **appointment_letter_url** | `text` | YES | *NULL* |
| **is_fired** | `boolean` | YES | `false` |
| **mdm_device_id** | `text` | YES | *NULL* |

## Table: `accounts`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **name** | `text` | NO | *NULL* |
| **type** | `text` | NO | *NULL* |
| **under** | `text` | NO | *NULL* |
| **gstin** | `text` | YES | *NULL* |
| **address** | `jsonb` | YES | `'{}'::jsonb` |
| **opening_balance** | `numeric` | YES | `0` |
| **closing_balance** | `numeric` | YES | `0` |
| **active** | `boolean` | YES | `true` |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **sku** | `text` | YES | *NULL* |
| **alias** | `text` | YES | *NULL* |
| **contact_person** | `text` | YES | *NULL* |
| **mobile** | `text` | YES | *NULL* |
| **email** | `text` | YES | *NULL* |
| **mailing_name** | `text` | YES | *NULL* |
| **mailing_address** | `text` | YES | *NULL* |
| **billing_address** | `text` | YES | *NULL* |
| **shipping_address** | `text` | YES | *NULL* |
| **pan** | `text` | YES | *NULL* |
| **state_name** | `text` | YES | *NULL* |
| **country** | `text` | YES | *NULL* |
| **credit_limit** | `numeric` | YES | `0` |
| **credit_period** | `integer` | YES | `0` |
| **bank_name** | `text` | YES | *NULL* |
| **account_number** | `text` | YES | *NULL* |
| **ifsc_code** | `text` | YES | *NULL* |
| **branch** | `text` | YES | *NULL* |
| **tax_rate** | `numeric` | YES | `0` |
| **acquisition_source** | `text` | YES | *NULL* |
| **referred_by** | `text` | YES | *NULL* |
| **properties** | `jsonb` | YES | `'[]'::jsonb` |
| **as_on_date** | `date` | YES | `CURRENT_DATE` |
| **balance_type** | `text` | YES | `'dr'::text` |
| **asset_category** | `text` | YES | *NULL* |
| **purchase_date** | `date` | YES | *NULL* |
| **purchase_value** | `numeric` | YES | `0` |
| **depreciation_method** | `text` | YES | *NULL* |
| **depreciation_rate** | `numeric` | YES | `0` |
| **useful_life** | `integer` | YES | `0` |
| **status** | `text` | YES | `'active'::text` |
| **phone** | `text` | YES | *NULL* |
| **jobs_done** | `integer` | YES | `0` |
| **micr_code** | `text` | YES | *NULL* |
| **account_type** | `text` | YES | `'savings'::text` |
| **enable_cheque_printing** | `boolean` | YES | `false` |
| **rounding_method** | `text` | YES | `'normal'::text` |
| **currency** | `text` | YES | `'INR'::text` |
| **gst_applicable** | `boolean` | YES | `false` |

## Table: `account_groups`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `text` | NO | *NULL* |
| **name** | `text` | NO | *NULL* |
| **alias** | `text` | YES | *NULL* |
| **parent** | `text` | YES | *NULL* |
| **nature** | `text` | YES | `'asset'::text` |
| **behavesAsSubLedger** | `boolean` | YES | `false` |
| **nettDebitCreditBalance** | `text` | YES | `'not-applicable'::text` |
| **usedForCalculation** | `text` | YES | `'none'::text` |
| **allocationMethod** | `text` | YES | `'not-applicable'::text` |
| **createdAt** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |

## Table: `transactions`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `uuid_generate_v4()` |
| **transaction_type** | `character varying` | YES | *NULL* |
| **transaction_number** | `character varying` | YES | *NULL* |
| **transaction_date** | `date` | NO | *NULL* |
| **account_id** | `uuid` | YES | *NULL* |
| **customer_id** | `uuid` | YES | *NULL* |
| **job_id** | `uuid` | YES | *NULL* |
| **amount** | `numeric` | NO | *NULL* |
| **tax_amount** | `numeric` | YES | `0.00` |
| **total_amount** | `numeric` | NO | *NULL* |
| **payment_method** | `character varying` | YES | *NULL* |
| **payment_status** | `character varying` | YES | `'pending'::character varying` |
| **notes** | `text` | YES | *NULL* |
| **created_by** | `character varying` | YES | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |

## Table: `transaction_line_items`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `uuid_generate_v4()` |
| **transaction_id** | `uuid` | YES | *NULL* |
| **item_type** | `character varying` | YES | *NULL* |
| **item_id** | `uuid` | YES | *NULL* |
| **description** | `text` | YES | *NULL* |
| **quantity** | `numeric` | YES | `1` |
| **unit** | `character varying` | YES | *NULL* |
| **rate** | `numeric` | NO | *NULL* |
| **amount** | `numeric` | NO | *NULL* |
| **tax_rate** | `numeric` | YES | `0.00` |
| **tax_amount** | `numeric` | YES | `0.00` |
| **total_amount** | `numeric` | NO | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |

## Table: `journal_entries`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **entry_number** | `character varying` | NO | *NULL* |
| **date** | `date` | NO | `CURRENT_DATE` |
| **reference_type** | `character varying` | NO | *NULL* |
| **reference_id** | `uuid` | YES | *NULL* |
| **notes** | `text` | YES | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **created_by** | `character varying` | YES | *NULL* |

## Table: `journal_entry_lines`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **journal_entry_id** | `uuid` | NO | *NULL* |
| **account_id** | `uuid` | NO | *NULL* |
| **debit** | `numeric` | NO | `0.00` |
| **credit** | `numeric` | NO | `0.00` |
| **description** | `text` | YES | *NULL* |

## Table: `sales_invoices`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **invoice_number** | `text` | NO | *NULL* |
| **reference** | `text` | YES | *NULL* |
| **account_id** | `uuid` | YES | *NULL* |
| **account_name** | `text` | NO | *NULL* |
| **date** | `date` | NO | *NULL* |
| **items** | `jsonb` | YES | `'[]'::jsonb` |
| **billing_address** | `text` | YES | *NULL* |
| **shipping_address** | `text` | YES | *NULL* |
| **subtotal** | `numeric` | YES | `0` |
| **discount** | `numeric` | YES | `0` |
| **cgst** | `numeric` | YES | `0` |
| **sgst** | `numeric` | YES | `0` |
| **igst** | `numeric` | YES | `0` |
| **total_tax** | `numeric` | YES | `0` |
| **total_amount** | `numeric` | YES | `0` |
| **status** | `text` | YES | `'draft'::text` |
| **notes** | `text` | YES | *NULL* |
| **terms** | `text` | YES | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **job_id** | `uuid` | YES | *NULL* |
| **account_mobile** | `text` | YES | `''::text` |
| **account_email** | `text` | YES | `''::text` |
| **account_address** | `text` | YES | `''::text` |
| **account_gstin** | `text` | YES | `''::text` |
| **account_state** | `text` | YES | `''::text` |
| **items_subtotal** | `numeric` | YES | `0` |
| **charges_total** | `numeric` | YES | `0` |
| **account_phone** | `text` | YES | `''::text` |
| **paid_amount** | `numeric` | YES | `0` |
| **technician_id** | `uuid` | YES | *NULL* |
| **technician_name** | `text` | YES | *NULL* |

## Table: `purchase_invoices`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **invoice_number** | `text` | NO | *NULL* |
| **reference** | `text` | YES | *NULL* |
| **account_id** | `uuid` | YES | *NULL* |
| **account_name** | `text` | NO | *NULL* |
| **date** | `date` | NO | *NULL* |
| **items** | `jsonb` | YES | `'[]'::jsonb` |
| **billing_address** | `text` | YES | *NULL* |
| **shipping_address** | `text` | YES | *NULL* |
| **subtotal** | `numeric` | YES | `0` |
| **discount** | `numeric` | YES | `0` |
| **cgst** | `numeric` | YES | `0` |
| **sgst** | `numeric` | YES | `0` |
| **igst** | `numeric` | YES | `0` |
| **total_tax** | `numeric` | YES | `0` |
| **total_amount** | `numeric` | YES | `0` |
| **status** | `text` | YES | `'draft'::text` |
| **notes** | `text` | YES | *NULL* |
| **terms** | `text` | YES | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **job_id** | `uuid` | YES | *NULL* |
| **category** | `text` | YES | *NULL* |
| **po_reference** | `text` | YES | *NULL* |
| **vendor_invoice_number** | `text` | YES | *NULL* |
| **account_phone** | `text` | YES | *NULL* |
| **account_email** | `text` | YES | *NULL* |
| **paid_amount** | `numeric` | YES | `0` |
| **handed_to_service_center** | `boolean` | YES | `false` |
| **paid_by** | `text` | YES | `'company'::text` |

## Table: `receipt_vouchers`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **receipt_number** | `text` | NO | *NULL* |
| **reference** | `text` | YES | *NULL* |
| **account_id** | `uuid` | YES | *NULL* |
| **account_name** | `text` | NO | *NULL* |
| **date** | `date` | NO | *NULL* |
| **amount** | `numeric` | NO | *NULL* |
| **payment_mode** | `text` | YES | `'cash'::text` |
| **reference_number** | `text` | YES | *NULL* |
| **narration** | `text` | NO | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **payment_account_id** | `uuid` | YES | *NULL* |
| **job_id** | `uuid` | YES | *NULL* |
| **status** | `text` | YES | `'cleared'::text` |
| **source** | `text` | YES | *NULL* |
| **created_by** | `text` | YES | *NULL* |

## Table: `payment_vouchers`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **payment_number** | `text` | NO | *NULL* |
| **reference** | `text` | YES | *NULL* |
| **account_id** | `uuid` | YES | *NULL* |
| **account_name** | `text` | NO | *NULL* |
| **date** | `date` | NO | *NULL* |
| **amount** | `numeric` | NO | *NULL* |
| **payment_mode** | `text` | YES | `'cash'::text` |
| **reference_number** | `text` | YES | *NULL* |
| **narration** | `text` | NO | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **payment_account_id** | `uuid` | YES | *NULL* |
| **job_id** | `uuid` | YES | *NULL* |
| **status** | `text` | YES | `'cleared'::text` |
| **source** | `text` | YES | *NULL* |
| **created_by** | `text` | YES | *NULL* |

## Table: `expenses`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **technician_id** | `uuid` | YES | *NULL* |
| **technician_name** | `text` | YES | *NULL* |
| **date** | `timestamp with time zone` | YES | `now()` |
| **category** | `text` | NO | *NULL* |
| **amount** | `numeric` | NO | `0` |
| **description** | `text` | YES | *NULL* |
| **receipt** | `text` | YES | *NULL* |
| **job_id** | `uuid` | YES | *NULL* |
| **status** | `text` | NO | `'pending'::text` |
| **submitted_date** | `timestamp with time zone` | YES | `now()` |
| **approved_by** | `text` | YES | *NULL* |
| **approved_date** | `timestamp with time zone` | YES | *NULL* |
| **notes** | `text` | YES | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **admin_notes** | `text` | YES | *NULL* |
| **reviewed_at** | `timestamp with time zone` | YES | *NULL* |
| **reviewed_by** | `text` | YES | *NULL* |
| **payment_voucher_id** | `uuid` | YES | *NULL* |
| **latitude** | `double precision` | YES | *NULL* |
| **longitude** | `double precision` | YES | *NULL* |
| **purchase_invoice_id** | `uuid` | YES | *NULL* |

## Table: `active_amcs`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **customer_id** | `uuid` | YES | *NULL* |
| **customer_name** | `text` | YES | *NULL* |
| **plan_id** | `uuid` | YES | *NULL* |
| **plan_name** | `text` | YES | *NULL* |
| **product_type** | `text` | YES | *NULL* |
| **product_brand** | `text` | YES | *NULL* |
| **product_model** | `text` | YES | *NULL* |
| **serial_number** | `text` | YES | *NULL* |
| **installation_address_id** | `uuid` | YES | *NULL* |
| **start_date** | `date` | NO | *NULL* |
| **end_date** | `date` | NO | *NULL* |
| **amc_amount** | `numeric` | NO | `0` |
| **payment_status** | `text` | YES | `'pending'::text` |
| **payment_date** | `date` | YES | *NULL* |
| **invoice_id** | `uuid` | YES | *NULL* |
| **status** | `text` | NO | `'active'::text` |
| **auto_renew** | `boolean` | YES | `false` |
| **notes** | `text` | YES | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **created_by** | `text` | YES | *NULL* |
| **termination_type** | `text` | YES | *NULL* |
| **terminated_at** | `timestamp with time zone` | YES | *NULL* |
| **termination_reason** | `text` | YES | *NULL* |
| **termination_waived** | `boolean` | YES | `false` |
| **early_termination_amount** | `numeric` | YES | *NULL* |

## Table: `active_rentals`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **customer_id** | `uuid` | YES | *NULL* |
| **customer_name** | `text` | YES | *NULL* |
| **plan_id** | `uuid` | YES | *NULL* |
| **product_name** | `text` | NO | *NULL* |
| **serial_number** | `text` | YES | *NULL* |
| **tenure** | `jsonb` | YES | `'{}'::jsonb` |
| **monthly_rent** | `numeric` | NO | `0` |
| **security_deposit** | `numeric` | NO | `0` |
| **setup_fee** | `numeric` | YES | `0` |
| **deposit_paid** | `boolean` | YES | `false` |
| **deposit_paid_date** | `date` | YES | *NULL* |
| **deposit_refunded** | `boolean` | YES | `false` |
| **rent_cycle** | `text` | YES | `'monthly'::text` |
| **next_rent_due_date** | `date` | YES | *NULL* |
| **rents_paid** | `integer` | YES | `0` |
| **rents_remaining** | `integer` | YES | `0` |
| **last_service_date** | `date` | YES | *NULL* |
| **next_service_date** | `date` | YES | *NULL* |
| **status** | `text` | NO | `'active'::text` |
| **delivery_address_id** | `uuid` | YES | *NULL* |
| **notes** | `text` | YES | *NULL* |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **created_by** | `text` | YES | *NULL* |
| **rent_advance** | `numeric` | YES | `0` |
| **end_date** | `date` | YES | *NULL* |
| **start_date** | `date` | YES | *NULL* |
| **deposit_amount** | `numeric` | YES | `0` |
| **deposit_receipt_id** | `text` | YES | *NULL* |
| **advance_receipt_id** | `text` | YES | *NULL* |
| **rent_receipts** | `jsonb` | YES | `'{}'::jsonb` |
| **termination_type** | `text` | YES | *NULL* |
| **terminated_at** | `timestamp with time zone` | YES | *NULL* |
| **termination_reason** | `text` | YES | *NULL* |
| **termination_waived** | `boolean` | YES | `false` |
| **early_termination_amount** | `numeric` | YES | *NULL* |

## Table: `inventory`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `uuid_generate_v4()` |
| **name** | `character varying` | NO | *NULL* |
| **category** | `character varying` | YES | *NULL* |
| **sku** | `character varying` | YES | *NULL* |
| **description** | `text` | YES | *NULL* |
| **quantity** | `integer` | YES | `0` |
| **unit** | `character varying` | YES | *NULL* |
| **min_stock_level** | `integer` | YES | `0` |
| **cost_price** | `numeric` | YES | *NULL* |
| **selling_price** | `numeric` | YES | *NULL* |
| **supplier** | `character varying` | YES | *NULL* |
| **location** | `character varying` | YES | *NULL* |
| **active** | `boolean` | YES | `true` |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |
| **brand** | `text` | YES | *NULL* |
| **type** | `text` | YES | `'product'::text` |
| **unit_of_measure** | `text` | YES | `'pcs'::text` |
| **opening_balance_qty** | `numeric` | YES | `0` |
| **opening_balance_date** | `date` | YES | `CURRENT_DATE` |
| **current_stock** | `numeric` | YES | `0` |
| **sale_price** | `numeric` | YES | `0` |
| **purchase_price** | `numeric` | YES | `0` |
| **gst_applicable** | `boolean` | YES | `false` |
| **gst_rate** | `numeric` | YES | `0` |
| **hsn_code** | `text` | YES | *NULL* |
| **sac_code** | `text` | YES | *NULL* |
| **visible_on_website** | `boolean` | YES | `true` |
| **service_terms_template** | `text` | YES | *NULL* |
| **status** | `text` | YES | `'active'::text` |
| **images** | `ARRAY` | YES | `'{}'::text[]` |
| **dealer_price** | `numeric` | YES | `0` |
| **retail_price** | `numeric` | YES | `0` |
| **job_type** | `text` | YES | *NULL* |
| **hsn_description** | `text` | YES | *NULL* |
| **terms_conditions** | `jsonb` | YES | `'[]'::jsonb` |

## Table: `technician_stock`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **technician_id** | `uuid` | NO | *NULL* |
| **product_id** | `uuid` | NO | *NULL* |
| **quantity** | `integer` | NO | `0` |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **updated_at** | `timestamp with time zone` | YES | `now()` |

## Table: `interactions`

| Column | Type | Nullable | Default |
| --- | --- | --- | --- |
| **id** | `uuid` | NO | `gen_random_uuid()` |
| **timestamp** | `timestamp with time zone` | YES | `now()` |
| **type** | `text` | NO | *NULL* |
| **category** | `text` | NO | *NULL* |
| **customer_id** | `uuid` | YES | *NULL* |
| **customer_name** | `text` | YES | *NULL* |
| **job_id** | `uuid` | YES | *NULL* |
| **invoice_id** | `uuid` | YES | *NULL* |
| **performed_by** | `text` | YES | *NULL* |
| **performed_by_name** | `text` | YES | *NULL* |
| **description** | `text` | YES | *NULL* |
| **metadata** | `jsonb` | YES | `'{}'::jsonb` |
| **source** | `text` | YES | `'System'::text` |
| **status** | `text` | YES | `'completed'::text` |
| **created_at** | `timestamp with time zone` | YES | `now()` |
| **property_id** | `uuid` | YES | *NULL* |

