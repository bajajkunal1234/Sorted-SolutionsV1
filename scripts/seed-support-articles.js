// Seed script for Support SOP articles
// Run with: node scripts/seed-support-articles.js
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

const articles = [
    // ─────────────────── GUIDES ───────────────────
    {
        slug: 'technician-app-guide',
        title: 'How to Use the Technician App',
        icon: '📱',
        category: 'guides',
        tags: ['app', 'guide', 'login', 'technician', 'getting started'],
        order_index: 1,
        content: `## Quick Reference

**What is the Technician App?**
Your mobile workspace for managing all assigned jobs, tracking earnings, and communicating with the team.

### Getting Started
- Open the app at your company link and log in with your registered mobile number and password
- Your dashboard shows all jobs assigned to you, sorted by due date by default

### Main Tabs
| Tab | Purpose |
|-----|---------|
| 🔧 **Jobs** | View, filter, and open all your assigned jobs |
| 💰 **Expenses** | Log daily travel and tool expenses |
| 🏆 **Incentives** | Track your monthly earnings and performance |
| ⚙️ **Settings** | Profile info, dark mode, leave requests, and **Support** |

### Job Views
You can switch between three views using the icons at the top:
- **Card View** — Standard job cards
- **List View** — Compact one-line rows for quick scanning
- **Kanban View** — Columns grouped by status

### Sorting & Filtering
- Use the filter bar to search by customer name, brand, locality, or description
- Group jobs by: Status, Due Date, Priority, Locality, or Customer
- Save your preferred view by typing a name and saving it

### ⚠️ Important Rules
- Always update the job status in the app — this notifies the customer and admin automatically
- Never close an app mid-job; the system tracks job progress in real time
- If you face any issue you cannot resolve, refer to the **Support** section or message admin`,
        admin_content: `## Behind the Scenes

### Authentication
- Login hits \`POST /api/customer/auth\` with \`action: 'login'\`
- The API checks the \`technicians\` table first (by phone), then customers, then admin phones
- On success: role is \`'technician'\`. Session stored in \`technicianSession\` + \`technicianData\` localStorage keys
- FCM push token is registered via \`usePushNotifications({ userType: 'technician', userId: technicianId })\`

### Real-time Job Updates
- Supabase realtime channel subscribed: \`technician:jobs:{technicianId}\` watching \`jobs\` table for \`technician_id=eq.{id}\`
- Any DB change to a job assigned to this technician triggers an automatic refetch

### Location Tracking
- Background GPS ping runs every 60 seconds via \`navigator.geolocation\`
- Sends \`POST /api/technician/location\` silently (no UI shown to technician)
- Used by admin for the live technician map view`,
    },
    {
        slug: 'admin-app-guide',
        title: 'Admin App — Feature Overview',
        icon: '🖥️',
        category: 'guides',
        tags: ['admin', 'guide', 'overview', 'getting started'],
        order_index: 2,
        content: `## Quick Reference

**What is the Admin App?**
The central command center for managing jobs, customers, finances, rentals, AMCs, and all business settings.

### Main Tabs
| Tab | Purpose |
|-----|---------|
| 📋 **Jobs** | Create, assign, track, and manage all service jobs |
| 👥 **Accounts** | Customer CRM — profiles, properties, interactions, invoices |
| 📦 **Inventory** | Manage products, spare parts, and stock levels |
| 📊 **Reports** | Financials, notifications, settings, technician management, and SOPs |

### Key Workflows

**Creating a Job**
Go to Jobs tab → Click "Create Job" → Select customer → Fill details → Assign technician → Save

**Creating a Contract**
Go to Accounts → Select customer → Rent/AMC Tab → Create Rental or AMC

**Generating an Invoice**
Goes to Accounts → Select customer → Transactions tab → New Sales Invoice (or it auto-generates on job completion)

**Collecting Payment**
Accounts → Customer → Transactions → New Receipt Voucher

### ⚠️ Important Rules
- Always link a job to the correct customer account for proper interaction logging
- Deleting a job is permanent — prefer "cancelled" status instead
- Invoices auto-generate as DRAFT when a job is marked complete — always review before sending`,
        admin_content: `## Behind the Scenes

### Job status flow
\`booking_request\` → \`assigned\` → \`in-progress\` → \`quotation-sent\` (optional) → \`completed\` OR \`cancelled\`

### Data Architecture
- \`accounts\` — Unified customer ledger (type: customer / sundry-debtors)
- \`customers\` — Auth table for Customer App login, linked to accounts via \`ledger_id\`
- \`jobs\` — Central service request table
- \`active_rentals\` / \`active_amcs\` — Contract tables
- \`sales_invoices\` / \`purchase_invoices\` — Financial records
- \`transactions\` — Receipt and payment vouchers
- \`job_interactions\` — Timeline for each job
- \`interactions\` — Global audit trail across all entities`,
    },
    {
        slug: 'what-to-do-when-stuck',
        title: 'Stuck on a Job? Here\'s What to Do',
        icon: '🆘',
        category: 'guides',
        tags: ['help', 'stuck', 'escalate', 'decision', 'emergency'],
        order_index: 3,
        content: `## Quick Reference

### Decision Tree — When You Don't Know What to Do

**Problem 1: Cannot diagnose the issue**
→ Call admin. Do not guess. Record your findings in the job notes.

**Problem 2: Need a spare part**
→ Check if this is an AMC or Rental job first (see article: AMC Spare Parts Policy)
→ If normal job: Generate a Quotation in the app and wait for customer + admin approval before buying anything
→ Never spend money without approval

**Problem 3: Customer is refusing to pay**
→ Do not force. Call admin immediately. Do not leave the premises without completing the job or getting explicit admin instruction.

**Problem 4: Customer disputes the diagnosis**
→ Explain calmly. If unresolved, call admin. Log the conversation in job notes.

**Problem 5: Safety concern at the site**
→ Leave the premises immediately. Call admin. Your safety is the priority.

**Problem 6: App is not working**
→ Force-close and reopen. If issue persists, call admin and note the job details manually.

### Key Numbers to Remember
- Admin phone: Available in your Settings > Profile
- Always keep the job number handy when you call

### ⚠️ Golden Rules
- When in doubt: STOP and call admin. Do not improvise.
- Always update job status in the app so the customer and admin know where things stand
- Never collect cash without generating a receipt in the app`,
        admin_content: `## Behind the Scenes
No automated system triggers for this article — it is a policy and escalation guide.

**Relevant interaction types logged:**
- \`job-edited\` — whenever a technician updates notes or fields
- \`spare-part-requested\` — if technician uses the spare part request module

**Admin visibility:**
- All job note updates appear in the Job Timeline (job_interactions)
- Escalations should be handled by updating the job status to \`quotation-sent\` or leaving notes via the admin portal`,
    },

    // ─────────────────── JOBS ───────────────────
    {
        slug: 'job-lifecycle',
        title: 'Job Lifecycle — Complete Status Flow',
        icon: '🔄',
        category: 'jobs',
        tags: ['job', 'status', 'lifecycle', 'flow', 'booking', 'assigned', 'complete', 'cancel'],
        order_index: 10,
        content: `## Quick Reference

### Job Status Flow
\`\`\`
booking_request → assigned → in-progress → completed
                                         ↘ quotation-sent → completed
                              ↘ cancelled (at any stage)
\`\`\`

### What Each Status Means
| Status | Meaning | Who Sets It |
|--------|---------|-------------|
| \`booking_request\` | New job received, not yet assigned | System (auto on booking) |
| \`assigned\` | Technician has been assigned | Admin |
| \`in-progress\` | Technician has started work | Technician (via app) |
| \`quotation-sent\` | Waiting for customer approval on spare parts | Technician/Admin |
| \`completed\` | Job done, invoice auto-generated | Technician/Admin |
| \`cancelled\` | Job cancelled | Admin or Customer |

### ⚠️ Rules
- Always update status as soon as something changes — it triggers customer notifications
- You cannot complete a job that is marked as cancelled
- Completing a job automatically creates a draft invoice — remind admin to review it`,
        admin_content: `## Behind the Scenes

### Status Change API
- Technician updates: \`PUT /api/technician/jobs/[id]\`
- Admin updates: \`PUT /api/admin/jobs\`

### Notifications Fired on Status Change
| Status | Notification Event |
|--------|--------------------|
| \`assigned\` | \`job_assigned\` → sent to technician |
| \`in-progress\` | \`job_started\` → sent to customer |
| \`completed\` | \`job_completed\` → sent to customer |
| \`cancelled\` | \`job_cancelled\` → sent to customer + technician |
| \`quotation-sent\` | \`quotation_sent\` → sent to customer |

### Interaction Logs Created
Each status change logs a corresponding entry in \`interactions\` table via \`logInteractionServer()\`:
- \`job-assigned\`, \`job-started\`, \`job-completed\`, \`job-cancelled\`

### Auto Invoice on Complete
When status hits \`completed\`, the admin jobs API checks for an existing invoice for this job. If none exists, it auto-inserts a DRAFT \`sales_invoices\` record with 18% GST applied on \`job.amount\` (default ₹800 if not set). This is logged as \`sales-invoice-created-draft\` in \`job_interactions\`.`,
    },
    {
        slug: 'job-start',
        title: 'How to Start a Job',
        icon: '▶️',
        category: 'jobs',
        tags: ['job', 'start', 'in-progress', 'begin', 'visit'],
        order_index: 11,
        content: `## Quick Reference

### Before You Go
1. Open the job in the app and confirm the address and customer phone number
2. Tap **📍 Map** to navigate to the location
3. Carry the tools shown in your pre-visit checklist

### At the Customer's Location
1. Open the job on your app
2. Tap **Start Job**
3. A screen will appear asking you to confirm your location — accept GPS permission
4. Your location is shared with the customer so they know you've arrived
5. Status changes to **In Progress** automatically

### During the Job
- Add notes as you diagnose — always write what you found
- If you need spare parts, see the Spare Parts Decision article before buying anything
- Do not mark the job complete until all work is done and customer has confirmed

### ⚠️ Rules
- Do not start a job without opening it in the app first
- Never work on a job that is NOT assigned to you
- If the customer is not home, note it in the job and call admin`,
        admin_content: `## Behind the Scenes

### Start Job Flow
- Technician taps Start Job → \`StartJob.jsx\` component opens
- Captures GPS coordinates and optionally updates \`jobs.location\` field
- Calls \`PUT /api/technician/jobs/[id]\` with \`{ status: 'in-progress', started_at: ISO_DATE }\`
- Triggers \`job_started\` notification to customer via Notification Center
- Logs \`job-started\` interaction via \`logInteractionServer()\``,
    },
    {
        slug: 'job-complete',
        title: 'How to Complete a Job',
        icon: '✅',
        category: 'jobs',
        tags: ['job', 'complete', 'finish', 'done', 'invoice'],
        order_index: 12,
        content: `## Quick Reference

### Steps to Complete a Job
1. Ensure all repair work is done and customer is satisfied
2. If you collected payment — record it (see Receipt Voucher article)
3. Open the job in the app
4. Scroll to the bottom and tap **Mark as Complete**
5. Add a brief completion note (what was done)
6. Confirm

### After Completion
- Customer receives an automatic notification: "Your service is complete ✅"
- Admin receives a notification to review and finalise the invoice
- The system automatically creates a draft invoice — admin will finalise it

### ⚠️ Rules
- Do not mark complete without actually finishing the work
- Collect customer signature or confirmation verbally before completing
- If spare parts were used, make sure they are noted in the job before completing`,
        admin_content: `## Behind the Scenes

### On Job Completion
1. \`PUT /api/technician/jobs/[id]\` with \`{ status: 'completed', completed_at: ISO_DATE }\`
2. \`job_completed\` notification fires to customer
3. \`job-completed\` interaction logged globally
4. Admin API checks \`sales_invoices\` for existing invoice tied to this \`job_id\`. If none found:
   - Auto-creates DRAFT invoice with: \`subtotal = job.amount || 800\`, \`total_tax = subtotal * 0.18\`
   - Invoice number format: \`INV-YYYY-XXXX\`
   - Logs \`sales-invoice-created-draft\` in \`job_interactions\`

**Admin must review and finalise the draft invoice before sending to customer.**`,
    },
    {
        slug: 'job-cancel',
        title: 'How to Cancel a Job',
        icon: '❌',
        category: 'jobs',
        tags: ['job', 'cancel', 'cancellation'],
        order_index: 13,
        content: `## Quick Reference

### When Can a Job Be Cancelled?
- Any time before the job is marked **Completed**
- Both admin and customer can cancel

### Admin Cancellation
1. Open the job in admin portal
2. Change status dropdown to **Cancelled**
3. Add a reason in the notes field
4. Save

### Customer Cancellation
- Customer can cancel from their app up until the job is completed
- The system will automatically notify the assigned technician

### ⚠️ Rules
- A completed job CANNOT be cancelled — create a new job or adjustment instead
- Always add a reason when cancelling — it helps with reporting and follow-ups
- If a customer cancels on-site after you've already arrived, log it in notes and inform admin`,
        admin_content: `## Behind the Scenes

### Admin Cancellation
- \`PUT /api/admin/jobs\` with \`{ status: 'cancelled' }\`
- Logs \`job-cancelled\` interaction
- Fires \`job_cancelled\` notification to customer and technician

### Customer Cancellation
- \`PATCH /api/customer/jobs/[id]\` with \`{ action: 'cancel', customerId }\`
- API verifies the job \`customer_id\` matches the requesting customer
- Blocks if status is already \`'completed'\`
- Logs \`job_cancelled\` to the \`interactions\` table (not \`job_interactions\`)`,
    },
    {
        slug: 'spare-parts-decision',
        title: 'Spare Parts — What to Do',
        icon: '🔩',
        category: 'jobs',
        tags: ['spare parts', 'purchase', 'quotation', 'approval', 'buy', 'amc', 'rental'],
        order_index: 14,
        content: `## Quick Reference

### Decision Tree

**Step 1: Is this an AMC Job?**
→ Yes: Check the AMC terms. Most AMCs cover labour only. Parts must be approved by admin. See AMC Spare Parts Policy.
→ No: Go to Step 2

**Step 2: Is this a Rental Job?**
→ Yes: All spare parts for rental units must be reported to admin first. Do NOT buy without approval.
→ No: Go to Step 3

**Step 3: Normal Job**
→ Estimate the part cost
→ Generate a **Quotation** in the app with the part name, quantity, and price
→ Wait for admin to approve the quotation
→ Admin will confirm: buy it yourself and get reimbursed, OR admin will arrange the part

### ⚠️ Golden Rule
**Never buy spare parts out of pocket without admin approval.** If unreported, it will not be reimbursed.

### How to Request a Spare Part in the App
1. Open the job
2. Tap **Spare Part Request**
3. Fill in the part name, model compatibility, and estimated cost
4. Submit — Admin is notified immediately`,
        admin_content: `## Behind the Scenes

### Spare Part Request
- Uses \`SparePartRequest.jsx\` component in the technician app
- Creates a record in the database and logs a \`spare-part-requested\` interaction
- Admin can view this from the job's interactions timeline

### Quotation Flow
- Technician uses \`CreateQuotation.jsx\` to generate a formal quotation
- Quotation appears in the Accounts → customer → Transactions tab
- Customer can approve or reject via the Customer App
- On approval, technician is notified via push notification`,
    },

    // ─────────────────── QUOTATIONS ───────────────────
    {
        slug: 'quotation-how-to',
        title: 'How to Send a Quotation',
        icon: '📋',
        category: 'quotations',
        tags: ['quotation', 'quote', 'estimate', 'spare parts', 'approval', 'customer'],
        order_index: 20,
        content: `## Quick Reference

**What is a Quotation?**
A formal cost estimate sent to the customer for their approval before proceeding with repairs or spare part purchases.

### When to Send a Quotation
- When spare parts are needed and the total cost is significant
- When the customer asks for a written estimate before agreeing to repair
- After the initial diagnosis, before beginning actual repair work

### Steps — Technician (from app)
1. Open the job
2. Tap **🧮 Estimate** (opens Repair Calculator)
3. Add line items: labour, parts, quantities, and rates
4. Tap **Create Quotation**
5. The quotation is saved and admin is notified

### Steps — Admin (from portal)
1. Open the customer account or job
2. Go to Transactions → New Quotation
3. Fill in line items
4. Save and share with customer via WhatsApp

### ⚠️ Rules
- Always wait for explicit customer approval before buying parts or beginning major repairs
- If customer verbally approves, note it in the job and proceed — but still send quotation for records
- A sent quotation changes the job status to \`quotation-sent\``,
        admin_content: `## Behind the Scenes

### Quotation Record
- Created via \`QuotationForm.js\` in admin or via \`CreateQuotation.jsx\` in tech app
- Saved to \`sales_invoices\` table with \`type: 'quotation'\` (or a dedicated quotations table depending on your config)
- WhatsApp sharing via \`WhatsAppShareModal.js\`

### Job Status Update
- When a quotation is sent: job status → \`quotation-sent\`
- Fires \`quotation_sent\` notification to customer

### Customer Acceptance
- Customer can view and accept quotation in Customer App
- On acceptance, the job can proceed to completion`,
    },

    // ─────────────────── AMC ───────────────────
    {
        slug: 'amc-what-is',
        title: 'What is an AMC Contract?',
        icon: '🛡️',
        category: 'amc',
        tags: ['amc', 'annual maintenance contract', 'contract', 'service', 'subscription'],
        order_index: 30,
        content: `## Quick Reference

**AMC = Annual Maintenance Contract**

A paid subscription where a customer pays upfront for a full year of maintenance services on their appliance(s).

### What's Included in an AMC?
- Scheduled service visits (usually quarterly or as defined in the plan)
- Labour for all repairs during the contract period
- **Parts: Depends on the plan — always check before assuming**

### Key AMC Details (Check on Every AMC Job)
| Field | Where to Check |
|-------|---------------|
| Plan Name | Job details → AMC section |
| Start & End Date | Job details → AMC section |
| Parts Covered? | Check plan terms with admin |
| Next Service Date | AMC tab in admin / customer account |
| Auto Renew? | AMC tab |

### How AMC Jobs Work
1. Admin schedules a service visit → A job is created automatically
2. The job appears in your app linked to the AMC
3. You visit, complete the service, and mark the job complete
4. Admin updates the next service date

### ⚠️ Rules
- AMC jobs have a higher priority — treat them accordingly
- If the customer raises an issue NOT covered by their AMC, create a separate regular job
- Never cancel an AMC service visit without admin approval`,
        admin_content: `## Behind the Scenes

### AMC Contract Storage
- Stored in \`active_amcs\` table
- Linked to \`accounts.id\` via \`customer_id\`
- References an \`amc_plans\` plan for the plan name

### Scheduling a Service Job from AMC
- Admin clicks "Schedule Service" in \`RentAMCTab\`
- Creates a new job via \`jobsAPI.create()\` with \`{ source: 'amc', amc_id, status: 'scheduled' }\`
- Updates \`active_amcs.next_service_date\` to +1 month via \`PUT /api/admin/amc\`

### Termination
- Admin uses \`TerminationModal\` to terminate an AMC
- Calculates early termination dues = prorated remaining AMC amount
- Updates status on the \`active_amcs\` record`,
    },
    {
        slug: 'amc-spare-parts-policy',
        title: 'AMC Jobs — Spare Parts Policy',
        icon: '🔩',
        category: 'amc',
        tags: ['amc', 'spare parts', 'policy', 'parts covered', 'approval'],
        order_index: 31,
        content: `## Quick Reference

### Standard AMC Policy for Spare Parts

**Most AMC plans cover Labour Only.** Parts are usually NOT included unless specifically mentioned.

### What to Do When a Part Is Needed on an AMC Job:

1. **Stop. Do NOT buy the part.**
2. Diagnose the issue fully and note the exact part needed
3. Call admin and describe: the part name, model, approximate cost
4. Admin will tell you one of:
   - ✅ "Covered under AMC — we'll arrange the part"
   - ✅ "Create a quotation — we'll get customer approval"
   - ❌ "Not covered — raise a separate paid job"

### ⚠️ Absolute Rules
- **Zero parts purchases without admin approval on AMC jobs**
- If you bought a part without approval, it will NOT be reimbursed
- Always check if a separate job needs to be created for parts not in the AMC scope`,
        admin_content: `## Behind the Scenes

### AMC Parts Coverage
This is a business policy, not a system enforced rule. The system does not automatically check parts coverage.

Admin should:
- Always specify spare parts policy clearly when creating an AMC plan (\`AMCPlanForm.js\`)
- Train technicians to call before purchasing

### Creating a Separate Job for Out-of-Scope Items
Use the admin job creation form (\`CreateJobForm.js\`) to create a new job linked to the same customer but without the \`amc_id\` field. This ensures billing is separate from the AMC.`,
    },
    {
        slug: 'amc-schedule-service',
        title: 'How to Schedule an AMC Service Visit',
        icon: '📅',
        category: 'amc',
        tags: ['amc', 'schedule', 'service', 'visit', 'job creation'],
        order_index: 32,
        content: `## Quick Reference

**This is an admin action. Technicians receive the job once it is created.**

### Admin Steps
1. Go to **Accounts** → Select customer
2. Open the **Rent / AMC tab**
3. Find the active AMC contract
4. Click **📅 Schedule Service**
5. Select the scheduled date
6. Add a job description (e.g., "Quarterly AMC service for LG AC")
7. Click **Schedule Job**

A new job is automatically created and will appear in the technician's job list after you assign them.

### Technician Steps (after the job appears)
1. Open the job — it will show the AMC badge
2. Review the appliance details and customer address
3. Complete the visit as normal
4. Mark the job complete when done`,
        admin_content: `## Behind the Scenes

### When Schedule Service is Clicked
- \`jobsAPI.create()\` is called with \`{ customer_id, description, scheduled_date, source: 'amc', amc_id, status: 'scheduled', priority: 'medium' }\`
- A separate \`PUT /api/admin/amc\` call updates \`active_amcs.next_service_date\` to the selected date + 1 month
- The new job appears in the Jobs tab and can be manually assigned to a technician`,
    },

    // ─────────────────── RENTALS ───────────────────
    {
        slug: 'rental-what-is',
        title: 'What is a Rental Contract?',
        icon: '📦',
        category: 'rentals',
        tags: ['rental', 'rent', 'contract', 'monthly', 'subscription', 'appliance'],
        order_index: 40,
        content: `## Quick Reference

**Rental = Customer pays monthly to use a Sorted-owned appliance in their home.**

Examples: AC on rent, Washing Machine on rent, Water Purifier on rent

### Key Rental Details
| Field | Meaning |
|-------|---------|
| **Monthly Rent** | Fixed amount due each month |
| **Security Deposit** | One-time upfront payment at start |
| **Start / End Date** | Contract period |
| **Next Rent Due** | When the next payment is expected |
| **Rents Paid / Remaining** | Payment progress tracker |

### What the Technician Does on Rental Jobs
- Rental jobs get created by admin for: Installation, Servicing, or Pickup (on termination)
- These jobs are linked to the rental contract and need to be treated with care
- The appliance is our property — handle it with extra care

### ⚠️ Rules
- Never remove a rented appliance without explicit admin instruction
- If the customer has not paid rent, do NOT disconnnect/remove equipment. Call admin.
- If appliance is faulty, the repair is our responsibility — log it and inform admin`,
        admin_content: `## Behind the Scenes

### Rental Contract Storage
- Stored in \`active_rentals\` table linked to \`customer_id\` (account id)
- References \`rental_plans.product_name\` for the product
- Key fields: \`monthly_rent\`, \`security_deposit\`, \`deposit_paid\`, \`start_date\`, \`end_date\`, \`next_rent_due_date\`, \`rents_paid\`, \`rents_remaining\`

### Creating a Rental
- Admin uses \`NewRentalForm.js\` in the Reports tab → Rentals section
- Alternatively accessible from the customer's Rent/AMC tab

### Termination
- Admin uses \`TerminationModal\` to terminate
- Calculates early termination dues = remaining months × monthly rent
- Admin can generate a final invoice for early termination charges`,
    },
    {
        slug: 'rental-rent-collection',
        title: 'How Rent Collection Works',
        icon: '💰',
        category: 'rentals',
        tags: ['rent', 'collection', 'payment', 'receipt', 'monthly', 'rental'],
        order_index: 41,
        content: `## Quick Reference

**Rent collection is handled by admin or the technician if instructed.**

### Admin Steps (Collect Rent)
1. Go to **Accounts** → Select customer
2. Open **Rent / AMC Tab**
3. Find the active rental
4. Click **💰 Collect Rent**
5. Enter the amount, payment date, method (cash/UPI/bank), and transaction reference
6. Save

This automatically:
- Records a Receipt Voucher in the customer's account
- Marks the current month as paid
- Updates "Next Rent Due" to the following month

### If Technician Collects Cash on Site
1. Collect the cash and give a manual receipt if required
2. IMMEDIATELY call or message admin with: Customer Name, Amount, Date, and Payment Method
3. Admin will record it in the system from their end

### ⚠️ Rules
- Never collect rent without informing admin (even if the customer insists on paying on site)
- Always get the exact amount — no rounding
- If the customer's account shows overdue rent, inform admin before starting any service work`,
        admin_content: `## Behind the Scenes

### Collect Rent Flow (\`CollectRentForm.js\`)
1. Admin fills in payment data
2. A new \`receipt\` transaction is created in the \`transactions\` table via \`transactionsAPI.create()\`
3. The \`active_rentals\` record is updated:
   - \`rents_paid += 1\`
   - \`rents_remaining -= 1\`
   - \`next_rent_due_date\` set to current due date + 1 month
   - \`last_receipt_id\` linked to the new receipt
4. No automatic notification fires for rent collection — admin can send manual WhatsApp`,
    },
    {
        slug: 'rental-termination',
        title: 'Rental Termination Process',
        icon: '🚪',
        category: 'rentals',
        tags: ['rental', 'termination', 'end contract', 'pickup', 'early exit'],
        order_index: 42,
        content: `## Quick Reference

### When Is Termination Requested?
- Customer no longer wants the appliance
- Contract period has ended
- Non-payment / breach of terms

### Steps
1. **Admin initiates termination** via the Rent/AMC tab → Terminate button
2. Admin reviews early termination dues (auto-calculated if contract is mid-term)
3. Admin creates a final invoice for any outstanding amounts
4. **Admin creates a Pickup Job** and assigns it to a technician
5. **Technician visits, collects the appliance, and marks the job complete**
6. Admin confirms termination in the system

### Technician's Role in Termination
- Your only job is to safely collect and transport the appliance
- Do NOT get involved in any payment discussion with the customer
- Take photos of the appliance condition before picking up
- Mark the job complete only after the appliance is safely back at the service centre`,
        admin_content: `## Behind the Scenes

### Termination Modal (\`TerminationModal.js\`)
- Calculates early termination dues:
  - Rental: \`remaining months × monthly_rent\`
  - AMC: Prorated remaining AMC amount
- Admin confirms or waives the charge
- Updates \`active_rentals.status\` to \`'terminated'\`
- A manually created "Pickup" job should be added separately via \`CreateJobForm\``,
    },

    // ─────────────────── INVOICES ───────────────────
    {
        slug: 'sales-invoice',
        title: 'Sales Invoice — How It\'s Generated',
        icon: '🧾',
        category: 'invoices',
        tags: ['invoice', 'sales invoice', 'billing', 'gst', 'auto', 'complete'],
        order_index: 50,
        content: `## Quick Reference

**A Sales Invoice is the bill sent to the customer after a job is completed.**

### Auto-Generation
When a job is marked **Complete**, the system automatically creates a **Draft Invoice**. Admin reviews and finalises it before sending.

### Manual Invoice Creation
1. Admin goes to **Accounts** → Select customer
2. **Transactions tab** → **New Sales Invoice**
3. Add line items (service, parts, labour)
4. Set due date, GST rate (18% standard)
5. Save

### Invoice Statuses
| Status | Meaning |
|--------|---------|
| \`draft\` | Auto-created, needs admin review |
| \`sent\` | Sent to customer |
| \`paid\` | Payment received and allocated |
| \`overdue\` | Past due date |

### ⚠️ Rules
- Technicians do NOT create invoices
- If a customer asks for a bill, tell them admin will send it shortly
- Never quote a custom price not agreed upon — the invoice always reflects the agreed amount`,
        admin_content: `## Behind the Scenes

### Auto Invoice (on job completion)
- Triggered inside \`PUT /api/admin/jobs\` when \`updates.status === 'completed'\`
- Checks for existing invoice via \`sales_invoices.job_id\` to prevent duplicates
- If none found, inserts: \`{ invoice_number, account_id, account_name, job_id, date, status:'draft', subtotal, total_tax(18%), total_amount, items[...] }\`
- Logs \`sales-invoice-created-draft\` in \`job_interactions\`

### Manual Invoice
- Created via \`SalesInvoiceForm.js\`
- Stored in \`sales_invoices\` table
- Can be printed via \`PrintAgreementModal\` or shared via \`WhatsAppShareModal\``,
    },
    {
        slug: 'purchase-invoice',
        title: 'Purchase Invoice — When to Create',
        icon: '🛒',
        category: 'invoices',
        tags: ['purchase invoice', 'vendor', 'supplier', 'buy', 'expense'],
        order_index: 51,
        content: `## Quick Reference

**A Purchase Invoice records money paid TO a vendor for goods or services.**

### When to Create a Purchase Invoice
- When you buy spare parts from a supplier
- When you receive a vendor bill for goods delivered
- Monthly utility or tool purchases for the service centre

### Who Creates It?
**Admin only.** Technicians do not create purchase invoices.

### Steps
1. Admin goes to **Accounts** → Select the vendor account (or create one)
2. **Transactions tab** → **New Purchase Invoice**
3. Fill in: vendor name, items bought, quantity, rate, GST
4. Save

### ⚠️ Rules
- Keep all physical vendor bills/receipts for reconciliation
- Every spare part purchase must have a corresponding Purchase Invoice
- Purchase invoices are linked to the product inventory when applicable`,
        admin_content: `## Behind the Scenes

### Purchase Invoice Storage
- Created via \`PurchaseInvoiceForm.js\`
- Stored in \`purchase_invoices\` table
- Linked to vendor account (\`account_id\`) in the \`accounts\` table
- Can be reconciled against bank statements using the Bank Reconciler module`,
    },

    // ─────────────────── VOUCHERS ───────────────────
    {
        slug: 'receipt-voucher',
        title: 'Receipt Voucher — Payment Collection',
        icon: '💵',
        category: 'vouchers',
        tags: ['receipt', 'payment', 'collection', 'cash', 'upi', 'voucher'],
        order_index: 60,
        content: `## Quick Reference

**A Receipt Voucher is created every time you receive money FROM a customer.**

### When to Create One
- Customer pays for a completed job
- Customer pays monthly rent
- Customer pays AMC fees
- Any advance payment received

### Steps (Admin)
1. Go to **Accounts** → Select customer
2. **Transactions tab** → **New Receipt Voucher**
3. Fill in: Amount, Date, Payment Method (Cash/UPI/Bank Transfer), Reference number
4. Save

### Steps (Technician collecting cash on site)
1. Collect the cash
2. Note: Customer Name, Amount, Date, and Payment Method
3. Immediately message admin with these details
4. Admin will create the receipt voucher in the system

### ⚠️ Rules
- Never keep cash collected from customers without informing admin
- Always take the transaction reference number for UPI/bank payments
- Receipt Vouchers reduce the customer's outstanding balance in the system`,
        admin_content: `## Behind the Scenes

### Receipt Voucher Storage
- Created via \`ReceiptVoucherForm.js\`
- Stored in \`transactions\` table with \`type: 'receipt'\`
- Linked to \`account_id\` in the \`accounts\` table
- Reduces the account's debit balance (amount receivable from customer)
- For rent: auto-created by the "Collect Rent" flow and linked via \`last_receipt_id\` on the \`active_rentals\` record`,
    },
    {
        slug: 'payment-voucher',
        title: 'Payment Voucher — When Used',
        icon: '💸',
        category: 'vouchers',
        tags: ['payment', 'voucher', 'vendor', 'pay', 'expense', 'outgoing'],
        order_index: 61,
        content: `## Quick Reference

**A Payment Voucher is created every time you pay money TO someone (vendor, supplier, or partner).**

### When to Create One
- Paying a vendor for spare parts
- Paying a supplier for products
- Reimbursing a technician for approved expenses
- Any outgoing business payment

### Who Creates It?
**Admin only.**

### Steps
1. Go to **Accounts** → Select the vendor/payee account
2. **Transactions tab** → **New Payment Voucher**
3. Fill in: Amount, Date, Payment Method, Reference
4. Save

### ⚠️ Rules
- All payments must have a corresponding voucher for accounting purposes
- Technician reimbursements require an approved expense claim first`,
        admin_content: `## Behind the Scenes

### Payment Voucher Storage
- Created via \`PaymentVoucherForm.js\`
- Stored in \`transactions\` table with \`type: 'payment'\`
- Linked to vendor \`account_id\`
- Increases the account's credit balance (money flowing out)
- Can be reconciled via the Bank Statement Reconciler module`,
    },

    // ─────────────────── INVENTORY ───────────────────
    {
        slug: 'inventory-products',
        title: 'Inventory & Products Management',
        icon: '🏪',
        category: 'inventory',
        tags: ['inventory', 'product', 'stock', 'spare parts', 'warehouse'],
        order_index: 70,
        content: `## Quick Reference

**The Inventory tab tracks all products, spare parts, and materials the business holds.**

### What's in Inventory?
- Appliances on rent (with serial numbers)
- Spare parts and tools
- Products available for sale

### How to Check Stock
1. Admin → **Inventory tab**
2. Search by product name, brand, category, or SKU
3. Each product shows: Stock quantity, Location, Cost price, Selling price

### Technician Role
- Technicians do NOT manage inventory directly
- If you use a spare part from company stock, **tell admin** so they can adjust the count
- If you notice a product is listed incorrectly, report it to admin

### ⚠️ Rules
- Never take items from the store without logging it
- All inventory movements must be recorded by admin
- Serial numbers of rented appliances must be noted on every job`,
        admin_content: `## Behind the Scenes

### Inventory Storage
- Products stored in \`products\` or \`inventory_items\` table
- Combo products linked via \`ComboProductsLinking.js\`
- Reports available via \`InventoryReports.js\` — stock valuation, category breakdown, brand analysis

### Inventory Reports API
- \`GET /api/admin/inventory\` — full product list with stock levels
- Stock levels updated manually by admin or on Purchase Invoice creation`,
    },

    // ─────────────────── NOTIFICATIONS ───────────────────
    {
        slug: 'notification-reference',
        title: 'Notification Triggers Reference',
        icon: '🔔',
        category: 'notifications',
        tags: ['notifications', 'push', 'whatsapp', 'triggers', 'reference', 'events'],
        order_index: 80,
        content: `## Quick Reference

### What Triggers a Notification?

| Event | Customer Notified | Technician Notified |
|-------|-------------------|---------------------|
| Website Booking Created | ✅ | ❌ |
| Job Assigned to Technician | ❌ | ✅ |
| Job Started (In Progress) | ✅ | ❌ |
| Job Completed | ✅ | ❌ |
| Job Cancelled | ✅ | ✅ |
| Quotation Sent | ✅ | ❌ |
| Job Created by Admin | ✅ | ❌ |

### Types of Notifications
- **In-App Bell** — Appears in the notification bell icon in the app
- **Push Notification** — Sent to the device even when app is closed (requires permission)
- **WhatsApp** — Manual send via share buttons on key documents

### ⚠️ Rules (for Technicians)
- Do NOT ask customers to provide their phone numbers for "personal WhatsApp" — all communication must go through the official system
- If a customer hasn't received a notification, the app requires notification permission enabled on their phone`,
        admin_content: `## Behind the Scenes

### Notification System
- Configured in \`NotificationCenter.js\` in Reports tab
- Templates stored in Supabase \`notification_templates\` table
- Trigger events map in: \`lib/fire-notification.js\` — \`fireNotification(eventType, payload)\`

### Push Delivery
- Uses Firebase Cloud Messaging (FCM)
- FCM tokens stored in \`technician_fcm_tokens\` (technicians) and \`customer_fcm_tokens\` (customers)
- Notification permission requested on first app load via \`usePushNotifications()\` hook

### Adding New Notification Triggers
1. Add the event ID to the trigger map in \`fireNotification.js\`
2. Create a corresponding template in the Notification Center
3. Ensure the relevant event fires \`fireNotification('event_id', {...payload})\``,
    },

    // ─────────────────── INCENTIVES ───────────────────
    {
        slug: 'incentive-plan',
        title: 'Monthly Incentive Plan',
        icon: '🏆',
        category: 'incentives',
        tags: ['incentive', 'bonus', 'salary', 'performance', 'rating', 'commission'],
        order_index: 90,
        content: `## Quick Reference

**The Incentive System rewards technicians based on monthly performance.**

### What Counts Toward Your Incentive?
| Metric | What It Measures |
|--------|-----------------|
| **Jobs Completed** | Total jobs you marked complete in the month |
| **Revenue Generated** | Total billed amount from your completed jobs |
| **Customer Rating** | Average rating from customer feedback |

### How to Check Your Incentive
1. Open the app
2. Tap the **🏆 Incentives** tab
3. You'll see your current month's performance + incentive breakdown

### How Incentives Are Calculated
Your admin sets specific targets and bonus rates. The calculation runs automatically at the start of each new month.

### ⚠️ Rules
- Incentive is based on COMPLETED jobs only — incomplete or cancelled jobs do not count
- Customer rating is the average of all ratings given that month
- Disputes about incentive calculations must be raised with admin within 5 days of month end`,
        admin_content: `## Behind the Scenes

### Incentive Calculation
- Admin configures plans via \`IncentivesManagement.js\` in the Reports tab
- Technician fetches their incentive data from \`GET /api/technician/incentives?technicianId={id}\`
- The API aggregates: completed jobs count, sum of job amounts, average customer rating for the current billing period
- The plan rules (thresholds, multipliers) are applied server-side to compute the breakdown

### Incentive Data Storage
- Plan configurations stored in the database (managed via IncentivesManagement)
- Each month's payout is tracked for payroll purposes`,
    },

    // ─────────────────── PRICE LISTS ───────────────────
    {
        slug: 'price-list',
        title: 'Service Price List & Visiting Fees',
        icon: '💲',
        category: 'price-lists',
        tags: ['price', 'rate', 'fee', 'visiting', 'labour', 'charges', 'cost'],
        order_index: 100,
        content: `## Quick Reference

### Standard Visiting / Inspection Fee
- A visiting / inspection fee is charged when a technician visits even if no repair is done
- This fee is set by admin and is non-negotiable
- Always inform the customer upfront about this fee before visiting

### How to Know the Current Price
- Check with admin for the latest rate card — prices may change seasonally
- Prices are also publicly listed on the company website

### On-Site Pricing Rules
1. Never quote a price without checking the rate card or consulting admin
2. If the actual cost differs from your estimate, inform admin before proceeding
3. All pricing must be confirmed via a Quotation for significant repairs

### Common Service Categories
| Service | Typical Range | Notes |
|---------|--------------|-------|
| AC Service | Ask admin | Varies by type (split/window) |
| AC Repair | Ask admin | Depends on diagnosis |
| Washing Machine Repair | Ask admin | Part cost extra |
| Water Purifier Service | Ask admin | Filter cost extra |
| Refrigerator Repair | Ask admin | Gas refill extra |

*Contact admin for the current approved rate card.*`,
        admin_content: `## Behind the Scenes

### Price List Management
- Price lists are currently managed manually by admin
- The website booking form pulls service categories and pricing from \`website_section_configs\` in Supabase
- Technicians should receive an updated rate card at the start of each month
- Future: Consider building a dedicated Price List module in Reports tab for live management`,
    },

    // ─────────────────── ACCOUNTS / CRM ───────────────────
    {
        slug: 'customer-management',
        title: 'Customer & Property Management',
        icon: '👤',
        category: 'guides',
        tags: ['customer', 'crm', 'account', 'property', 'address', 'contact'],
        order_index: 5,
        content: `## Quick Reference

**Every customer has an Account in the system that links all their jobs, contracts, invoices, and interactions.**

### Customer Account Contains
- **Contact Info** — Name, Phone, Email
- **Properties** — All addresses where service was/is provided
- **Jobs** — Service history
- **Rentals & AMCs** — Active contracts
- **Transactions** — Invoices, receipts, quotations
- **Interactions** — Full timeline of everything that happened

### For Technicians
- You can see the customer's name, address, and phone in every job
- Do NOT share customer personal data with anyone outside the company
- If the customer's address is wrong on the job, inform admin — do not try to change it yourself

### ⚠️ Rules
- Every job must be linked to a customer account
- If a walk-in customer (no account) wants service: call admin to create an account first
- Admin-created accounts become accessible to customers after they sign up on the app`,
        admin_content: `## Behind the Scenes

### Account Architecture
- \`accounts\` table = unified ledger (type: \`customer\`, under: \`customers\` group)
- \`customers\` table = auth/login table for Customer App (linked to \`accounts\` via \`ledger_id\`)
- Properties stored in \`properties\` table, linked via \`customer_properties\` join table
- SKU format for customers: \`C101\`, \`C102\`, etc. (sequential, auto-generated on signup)

### Account Auto-Creation on Website Booking
- \`POST /api/booking\` upserts account on phone number match
- If account exists: links the new job to the existing account
- If no account: creates new \`accounts\` record + \`customers\` record

### Customer Claim Flow
- If admin creates an account manually, the customer can "claim" it by signing up with the same phone
- Backend detects no \`password_hash\` on existing \`customers\` row → runs claim flow (sets name + password)
- Logs \`account-claimed\` interaction`,
    },
    {
        slug: 'website-booking-flow',
        title: 'How Website Booking Works',
        icon: '🌐',
        category: 'guides',
        tags: ['website', 'booking', 'customer', 'online', 'form', 'slot'],
        order_index: 6,
        content: `## Quick Reference

**Customers can book a service directly from the company website without calling.**

### What Happens After a Website Booking
1. System receives the booking and validates the selected time slot
2. A job is created automatically with status: **Booking Request**
3. Admin receives a notification to review and assign a technician
4. Customer receives a confirmation on screen (and notification if they have the app)

### For Technicians
- Jobs sourced from the website will have "booking_request" status until admin assigns them to you
- Once assigned, the job appears in your Jobs tab like any other job
- Website bookings may have less detail than admin-created jobs — check with admin if info is missing

### ⚠️ Rules
- Do not contact website booking customers until you have been formally assigned the job
- All communication goes through admin first`,
        admin_content: `## Behind the Scenes

### Website Booking API (\`POST /api/booking\`)
1. **Slot validation**: Checks \`website_section_configs\` for slot capacity. Rejects if full.
2. **Account upsert**: Normalizes customer phone number → checks \`accounts\` table → creates if missing
3. **Customer App link**: Ensures \`customers\` row exists linked to \`accounts.id\` via \`ledger_id\`
4. **Property matching**: Checks \`properties\` by address+flat+building → creates if new → links via \`customer_properties\`
5. **Job creation**: Inserts into \`jobs\` with \`status: 'booking_request'\`, auto-generates job number via \`generateJobNumber()\`
6. **Interaction log**: Logs \`booking-created-website\` interaction
7. **Notification**: Fires \`booking_created_website\` event to admin via Notification Center`,
    },
]

async function seed() {
    console.log(`🌱 Seeding ${articles.length} support articles...`)

    let successCount = 0
    let errorCount = 0

    for (const article of articles) {
        try {
            const { error } = await supabase
                .from('support_articles')
                .upsert(article, { onConflict: 'slug' })

            if (error) {
                console.error(`❌ Failed: ${article.slug}`, error.message)
                errorCount++
            } else {
                console.log(`✅ Seeded: ${article.slug}`)
                successCount++
            }
        } catch (err) {
            console.error(`❌ Error on ${article.slug}:`, err.message)
            errorCount++
        }
    }

    console.log(`\n📊 Done! ${successCount} seeded, ${errorCount} failed.`)
    if (errorCount > 0) {
        console.log('⚠️  Make sure the support_articles table exists. See the SQL in the README.')
    }
}

seed()
