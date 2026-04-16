const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

const adminArticles = [
    // ─────────────────────────────────────────────────────────────────────────
    // 1. DATABASE SCHEMA OVERVIEW
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-db-schema-overview',
        title: 'Database Schema Overview',
        icon: '🗄️',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['database', 'schema', 'supabase', 'tables', 'admin'],
        order_index: 100,
        content: `## Database Schema Overview

This article maps every Supabase table used in the Sorted Solutions platform and the relationships between them.

### Core Tables

| Table | Purpose |
|---|---|
| \`accounts\` | Master ledger for all customers, vendors, and asset accounts |
| \`customers\` | Auth-enabled customer users (linked to \`accounts\` via \`ledger_id\`) |
| \`technicians\` | Technician users with FCM tokens and assignment data |
| \`jobs\` | All service jobs (one-time, AMC, rental) |
| \`bookings\` | Website booking requests before conversion to jobs |
| \`active_amcs\` | Active AMC contracts linked to \`accounts\` |
| \`amc_plans\` | AMC plan templates (plan name, services, price) |
| \`active_rentals\` | Active rental contracts linked to \`accounts\` |
| \`products\` | Inventory items (spare parts, products) |
| \`services\` | Service catalog entries |

### Financial Tables

| Table | Purpose |
|---|---|
| \`sales_invoices\` | Customer-facing invoices |
| \`purchase_invoices\` | Vendor/purchase bills |
| \`quotations\` | Quotes sent to customers |
| \`receipt_vouchers\` | Payments received from customers |
| \`payment_vouchers\` | Payments made to vendors |
| \`receipt_voucher_allocations\` | Maps receipt → invoice (many-to-many) |
| \`payment_voucher_allocations\` | Maps payment → purchase invoice |

### Support & Notifications

| Table | Purpose |
|---|---|
| \`support_articles\` | SOP knowledge base articles |
| \`notifications\` | In-app notification records |
| \`notification_templates\` | Push notification content templates |
| \`push_subscriptions\` | Browser/PWA push subscription endpoints |
| \`interactions\` | Full audit log of every system event |`,
        admin_content: `## Admin Technical Notes

### Key Relationships
- \`accounts.id\` ← \`jobs.account_id\` (customer for the job)
- \`accounts.id\` ← \`active_amcs.account_id\`
- \`accounts.id\` ← \`active_rentals.account_id\`
- \`customers.ledger_id\` → \`accounts.id\` (auth user linked to ledger)
- \`technicians.id\` ← \`jobs.technician_id\`
- \`jobs.id\` ← \`interactions.entity_id\` (when category is 'job')

### RLS Policies
- Most tables have Row Level Security enabled
- Admin uses **service role key** (bypasses RLS)
- Technician and Customer APIs use **anon key** with policy-filtered queries
- \`support_articles\`: public read for \`audience='all'\`, service role for \`audience='admin'\`

### Supabase Project
- Project URL: \`NEXT_PUBLIC_SUPABASE_URL\` in \`.env.local\`
- Anon key: \`NEXT_PUBLIC_SUPABASE_ANON_KEY\`
- Service role key: \`SUPABASE_SERVICE_ROLE_KEY\` (never expose to client)`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 2. API ROUTES DIRECTORY
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-api-routes-directory',
        title: 'API Routes Directory (Full System)',
        icon: '🔌',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['api', 'routes', 'endpoints', 'admin', 'technical'],
        order_index: 101,
        content: `## API Routes Directory

All API routes are under \`/app/api/\`. They are Next.js Route Handlers.

### Admin Routes (\`/api/admin/\`)

| Route | Methods | Purpose |
|---|---|---|
| \`/api/admin/jobs\` | GET, POST, PUT, DELETE | Full job lifecycle |
| \`/api/admin/bookings\` | GET, POST, PUT | Website booking management |
| \`/api/admin/accounts\` | GET, POST, PUT, DELETE | Customer/vendor ledger |
| \`/api/admin/amc\` | GET, POST, PUT, DELETE | AMC contracts & plans |
| \`/api/admin/rental\` | GET, POST, PUT, DELETE | Rental contracts |
| \`/api/admin/transactions\` | GET, POST, PUT, DELETE | Invoices, quotations, vouchers |
| \`/api/admin/products\` | GET, POST, PUT, DELETE | Inventory/product catalog |
| \`/api/admin/services\` | GET, POST, PUT, DELETE | Service catalog |
| \`/api/admin/technicians\` | GET, POST, PUT | Technician management |
| \`/api/admin/interactions\` | GET | Audit log queries |
| \`/api/admin/reports\` | GET | Report data aggregation |

### Public / Shared Routes

| Route | Methods | Purpose |
|---|---|---|
| \`/api/support\` | GET, POST | Support articles (role-filtered) |
| \`/api/support/[slug]\` | GET, PUT | Single article read/update |
| \`/api/notifications\` | GET, POST | In-app notifications |
| \`/api/push/subscribe\` | POST | Register push subscription |
| \`/api/push/send\` | POST | Fire push notification |
| \`/api/auth/customer\` | POST | Customer login/signup |
| \`/api/auth/technician\` | POST | Technician login |
| \`/api/razorpay/\` | POST | Payment order creation |
| \`/api/razorpay/webhook\` | POST | Razorpay event handler |`,
        admin_content: `## Admin Technical Notes

### Route Pattern
All admin routes follow: \`GET ?type=X\` to differentiate sub-resources (e.g., \`/api/admin/amc?type=plans\` vs \`type=active\`).

### Auth
- Admin app calls all \`/api/admin/\` routes directly — no JWT verification on the route itself
- Security depends on admin app being behind Vercel deployment + the admin password gate
- Future hardening: add admin session token validation on each route

### Supabase Client in Routes
All routes import from \`@/lib/supabase\` which uses the **service role key** for full DB access.`,
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 3. JOB LIFECYCLE — FULL TECHNICAL BREAKDOWN
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-job-lifecycle-technical',
        title: 'Job Lifecycle — Full Technical Breakdown',
        icon: '⚙️',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['job', 'lifecycle', 'database', 'notifications', 'interactions', 'api', 'admin'],
        order_index: 102,
        content: `## Job Lifecycle — Technical Breakdown

### Job Created by Admin
1. POST to \`/api/admin/jobs\`
2. Row inserted into \`jobs\` table
3. Interaction logged: \`type: 'job-created'\`, category: \`'job'\`
4. If technician assigned at creation → notification fired: \`job_assigned\`
5. Customer notified: \`job_created\` push + in-app notification

### Job Assigned to Technician
1. PUT to \`/api/admin/jobs\` with \`{ id, technician_id, technician_name, status: 'assigned' }\`
2. \`jobs\` row updated
3. Interaction logged: \`type: 'job-assigned'\`
4. Notification fired: \`job_assigned\` → sends push to technician FCM token

### Job Rescheduled
1. PUT to \`/api/admin/jobs\` with new \`scheduled_date\` / \`scheduled_time\`
2. Interaction logged: \`type: 'job-rescheduled'\`
3. Notification fired: \`job_rescheduled\` → customer push + in-app

### Job Completed by Technician
1. PUT to \`/api/technician/jobs/[id]\` with \`{ status: 'completed' }\`
2. \`jobs.status\` set to \`'completed'\`
3. Interaction logged: \`type: 'job-completed'\`
4. Notification fired: \`job_completed\` → customer push + in-app

### Job Cancelled
1. PUT to \`/api/admin/jobs\` with \`{ status: 'cancelled' }\`
2. Interaction logged: \`type: 'job-cancelled'\`
3. Notification fired: \`job_cancelled\` → customer push + in-app`,
        admin_content: `## DB Columns — \`jobs\` Table

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | Primary key |
| \`job_number\` | text | Auto-generated e.g. JOB-2025-001 |
| \`account_id\` | uuid | FK → \`accounts.id\` |
| \`technician_id\` | uuid | FK → \`technicians.id\` |
| \`technician_name\` | text | Denormalized for display |
| \`status\` | text | pending / assigned / in-progress / completed / cancelled |
| \`priority\` | text | low / normal / high / urgent |
| \`description\` | text | Job description |
| \`scheduled_date\` | date | |
| \`scheduled_time\` | time | |
| \`amc_id\` | uuid | FK → \`active_amcs.id\` (if AMC job) |
| \`rental_id\` | uuid | FK → \`active_rentals.id\` (if rental job) |
| \`job_type\` | text | one-time / amc / rental |
| \`created_at\` | timestamptz | |
| \`completed_at\` | timestamptz | Set on completion |

### Notification Events for Jobs
- \`job_created\` → customer
- \`job_assigned\` → technician
- \`job_rescheduled\` → customer
- \`job_completed\` → customer
- \`job_cancelled\` → customer`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 4. NOTIFICATION SYSTEM — TECHNICAL ARCHITECTURE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-notification-system-technical',
        title: 'Notification System — Technical Architecture',
        icon: '🔔',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['notifications', 'push', 'fcm', 'web-push', 'fire-notification', 'admin'],
        order_index: 103,
        content: `## Notification System Architecture

The system has two parallel notification channels:

### 1. In-App Notifications
- Stored in the \`notifications\` Supabase table
- Fetched by the app on load and periodically polled
- Displayed in the NotificationBell component (customer & technician apps)

### 2. Web Push / FCM Notifications
- Uses \`web-push\` library for PWA (customer/admin)
- Uses Firebase Cloud Messaging (FCM) for technician app
- Subscriptions stored in \`push_subscriptions\` table

### Trigger Function: \`fireNotification(event, context)\`
Located at \`lib/fire-notification.js\`

All notification triggers across the system call this single function:
\`\`\`js
await fireNotification('job_assigned', {
  customer_id: '...',
  technician_id: '...',
  job_id: '...'
})
\`\`\`

### Notification Events Reference

| Event | Recipient | Trigger |
|---|---|---|
| \`job_created\` | Customer | Job created by admin |
| \`job_assigned\` | Technician | Technician assigned to job |
| \`job_rescheduled\` | Customer | Job date/time changed |
| \`job_completed\` | Customer | Technician marks job done |
| \`job_cancelled\` | Customer | Job cancelled |
| \`booking_confirmed\` | Customer | Booking converted to job |
| \`sales_invoice_created\` | Customer | Invoice raised |
| \`quotation_sent\` | Customer | Quotation created |
| \`rental_contract_created\` | Customer | Rental or AMC contract activated |
| \`payment_received\` | Customer | Payment recorded via Razorpay |`,
        admin_content: `## Technical Implementation

### \`lib/fire-notification.js\` Flow
1. Looks up \`notification_templates\` by event name
2. Resolves recipient (customer or technician) from context
3. Fetches \`push_subscriptions\` for that user
4. Sends web-push payload to each subscription endpoint
5. Inserts a row into \`notifications\` table (in-app record)
6. Falls back gracefully if subscription is expired/invalid (410 status → deletes stale sub)

### \`notifications\` Table Columns
| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`user_id\` | text | customer_id or technician_id |
| \`user_type\` | text | 'customer' / 'technician' |
| \`event\` | text | e.g. 'job_assigned' |
| \`title\` | text | Notification title |
| \`body\` | text | Notification body text |
| \`data\` | jsonb | Extra payload (job_id, etc.) |
| \`is_read\` | boolean | |
| \`created_at\` | timestamptz | |

### \`push_subscriptions\` Table
| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`user_id\` | text | |
| \`user_type\` | text | |
| \`endpoint\` | text | Push service URL |
| \`keys\` | jsonb | \`{ p256dh, auth }\` |
| \`created_at\` | timestamptz | |`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 5. INTERACTION LOG — FULL EVENT MAP
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-interaction-log-event-map',
        title: 'Interaction Log — Full Event Type Map',
        icon: '📋',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['interactions', 'audit', 'log', 'events', 'admin', 'technical'],
        order_index: 104,
        content: `## Interaction Log — Event Type Map

Every meaningful action in the system logs an interaction entry. These are viewable in the CRM Interactions tab for each customer account.

### Job Events
| Event Type | Trigger |
|---|---|
| \`job-created\` | Admin creates a job |
| \`job-assigned\` | Technician assigned |
| \`job-rescheduled\` | Date/time changed |
| \`job-completed\` | Technician marks complete |
| \`job-cancelled\` | Job cancelled |
| \`job-note-added\` | Technician adds a note |
| \`job-note-edited\` | Technician edits a note |

### Financial Events
| Event Type | Category |
|---|---|
| \`sales-invoice-created\` | sales |
| \`sales-invoice-edited\` | sales |
| \`purchase-invoice-created\` | sales |
| \`quotation-sent\` | sales |
| \`quotation-edited\` | sales |
| \`receipt-voucher-created\` | sales |
| \`receipt-voucher-edited\` | sales |
| \`payment-voucher-created\` | sales |
| \`payment-voucher-edited\` | sales |

### Account Events
| Event Type | Trigger |
|---|---|
| \`customer-signup\` | Customer creates account on website |
| \`customer-claimed-account\` | Customer claims existing admin account |
| \`property-added\` | Property added to customer account |
| \`property-edited\` | Property details updated |

### Contract Events
| Event Type | Trigger |
|---|---|
| \`amc-created\` | AMC contract activated |
| \`rental-created\` | Rental contract activated |`,
        admin_content: `## \`interactions\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`type\` | text | Event type string (e.g. 'job-created') |
| \`category\` | text | 'job' / 'sales' / 'account' / 'note' |
| \`entity_id\` | text | Job ID, invoice ref, etc. |
| \`customer_id\` | text | FK to \`accounts.id\` |
| \`customer_name\` | text | Denormalized |
| \`performed_by_name\` | text | 'Admin', 'Technician Name', etc. |
| \`description\` | text | Human-readable event description |
| \`source\` | text | 'Admin' / 'Technician' / 'Customer' / 'System' |
| \`created_at\` | timestamptz | |

## Server-Side Logging: \`lib/log-interaction-server.js\`
Called from API routes — does not block the response (fire-and-forget).

\`\`\`js
logInteractionServer({
  type: 'job-completed',
  category: 'job',
  entityId: jobId,
  customerId: account_id,
  performedByName: technician_name,
  description: 'Job completed by technician',
  source: 'Technician',
})
\`\`\`

## Client-Side Logging: \`lib/log-interaction.js\`
Called from browser components for user-initiated actions. Posts to \`/api/admin/interactions\`.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 6. AMC CONTRACT — FULL TECHNICAL REFERENCE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-amc-technical-reference',
        title: 'AMC Contract — Full Technical Reference',
        icon: '🛡️',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['amc', 'contract', 'database', 'api', 'notifications', 'admin'],
        order_index: 105,
        content: `## AMC Contract — Technical Reference

### API Endpoints
- \`GET /api/admin/amc?type=plans\` — Fetch all active AMC plan templates
- \`GET /api/admin/amc?type=active\` — Fetch all active AMC contracts
- \`GET /api/admin/amc?type=active&customer_id=X\` — Contracts for one customer
- \`GET /api/admin/amc?type=active&status=expired\` — Filter by status
- \`POST /api/admin/amc?type=plan\` — Create new plan template
- \`POST /api/admin/amc?type=amc\` — Create new AMC contract
- \`PUT /api/admin/amc?type=amc\` — Update contract (status, dates, etc.)
- \`DELETE /api/admin/amc?type=amc&id=X\` — Delete contract (blocked if jobs exist)

### Tables Involved
- \`amc_plans\` — Plan templates (reusable)
- \`active_amcs\` — Individual customer contracts

### On AMC Creation (POST)
1. Row inserted into \`active_amcs\` with \`account_id\` (mapped from \`customer_id\` if needed)
2. Notification fired: \`rental_contract_created\` event → customer push + in-app
3. No interaction log on creation (add this in future if needed)

### Delete Protection
If an AMC has linked jobs (\`jobs.amc_id = amc.id\`), the DELETE endpoint returns a 400 with the blocking job list.`,
        admin_content: `## \`active_amcs\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`account_id\` | uuid | FK → \`accounts.id\` |
| \`plan_id\` | uuid | FK → \`amc_plans.id\` |
| \`customer_name\` | text | Denormalized |
| \`start_date\` | date | |
| \`end_date\` | date | |
| \`status\` | text | active / expired / archived |
| \`appliances\` | jsonb | List of covered appliances |
| \`address\` | text | Service address |
| \`notes\` | text | |
| \`created_at\` | timestamptz | |

## \`amc_plans\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`name\` | text | Plan display name |
| \`description\` | text | |
| \`price\` | numeric | |
| \`duration_months\` | int | |
| \`services_included\` | jsonb | List of service types |
| \`is_active\` | boolean | |
| \`created_at\` | timestamptz | |

## Notification Note
AMC uses the \`rental_contract_created\` event (same as rental). This was an intentional shortcut — both send the same "Your contract has been activated" message.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 7. RENTAL CONTRACT — FULL TECHNICAL REFERENCE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-rental-technical-reference',
        title: 'Rental Contract — Full Technical Reference',
        icon: '🏠',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['rental', 'contract', 'database', 'api', 'admin'],
        order_index: 106,
        content: `## Rental Contract — Technical Reference

### API Endpoints
- \`GET /api/admin/rental?type=active\` — All active rentals
- \`GET /api/admin/rental?type=active&customer_id=X\` — Rentals for one customer
- \`POST /api/admin/rental?type=rental\` — Create rental contract
- \`PUT /api/admin/rental?type=rental\` — Update rental details
- \`DELETE /api/admin/rental?type=rental&id=X\` — Delete rental

### Tables Involved
- \`active_rentals\` — Individual rental contracts

### On Rental Creation (POST)
1. Row inserted into \`active_rentals\`
2. Notification fired: \`rental_contract_created\` → customer push + in-app
3. Rental appears in Admin → Reports → Rentals tab

### Rental vs AMC
- **Rental**: Customer renting a physical appliance (e.g., AC unit)
- **AMC**: Annual maintenance contract for customer-owned appliances
- Both use same notification event, different tables`,
        admin_content: `## \`active_rentals\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`account_id\` | uuid | FK → \`accounts.id\` |
| \`customer_name\` | text | Denormalized |
| \`product_name\` | text | Rented appliance/product |
| \`product_id\` | uuid | FK → \`products.id\` (optional) |
| \`start_date\` | date | |
| \`end_date\` | date | |
| \`monthly_rent\` | numeric | |
| \`security_deposit\` | numeric | |
| \`status\` | text | active / expired / returned / archived |
| \`address\` | text | Delivery/installation address |
| \`notes\` | text | |
| \`created_at\` | timestamptz | |

## Admin UI
Rentals tab in Admin → Reports → Rentals. The \`RentalsTab.js\` component fetches from \`/api/admin/rental?type=active\` and renders a data table with status filters.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 8. TRANSACTIONS — INVOICES, VOUCHERS, QUOTATIONS
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-transactions-technical-reference',
        title: 'Transactions — Invoices, Quotations & Vouchers',
        icon: '💰',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['transactions', 'invoice', 'voucher', 'quotation', 'api', 'database', 'admin'],
        order_index: 107,
        content: `## Transactions — Full Technical Reference

Single API endpoint handles all transaction types via \`?type=\` query param.

### Transaction Types

| Type | Table | Number Field |
|---|---|---|
| \`sales\` | \`sales_invoices\` | \`invoice_number\` |
| \`purchase\` | \`purchase_invoices\` | \`invoice_number\` |
| \`quotation\` | \`quotations\` | \`quote_number\` |
| \`receipt\` | \`receipt_vouchers\` | \`receipt_number\` |
| \`payment\` | \`payment_vouchers\` | \`payment_number\` |

### API Endpoints
- \`GET /api/admin/transactions?type=sales\` — All sales invoices
- \`GET /api/admin/transactions?type=all&account_id=X\` — All transactions for a customer
- \`POST /api/admin/transactions?type=sales\` — Create sales invoice
- \`PUT /api/admin/transactions?type=sales\` — Edit invoice
- \`DELETE /api/admin/transactions?type=sales&id=X\` — Delete

### Notifications Fired on Creation
| Type | Event |
|---|---|
| \`sales\` | \`sales_invoice_created\` → customer push + in-app |
| \`quotation\` | \`quotation_sent\` → customer push + in-app |
| \`receipt\` | No notification (internal record) |
| \`payment\` | No notification (internal record) |`,
        admin_content: `## Column Allowlists (Strict Schema Enforcement)
The POST handler enforces per-table column allowlists to prevent schema errors:

**Sales Invoice**: invoice_number, reference, account_id, account_name, date, items, billing_address, shipping_address, subtotal, discount, cgst, sgst, igst, total_tax, total_amount, status, notes, terms, job_id

**Quotation**: quote_number, reference, account_id, account_name, date, items, billing_address, shipping_address, subtotal, discount, cgst, sgst, igst, total_tax, total_amount, status, notes, terms, valid_until, job_id

**Receipt Voucher**: receipt_number, reference, account_id, account_name, date, amount, payment_mode, notes, status, job_id

## Invoice Allocation (Receipt Vouchers)
When a receipt voucher is created with \`allocations\`:
1. Rows inserted into \`receipt_voucher_allocations\` (\`receipt_voucher_id\` + \`invoice_id\` + \`amount_applied\`)
2. For each allocated invoice: \`paid_amount\` updated on \`sales_invoices\`
3. Invoice status auto-updated to \`'paid'\` if \`paid_amount >= total_amount\`, else \`'partial'\`

## \`items\` JSON Structure
\`\`\`json
[
  {
    "description": "AC Service",
    "quantity": 1,
    "rate": 500,
    "amount": 500,
    "hsn": "998719"
  }
]
\`\`\``
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 9. ACCOUNTS / LEDGER SYSTEM
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-accounts-ledger-technical',
        title: 'Accounts & Ledger System — Technical Reference',
        icon: '🏦',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['accounts', 'ledger', 'customers', 'crm', 'database', 'admin'],
        order_index: 108,
        content: `## Accounts & Ledger System

The \`accounts\` table is the master ledger for all entities (customers, vendors, assets).

### Account Types
| Type | Usage |
|---|---|
| \`customer / sundry-debtors\` | Regular service customers |
| \`vendor / sundry-creditors\` | Spare part suppliers etc. |
| \`asset\` | Internal asset accounts (legacy) |

### How Customers Are Created
1. **Admin creates account** → direct insert into \`accounts\`
2. **Website signup** → \`customers\` row (auth) created first, then linked to \`accounts\` via \`ledger_id\`
3. **Website booking** → \`accounts\` entry created from booking data at conversion
4. **Claim flow** → Customer signs up with phone that matches existing admin account → linked via \`customers.ledger_id = accounts.id\`

### Key Fields
| Field | Purpose |
|---|---|
| \`id\` | Primary key (used as \`account_id\` in all financial tables) |
| \`name\` | Display name |
| \`phone\` / \`mobile\` | Contact numbers |
| \`email\` | Email address |
| \`mailing_address\` | Billing address |
| \`gstin\` | GST number for invoices |
| \`account_type\` | customer/vendor/asset |
| \`opening_balance\` | Initial balance for migration |`,
        admin_content: `## \`accounts\` Table Schema (Key Columns)

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | Primary key |
| \`name\` | text | Business or customer name |
| \`phone\` | text | Primary phone |
| \`mobile\` | text | Mobile number |
| \`email\` | text | |
| \`mailing_address\` | text | Default billing address |
| \`gstin\` | text | GST number |
| \`account_type\` | text | customer/vendor/asset |
| \`group_name\` | text | sundry-debtors / sundry-creditors / etc |
| \`opening_balance\` | numeric | For migrated accounts |
| \`opening_balance_type\` | text | 'debit' or 'credit' |
| \`created_at\` | timestamptz | |

## \`customers\` Table Schema (Auth Users)
| Column | Type | Notes |
| \`id\` | uuid | Supabase auth user ID |
| \`name\` | text | |
| \`phone\` | text | Used for login |
| \`email\` | text | |
| \`password_hash\` | text | bcrypt hashed password |
| \`ledger_id\` | uuid | FK → \`accounts.id\` |
| \`fcm_token\` | text | For push notifications |
| \`created_at\` | timestamptz | |

## AMC/Rental Lookup
When fetching AMC or rental by customer: the API checks both \`accounts.id\` AND any \`customers.id\` that maps to it via \`ledger_id\`, to handle both auth and ledger-only accounts.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 10. TECHNICIAN AUTH & FCM TOKENS
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-technician-auth-technical',
        title: 'Technician Auth & FCM Token System',
        icon: '🔐',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['technician', 'auth', 'fcm', 'notifications', 'database', 'admin'],
        order_index: 109,
        content: `## Technician Auth & Notification System

### Login Flow
1. Technician enters phone + password in the Technician App
2. POST to \`/api/auth/technician\` with \`{ phone, password }\`
3. Server fetches \`technicians\` row by phone, verifies bcrypt hash
4. Returns technician profile (id, name, phone, etc.)
5. Profile stored in \`localStorage\` (if "Keep me signed in") or \`sessionStorage\`

### FCM Token Registration
- On app load after login, the app requests Firebase notification permission
- FCM token generated and sent to \`/api/technician/register-token\`
- Token stored in \`technicians.fcm_token\`
- Used by \`fire-notification.js\` to deliver push to the correct device

### Tables
- \`technicians\` — Main technician data
- \`push_subscriptions\` — Web push subs (for PWA, if applicable)`,
        admin_content: `## \`technicians\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | Primary key |
| \`name\` | text | Display name |
| \`phone\` | text | Login phone |
| \`password_hash\` | text | bcrypt hashed |
| \`email\` | text | Optional |
| \`fcm_token\` | text | Latest FCM device token |
| \`is_active\` | boolean | Can log in? |
| \`created_at\` | timestamptz | |

## Admin Management
- Create/edit technicians: Admin → Settings → Technicians
- API: \`GET/POST/PUT /api/admin/technicians\`
- Resetting password: Update \`password_hash\` with new bcrypt hash via admin panel

## FCM Delivery Flow (job_assigned)
1. \`fireNotification('job_assigned', { technician_id })\`
2. Fetches \`technicians.fcm_token\` for that ID
3. Sends FCM message via Firebase Admin SDK
4. Also inserts \`notifications\` row with \`user_type: 'technician'\``
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 11. BOOKING → JOB CONVERSION FLOW
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-booking-conversion-technical',
        title: 'Booking → Job Conversion Flow',
        icon: '📅',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['booking', 'website', 'job', 'conversion', 'api', 'admin'],
        order_index: 110,
        content: `## Booking → Job Conversion Flow

### Website Booking Created
1. Visitor fills booking form on website
2. POST to \`/api/bookings\` (public route)
3. Row inserted into \`bookings\` table with status: \`'pending'\`
4. No notification at this stage (admin reviews manually)

### Admin Converts Booking to Job
1. Admin opens booking in Admin → Jobs → Bookings tab
2. Clicks "Convert to Job"
3. System creates/matches an \`accounts\` entry for the customer
4. POST to \`/api/admin/jobs\` with booking data
5. \`bookings.status\` updated to \`'converted'\`
6. Notification fired: \`booking_confirmed\` → customer push + in-app
7. Job appears in Jobs tab

### Booking Rejection
1. Admin changes booking status to \`'rejected'\`
2. PUT to \`/api/admin/bookings\` with \`{ status: 'rejected' }\``,
        admin_content: `## \`bookings\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`name\` | text | Visitor's name |
| \`phone\` | text | |
| \`email\` | text | |
| \`address\` | text | |
| \`service_type\` | text | What they need |
| \`preferred_date\` | date | |
| \`preferred_time\` | text | |
| \`appliance_type\` | text | |
| \`message\` | text | Any extra info |
| \`status\` | text | pending / converted / rejected |
| \`job_id\` | uuid | Set after conversion |
| \`created_at\` | timestamptz | |

## Account Matching on Conversion
When converting a booking:
1. Check if \`accounts\` row exists with same phone number
2. If yes → use existing account
3. If no → create new \`accounts\` row with type \`customer/sundry-debtors\``
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 12. CUSTOMER APP — AUTH & APPLIANCE FLOW
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-customer-app-technical',
        title: 'Customer App — Auth, Appliances & Services Flow',
        icon: '📱',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['customer', 'app', 'auth', 'appliance', 'signup', 'admin'],
        order_index: 111,
        content: `## Customer App — Technical Overview

### Signup Flow
1. Customer enters name, phone, password
2. POST to \`/api/auth/customer\` with \`{ action: 'signup', name, phone, password }\`
3. Server checks if phone exists in \`accounts\` (admin-created accounts)
4. If match → **claim flow**: customer account linked, \`customers\` row created, \`ledger_id\` set to existing account ID
5. If no match → new \`accounts\` row created, new \`customers\` row created
6. Interaction logged: \`customer-signup\` or \`customer-claimed-account\`

### Login Flow
1. POST to \`/api/auth/customer\` with \`{ action: 'login', phone, password }\`
2. bcrypt verify against \`customers.password_hash\`
3. Returns customer profile + linked \`accounts\` data
4. Stored in \`localStorage\` or \`sessionStorage\`

### Adding an Appliance
1. Customer taps "Add Appliance" in My Appliances tab
2. POST to \`/api/customer/appliances\`
3. Appliance details stored (brand, model, age, type)
4. Appliance appears in Jobs when raising a service request`,
        admin_content: `## Customer Auth API

**Endpoint**: \`POST /api/auth/customer\`

**Actions**:
- \`signup\` — Create new customer
- \`login\` — Verify credentials
- \`update-profile\` — Edit name/email

## Claim Flow Detail
This handles the case where admin created a customer in the ledger (from a job) and later the customer signs up on the website:
1. Phone match found in \`accounts\`
2. Check if \`customers\` row already exists with \`ledger_id = accounts.id\`
3. If not → create \`customers\` row, set \`ledger_id\`
4. If yes → return existing customer (duplicate check)
5. Log interaction: \`customer-claimed-account\`

## \`customers\` App Storage
After login, the profile is stored as JSON in \`localStorage\` key: \`sortedCustomer\` (or \`sessionStorage\` if not "keep signed in").

## Appliances Table
| Column | Type |
|---|---|
| \`id\` | uuid |
| \`customer_id\` | uuid → \`customers.id\` |
| \`appliance_type\` | text |
| \`brand\` | text |
| \`model\` | text |
| \`purchase_year\` | int |
| \`notes\` | text |`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 13. RAZORPAY PAYMENT SYSTEM
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-razorpay-technical',
        title: 'Razorpay Payment System — Technical Reference',
        icon: '💳',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['razorpay', 'payment', 'webhook', 'receipt', 'api', 'admin'],
        order_index: 112,
        content: `## Razorpay Payment System

### Payment Collection Flows

**1. Technician Collect Payment (Cash/QR)**
- Technician opens job → "Collect Payment" panel
- Selects amount + mode (cash/QR/WhatsApp link)
- POST to \`/api/technician/collect-payment\`
- Creates receipt voucher in \`receipt_vouchers\`
- Logs interaction: \`receipt-voucher-created\`
- Fires notification: \`payment_received\` → customer

**2. Online Payment (Customer App)**
- Customer views pending invoice
- Taps "Pay Now" → Razorpay checkout opens
- Payment order created: POST \`/api/razorpay/create-order\`
- On success → Razorpay webhook fires

**3. Razorpay Webhook**
- Endpoint: \`POST /api/razorpay/webhook\`
- Event: \`payment.captured\`
- Auto-creates receipt voucher
- Allocates to matching invoice
- Fires \`payment_received\` notification`,
        admin_content: `## Environment Variables Required
- \`RAZORPAY_KEY_ID\` — Public key
- \`RAZORPAY_KEY_SECRET\` — Secret (server only)
- \`RAZORPAY_WEBHOOK_SECRET\` — For webhook signature verification

## Webhook Security
Every incoming webhook is verified with \`razorpay.webhooks.verify\` using the webhook secret. Requests with invalid signatures are rejected with 400.

## Webhook Payload → Receipt Voucher Mapping
| Razorpay Field | Receipt Column |
|---|---|
| \`payload.payment.entity.amount / 100\` | \`amount\` |
| \`payload.payment.entity.method\` | \`payment_mode\` |
| \`payload.payment.entity.id\` | \`reference\` (Razorpay payment ID) |
| \`payload.payment.entity.notes.invoice_id\` | Used to allocate to invoice |
| \`payload.payment.entity.notes.account_id\` | \`account_id\` |

## Manual Fallback
If the webhook fails or payment is collected offline, admin can manually create a Receipt Voucher from Accounts → Receipt Voucher and allocate it to the correct invoice.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 14. PRODUCTS & INVENTORY
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-products-inventory-technical',
        title: 'Products & Inventory — Technical Reference',
        icon: '📦',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['products', 'inventory', 'spare-parts', 'api', 'database', 'admin'],
        order_index: 113,
        content: `## Products & Inventory

### API Endpoints
- \`GET /api/admin/products\` — All products
- \`GET /api/admin/products?id=X\` — Single product
- \`POST /api/admin/products\` — Create product
- \`PUT /api/admin/products\` — Update product (stock, price)
- \`DELETE /api/admin/products?id=X\` — Delete product

### Usage in Transactions
- Products appear as line items in Sales Invoices and Purchase Invoices
- When creating a purchase invoice → stock can increase
- Products are searchable in the invoice item picker

### Categories
Products can be categorized as:
- Spare Parts
- Consumables
- Finished Goods
- Rental Units`,
        admin_content: `## \`products\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`name\` | text | Product name |
| \`sku\` | text | Stock Keeping Unit |
| \`hsn_code\` | text | HSN for GST |
| \`category\` | text | |
| \`unit\` | text | pcs / kg / litre / etc. |
| \`purchase_price\` | numeric | Cost price |
| \`selling_price\` | numeric | MRP / sales price |
| \`stock_quantity\` | numeric | Current stock |
| \`min_stock_level\` | numeric | Alert threshold |
| \`description\` | text | |
| \`is_active\` | boolean | |
| \`created_at\` | timestamptz | |

## Inventory Tracking Note
Currently stock is tracked manually (admin edits \`stock_quantity\`). There is no automated stock decrement on job completion — this is a future build item.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 15. SERVICES CATALOG
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-services-catalog-technical',
        title: 'Services Catalog — Technical Reference',
        icon: '🔧',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['services', 'catalog', 'api', 'database', 'admin'],
        order_index: 114,
        content: `## Services Catalog

### Purpose
The services catalog stores all service types offered (e.g., "AC Service", "Split AC Installation"). Used for:
- Job description auto-fill
- Invoice line items
- AMC plan service inclusions

### API Endpoints
- \`GET /api/admin/services\` — All services
- \`POST /api/admin/services\` — Create service
- \`PUT /api/admin/services\` — Update service
- \`DELETE /api/admin/services?id=X\` — Delete service`,
        admin_content: `## \`services\` Table Schema

| Column | Type | Notes |
|---|---|---|
| \`id\` | uuid | |
| \`name\` | text | Service display name |
| \`category\` | text | AC / Washing Machine / Fridge / etc. |
| \`description\` | text | |
| \`default_price\` | numeric | Base price (overridable in invoice) |
| \`hsn_code\` | text | SAC code for GST |
| \`duration_minutes\` | int | Expected job duration |
| \`is_active\` | boolean | |
| \`created_at\` | timestamptz | |

## Usage in Admin UI
Services are shown in a searchable dropdown when creating jobs, invoices, and quotations. The \`default_price\` auto-fills the rate field in invoice items.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 16. SUPPORT SOP SYSTEM — TECHNICAL REFERENCE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-support-system-technical',
        title: 'Support SOP System — Technical Reference',
        icon: '📚',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['support', 'sop', 'articles', 'admin', 'database', 'api'],
        order_index: 115,
        content: `## Support SOP System — Technical Reference

### Architecture
- Articles stored in \`support_articles\` Supabase table
- API at \`/api/support\` (GET list) and \`/api/support/[slug]\` (GET/PUT single)
- Technician App: Settings → Support (reads \`audience='all'\` only)
- Admin App: Reports → Support SOPs (reads all, including \`audience='admin'\`)

### Audience Control
| Audience Value | Who Sees It |
|---|---|
| \`'all'\` | Technicians + Admin |
| \`'admin'\` | Admin only (hidden from technicians) |

### Content Sections
Each article has two content fields:
- \`content\` — Main article body (Markdown, tech + non-tech)
- \`admin_content\` — Behind the Scenes section (shown only to admin even for \`audience='all'\` articles)

### API Filtering
- \`GET /api/support?role=admin\` → returns all articles
- \`GET /api/support\` (no role) → returns only \`audience='all'\` articles, strips \`admin_content\``,
        admin_content: `## \`support_articles\` Table Schema

| Column | Type | Default |
|---|---|---|
| \`id\` | uuid | |
| \`slug\` | text | Unique URL identifier |
| \`title\` | text | |
| \`icon\` | text | Emoji |
| \`category\` | text | guides / jobs / billing / contracts / admin-technical |
| \`tags\` | text[] | For keyword search |
| \`content\` | text | Markdown body |
| \`admin_content\` | text | Admin-only behind-the-scenes section |
| \`audience\` | text | 'all' or 'admin' |
| \`is_published\` | boolean | true |
| \`order_index\` | int | Sort order |
| \`updated_at\` | timestamptz | |
| \`created_at\` | timestamptz | |

## Adding New Articles
1. Use the Admin Support editor (Admin → Reports → Support SOPs → New Article)
2. Or add to the seed script and run \`node scripts/seed-admin-articles.js\`
3. Set audience to 'Admin Only' for technical/sensitive content
4. Use Markdown for content formatting`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 17. PWA & PUSH NOTIFICATION SETUP
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-pwa-push-technical',
        title: 'PWA & Push Notification Setup',
        icon: '📲',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['pwa', 'push', 'web-push', 'vapid', 'manifest', 'admin'],
        order_index: 116,
        content: `## PWA & Push Notification Setup

### Progressive Web App
The main Next.js app is configured as a PWA:
- \`/public/manifest.json\` — App name, icons, theme color
- \`/public/sw.js\` — Service worker for offline + push
- Icons at \`/public/icons/\` in multiple sizes

### Web Push (VAPID)
Used for customer and admin browser push notifications:
- Public key: \`NEXT_PUBLIC_VAPID_PUBLIC_KEY\`
- Private key: \`VAPID_PRIVATE_KEY\`
- Contact email: \`VAPID_EMAIL\`

### FCM (Firebase Cloud Messaging)
Used for technician app push notifications:
- \`FIREBASE_SERVICE_ACCOUNT_JSON\` — Firebase Admin SDK credentials
- Technician stores FCM token in \`technicians.fcm_token\``,
        admin_content: `## Environment Variables for Push
\`\`\`
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_EMAIL=mailto:support@sorted.in
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
\`\`\`

## Service Worker Flow
1. On first app load, browser installs \`sw.js\`
2. App calls \`navigator.serviceWorker.ready\` → \`registration.pushManager.subscribe\`
3. Subscription (endpoint + keys) POSTed to \`/api/push/subscribe\`
4. Stored in \`push_subscriptions\` table
5. On event trigger: \`web-push.sendNotification(subscription, payload)\`
6. Service worker receives push → shows OS notification

## Expired Subscriptions
If push returns HTTP 410 (Gone), the subscription is auto-deleted from \`push_subscriptions\` by the notification sender.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 18. ADMIN APP ARCHITECTURE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-app-architecture',
        title: 'Admin App — Architecture & Navigation',
        icon: '🏗️',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['admin', 'app', 'architecture', 'navigation', 'components'],
        order_index: 117,
        content: `## Admin App Architecture

The Admin App is a Next.js application at \`/app/admin/\`.

### Main Tab Structure
| Tab | Component | Purpose |
|---|---|---|
| Dashboard | \`DashboardTab.js\` | Overview metrics |
| Jobs | \`JobsTab.js\` | Job management |
| Accounts / CRM | \`AccountsTab.js\` | Customer ledger & CRM |
| Inventory | \`InventoryTab.js\` | Products & stock |
| Reports | \`ReportsTab.js\` | Financial reports, rentals, AMC, support |
| Settings | \`SettingsTab.js\` | Technicians, services, admin config |

### Reports Sub-Tabs
- Sales Invoices
- Quotations
- Purchase Invoices
- Receipt Vouchers
- Payment Vouchers
- AMC Contracts
- Rental Contracts
- Support SOPs

### Settings Sub-Items
- Technicians
- Services
- AMC Plans
- Products
- Support SOPs`,
        admin_content: `## File Structure
\`\`\`
app/admin/
  page.js                    ← Main admin page (tab switcher)
  components/
    DashboardTab.js
    JobsTab.js
    AccountsTab.js
    InventoryTab.js
    ReportsTab.js
    SettingsTab.js
    reports/
      AMCTab.js
      RentalsTab.js
      AMCDetailsModal.js
      RentalDetailsModal.js
    shared/
      ImportExportButtons.js
components/admin/
  support/
    AdminSupportPanel.jsx
    AdminArticleEditor.jsx
\`\`\`

## Authentication
Admin app is locked behind a password gate:
- Password set in \`ADMIN_PASSWORD\` env var (or hardcoded in auth check)
- Stored in \`sessionStorage\` as \`adminAuth: true\`
- No role-based sub-permissions — any logged-in admin has full access`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 19. TECHNICIAN APP ARCHITECTURE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-technician-app-architecture',
        title: 'Technician App — Architecture & Tab Structure',
        icon: '🛠️',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['technician', 'app', 'architecture', 'navigation', 'admin'],
        order_index: 118,
        content: `## Technician App Architecture

The Technician App is a React single-file app at \`/components/technician/TechnicianApp.jsx\`.

### Tab Structure
| Tab | Purpose |
|---|---|
| Home | Today's jobs, quick stats |
| Jobs | Full job list with filters |
| Collections | Payment collection history |
| Settings | Profile, Support SOPs, logout |

### Settings Menu Items
- My Profile
- Support & SOPs (→ opens TechSupportTab)
- Logout

### Key Technician-Facing APIs
| Action | Endpoint |
|---|---|
| Get my jobs | \`GET /api/technician/jobs?technician_id=X\` |
| Update job status | \`PUT /api/technician/jobs/[id]\` |
| Add note | \`POST /api/technician/jobs/[id]/notes\` |
| Collect payment | \`POST /api/technician/collect-payment\` |
| Register FCM token | \`POST /api/technician/register-token\` |`,
        admin_content: `## Component File Structure
\`\`\`
components/technician/
  TechnicianApp.jsx      ← Main app shell (tabs, nav, auth)
  TechSupportTab.jsx     ← Support SOP browser (technician view)
\`\`\`

## Session Storage
After login, technician profile stored as JSON under key \`technicianUser\` in \`localStorage\` or \`sessionStorage\`.

Fields stored: \`{ id, name, phone, email, is_active }\`

## Job Status Flow (Technician Side)
\`pending\` → \`in-progress\` (Start Job button) → \`completed\` (Complete Job button)
Each PUT fires: interaction log + customer notification.

## Note Permissions
Technicians can only edit notes they created (check \`note.technician_id === currentUser.id\`).`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 20. WEBSITE ARCHITECTURE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-website-architecture',
        title: 'Website — Architecture & Key Pages',
        icon: '🌐',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['website', 'architecture', 'pages', 'seo', 'booking', 'admin'],
        order_index: 119,
        content: `## Website Architecture

The public-facing website is part of the same Next.js app at \`/app/\` (root routes).

### Key Pages
| Route | Purpose |
|---|---|
| \`/\` | Homepage |
| \`/services\` | Service listing |
| \`/book\` | Booking form |
| \`/contact\` | Contact page |
| \`/customer\` | Customer app (login/dashboard) |
| \`/technician\` | Technician app (login) |
| \`/admin\` | Admin app (password gated) |

### Booking Form Flow
1. Visitor fills form at \`/book\`
2. POST to \`/api/bookings\`
3. Booking saved in \`bookings\` table
4. Visitor sees confirmation message
5. Admin reviews in Jobs → Bookings tab

### Customer App Access
- Route: \`/customer\`
- Renders \`CustomerApp\` component
- Auth state from \`localStorage\` / \`sessionStorage\``,
        admin_content: `## Deployment
- Platform: **Vercel**
- Auto-deploy on push to \`main\` branch
- Environment variables in Vercel dashboard
- Domain: configured in Vercel → Settings → Domains

## Key .env.local Variables
\`\`\`
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
NEXT_PUBLIC_VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
VAPID_EMAIL=
FIREBASE_SERVICE_ACCOUNT_JSON=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
\`\`\`

## Codebase Root
\`c:\\Users\\KIIT\\OneDrive\\Desktop\\sorted-on-next\`
All scripts are in \`/scripts/\`, all Next.js pages in \`/app/\`, all reusable components in \`/components/\`.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 21. GST & TAX CALCULATION
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-gst-tax-calculation',
        title: 'GST & Tax Calculation Logic',
        icon: '🧾',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['gst', 'tax', 'cgst', 'sgst', 'igst', 'invoice', 'admin'],
        order_index: 120,
        content: `## GST & Tax Calculation

All invoices and quotations support GST calculation with CGST, SGST, and IGST.

### Tax Logic
- **Intra-state** (same state supply): CGST + SGST (each at half the GST rate)
- **Inter-state** (different state): IGST (full GST rate)
- **Exempt**: No tax applied

### Stored Fields
| Column | Meaning |
|---|---|
| \`subtotal\` | Total before tax and discount |
| \`discount\` | Flat or percentage discount |
| \`cgst\` | Central GST amount |
| \`sgst\` | State GST amount |
| \`igst\` | Integrated GST amount |
| \`total_tax\` | Sum of all taxes |
| \`total_amount\` | Final amount (subtotal - discount + total_tax) |

### GST Rates (Common)
| Service | SAC Code | Rate |
|---|---|---|
| AC Repair | 998719 | 18% |
| AC Installation | 995466 | 18% |
| Spare Parts | Various | 18% / 12% |`,
        admin_content: `## Calculation Formula
\`\`\`
subtotal = sum(item.quantity * item.rate)
taxable_amount = subtotal - discount
cgst = taxable_amount * (gst_rate / 2 / 100)
sgst = taxable_amount * (gst_rate / 2 / 100)
total_tax = cgst + sgst   (or igst for inter-state)
total_amount = taxable_amount + total_tax
\`\`\`

## Invoice Number Format
- Sales: \`INV-2025-001\`
- Quotation: \`QUO-2025-001\`
- Receipt: \`RCV-2025-001\`
- Payment: \`PMT-2025-001\`
- Purchase: \`PIN-2025-001\`

These are manually entered by admin when creating — not auto-generated by the system yet. Auto-increment is a future build item.`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 22. INTERACTION LOG — HOW TO QUERY
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-interaction-log-queries',
        title: 'Interaction Log — How to Query & Use',
        icon: '🔍',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['interactions', 'audit', 'query', 'crm', 'admin'],
        order_index: 121,
        content: `## Interaction Log — Querying

All interactions are stored in the \`interactions\` table and are queryable from the Admin CRM.

### How to View Interactions
1. Admin → Accounts → Open any customer
2. Go to the "Interactions" sub-tab
3. See all events for that customer in reverse chronological order

### Filtering Interactions
- By customer: \`customer_id\`
- By category: \`job\` / \`sales\` / \`account\` / \`note\`
- By date range: \`created_at\` between dates
- By source: \`Admin\` / \`Technician\` / \`Customer\` / \`System\`

### API
\`GET /api/admin/interactions?customer_id=X&category=job\``,
        admin_content: `## Direct Supabase Queries (for debugging)
\`\`\`sql
-- All interactions for a customer
SELECT * FROM interactions
WHERE customer_id = 'ACCOUNT_ID'
ORDER BY created_at DESC;

-- All job events today
SELECT * FROM interactions
WHERE category = 'job'
  AND created_at >= CURRENT_DATE;

-- Find who completed a job
SELECT * FROM interactions
WHERE type = 'job-completed'
  AND entity_id = 'JOB_UUID';
\`\`\`

## Adding New Interaction Types
When building a new feature, add interaction logging by calling:

**Server-side (API route)**:
\`\`\`js
import { logInteractionServer } from '@/lib/log-interaction-server'
logInteractionServer({ type: 'my-event', category: 'job', ... })
\`\`\`

**Client-side (browser component)**:
\`\`\`js
import { logInteraction } from '@/lib/log-interaction'
await logInteraction({ type: 'my-event', ... })
\`\`\``
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 23. ADMIN HANDOVER GUIDE
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-handover-guide',
        title: 'Admin Handover Guide — Complete System Overview',
        icon: '🤝',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['handover', 'overview', 'admin', 'onboarding', 'guide'],
        order_index: 122,
        content: `## Admin Handover Guide

This guide is for anyone taking over admin responsibilities for Sorted Solutions. Read this first.

### What We Have Built
1. **Admin App** (web, password protected) — Manage jobs, customers, invoices, contracts
2. **Technician App** (PWA, login by phone) — Field team job management & payment collection
3. **Customer App** (PWA, login by phone) — Customer self-service: bookings, invoices, notifications
4. **Public Website** — Booking form, service pages, company info

### Daily Admin Workflow
1. Check new bookings → Convert to jobs
2. Assign jobs to technicians
3. Monitor job status in Jobs tab
4. Raise invoices after job completion
5. Record payments as receipt vouchers
6. Review AMC/Rental renewals monthly

### Key Logins
- **Admin App**: \`/admin\` → password gate
- **Supabase**: console.supabase.com → project dashboard
- **Vercel**: vercel.com → deployment & env vars
- **Razorpay**: razorpay.com → payment dashboard`,
        admin_content: `## Critical Environment Variables
All are set in Vercel dashboard AND in \`.env.local\` for local dev:
- \`NEXT_PUBLIC_SUPABASE_URL\`
- \`SUPABASE_SERVICE_ROLE_KEY\` ← NEVER share this
- \`RAZORPAY_KEY_SECRET\` ← NEVER share this
- \`VAPID_PRIVATE_KEY\` ← NEVER share this
- \`FIREBASE_SERVICE_ACCOUNT_JSON\` ← NEVER share this

## If Something Breaks
1. Check Vercel deployment logs (vercel.com → project → deployments)
2. Check Supabase logs (console.supabase.com → logs)
3. Check browser console on the affected page
4. Check \`interactions\` table for the relevant event
5. Contact developer with: error message + which page + what action

## Codebase Location
\`c:\\Users\\KIIT\\OneDrive\\Desktop\\sorted-on-next\`
GitHub: bajajkunal1234/Sorted-SolutionsV1

## Monthly Maintenance Checklist
- [ ] Review expired AMC/Rental contracts
- [ ] Check low stock products
- [ ] Review pending bookings
- [ ] Download Razorpay settlement reports
- [ ] Verify technician FCM tokens are fresh (re-login if needed)`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 24. REPORTS TAB — WHAT EACH REPORT SHOWS
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-reports-tab-guide',
        title: 'Reports Tab — Full Guide',
        icon: '📊',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['reports', 'financial', 'amc', 'rental', 'invoices', 'admin'],
        order_index: 123,
        content: `## Reports Tab — Full Guide

The Reports tab in the Admin App is the financial and operational control center.

### Report Sections

| Section | Data Source | Shows |
|---|---|---|
| Sales Invoices | \`sales_invoices\` | All customer invoices with status |
| Quotations | \`quotations\` | All quotes, filter by status |
| Purchase Invoices | \`purchase_invoices\` | Vendor bills |
| Receipt Vouchers | \`receipt_vouchers\` | Payments received |
| Payment Vouchers | \`payment_vouchers\` | Payments made |
| AMC Contracts | \`active_amcs\` | All AMC contracts with renewal dates |
| Rental Contracts | \`active_rentals\` | All rental contracts with due dates |
| Support SOPs | \`support_articles\` | Knowledge base management |

### Financial Summary
The dashboard section shows:
- Total outstanding (unpaid invoices)
- Total collected (receipts)
- Active AMC count
- Active Rental count`,
        admin_content: `## API Calls in Reports

Each report section calls:
\`GET /api/admin/transactions?type=sales\`
\`GET /api/admin/transactions?type=receipt\`
\`GET /api/admin/amc?type=active\`
\`GET /api/admin/rental?type=active\`
\`GET /api/support?role=admin\`

## Export / Import
The \`ImportExportButtons\` component (in shared/) adds CSV export to any data table. Pass \`data\` and \`filename\` props.

## Invoice Status Codes
| Status | Meaning |
|---|---|
| \`draft\` | Not yet sent |
| \`sent\` | Sent to customer |
| \`partial\` | Partially paid |
| \`paid\` | Fully paid |
| \`overdue\` | Past due date |
| \`archived\` | Soft deleted |`
    },

    // ─────────────────────────────────────────────────────────────────────────
    // 25. BUILDING NEW FEATURES — CHECKLIST
    // ─────────────────────────────────────────────────────────────────────────
    {
        slug: 'admin-new-feature-checklist',
        title: 'Building New Features — Developer Checklist',
        icon: '✅',
        category: 'admin-technical',
        audience: 'admin',
        tags: ['development', 'checklist', 'new-feature', 'admin', 'technical'],
        order_index: 124,
        content: `## New Feature Developer Checklist

Use this checklist every time a new feature is built to ensure nothing is missed.

### Database
- [ ] Create migration SQL in \`/scripts/\`
- [ ] Run migration in Supabase SQL Editor
- [ ] Add RLS policies if needed
- [ ] Document table schema in the relevant admin support article

### API Route
- [ ] Create route file in \`/app/api/admin/\` or \`/app/api/technician/\`
- [ ] Add to the API Routes Directory article
- [ ] Handle errors with try/catch + NextResponse.json

### Notifications
- [ ] Identify who should be notified (customer / technician)
- [ ] Add notification template to \`notification_templates\` table
- [ ] Call \`fireNotification(event, context)\` in the API route
- [ ] Test: verify \`notifications\` row created + push received

### Interaction Logging
- [ ] Define interaction type string (e.g. \`my-feature-created\`)
- [ ] Call \`logInteractionServer\` in the API route
- [ ] Add to the Interaction Log Event Map article

### UI
- [ ] Build UI component in \`/components/admin/\` or \`/components/technician/\`
- [ ] Add to correct tab in admin/technician app
- [ ] Test on mobile viewport (most users are mobile)

### Support Articles
- [ ] Write a new support article explaining the feature
- [ ] Choose audience: \`all\` (if technician-facing) or \`admin\` (if admin-only)
- [ ] Add to seed script for future reseeding`,
        admin_content: `## Deployment Checklist
- [ ] Push to \`main\` branch
- [ ] Verify Vercel deployment succeeded (no build errors)
- [ ] Test on production URL
- [ ] Check Vercel logs for runtime errors

## Common Mistakes to Avoid
1. **Using anon key in API routes** → Always use service role key in \`lib/supabase.js\` for server-side
2. **Forgetting \`audience\` column** → New support articles must set audience explicitly
3. **Column not in allowlist** → Transactions API has strict column lists; update \`tableColumns\` when adding fields
4. **Stale FCM token** → If technician stops receiving notifications, ask them to log out and back in
5. **Expired push subscription** → System auto-deletes on 410, but manual cleanup can be done: \`DELETE FROM push_subscriptions WHERE user_id = '...'\`

## Version Control
\`\`\`
git add .
git commit -m "feat: description of what you built"
git push origin main
\`\`\``
    },
]

async function seedAdminArticles() {
    console.log(`Seeding ${adminArticles.length} admin-only articles...`)

    for (const article of adminArticles) {
        const { data: existing } = await supabase
            .from('support_articles')
            .select('id')
            .eq('slug', article.slug)
            .maybeSingle()

        if (existing) {
            const { error } = await supabase
                .from('support_articles')
                .update({
                    title: article.title,
                    icon: article.icon,
                    category: article.category,
                    tags: article.tags,
                    content: article.content,
                    admin_content: article.admin_content || '',
                    audience: article.audience || 'admin',
                    is_published: true,
                    order_index: article.order_index,
                    updated_at: new Date().toISOString(),
                })
                .eq('slug', article.slug)
            if (error) {
                console.error(`  ✗ Failed to update "${article.title}":`, error.message)
            } else {
                console.log(`  ↻ Updated: ${article.title}`)
            }
        } else {
            const { error } = await supabase
                .from('support_articles')
                .insert({
                    slug: article.slug,
                    title: article.title,
                    icon: article.icon,
                    category: article.category,
                    tags: article.tags,
                    content: article.content,
                    admin_content: article.admin_content || '',
                    audience: article.audience || 'admin',
                    is_published: true,
                    order_index: article.order_index,
                })
            if (error) {
                console.error(`  ✗ Failed to insert "${article.title}":`, error.message)
            } else {
                console.log(`  ✓ Inserted: ${article.title}`)
            }
        }
    }

    console.log('\nDone! Admin articles seeded.')
}

seedAdminArticles().catch(console.error)
