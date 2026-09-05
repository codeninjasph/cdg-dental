# CDG Dental Clinic — Practice Management System (PMS)

An enterprise-grade Dental Practice Management System and Electronic Dental Records (EDR) suite built for multi-branch clinics. Features real-time chairside odontograms, dynamic dentist duty scheduling, front-desk reception workflows, conflict-free appointment scheduling, integrated POS invoicing, and high-volume clinical analytics.

---

## 🌟 Key Modules & Workspaces

### 1. 🌐 Public Dental Suite
- **Patient-Facing Clinic Portal**: Modern responsive website showcasing CDG Dental's branches, services, practitioner credentials, and dental specialties.
- **Smart Online Booking System**: Multi-step patient booking wizard with live branch selection, duty-aware doctor selection, real-time operating hours constraints, and medical alert intake.
- **Doctor Shift & Availability Badges**: Live schedule badges displaying which days and branches each doctor is rostered on duty (e.g., `Downtown: Mon, Wed, Fri` • `Uptown: Tue, Thu, Sat`).
- **Off-Duty Quick Jump**: If a patient chooses an off-duty date for their chosen dentist, the system provides a 1-click **"📅 Switch to Next Available Date"** button or option to switch to the first available on-duty doctor.
- **Emergency Dental Care**: Direct emergency hotline and priority inquiry integration.

### 2. 🩺 Clinical Doctor Suite (`/portal`)
- **Chairside 32-Tooth Odontogram**: Interactive adult dental charting with color-coded tooth statuses (healthy, decayed, filled, crowned, extracted, implant, root canal, bridge) and surface-specific clinical notes.
- **Operatory Queue Management**: Real-time operatory queue with one-click status transitions (*Scheduled* → *Arrived* → *In Operatory* → *Completed*).
- **Electronic Dental Records (EDR)**: Patient medical contraindications, penicillin/latex allergies, emergency contacts, and complete chronological treatment history.

### 3. 📋 Front-Desk & Secretary Hub (`/secretary`)
A unified command center for clinic receptionists and secretaries organized into 4 dedicated workstations:
- 🕒 **Queue & Check-In**: Real-time lobby queue, walk-in scheduling, patient routing slip vouchers, and doctor filtering.
- 👥 **Patient Records & CRM**: Fast patient search, instant profile preview, intake registration, and duplicate record merging.
- 💳 **Cashier POS & Invoicing**: Treatment bill creation, cash/GCash/card payment logging, official receipt generation, and live receivables tracking.
- 📁 **Intake Documents Vault**: Secure document intake for patient consent forms, signed waivers, ID attachments, and medical clearances.

### 4. 📅 Scheduling & Conflict-Free Appointments (`/appointments`)
- **Dynamic Duty Roster Matching**: When booking appointments, dentists are evaluated in real time against their rostered branch and day of week.
- **On-Duty Prioritization**: On-duty practitioners are automatically sorted to the top with `● On Duty (Hours)` indicators, while off-duty doctors display `○ Off Duty` with notice cards (permitting administrative override when authorized).
- **Conflict Prevention**: Double-booking prevention via PostgreSQL exclusion constraints and live slot availability checks.

### 5. 📊 Reports & Financial Analytics (`/reports`)
A comprehensive business intelligence dashboard for practice owners and clinic administrators:
- 📈 **Executive Revenue KPIs**: Gross Revenue, Collected Payments, Outstanding Receivables, and Collection Rate percentage with period comparison indicators.
- 🗓️ **Flexible Date Range Filtering**: Preset filters (*Today*, *Last 7 Days*, *Last 30 Days*, *This Month*, *Year-to-Date*, *All-Time*) plus custom start/end date ranges.
- 🏢 **Multi-Branch Comparative Analytics**: Filter metrics clinic-wide or drill down into specific branches (Downtown Limketkai, Uptown Pueblo, Centrio Ayala).
- 💳 **Payment Method Breakdown**: Visual volume and revenue breakdown across Cash, GCash, Credit Cards, Bank Transfers, and HMO/Insurance claims.
- 🦷 **Top Dental Procedures**: Volume and revenue ranking for cleanings, restorations, root canals, crowns, tooth extractions, and orthodontics.
- 📑 **Accounts Receivable & Aging Ledger**: Patient-level ledger showing invoice balances, payment dates, and 1-click printable PDF receipts.

### 6. 🛡️ Master Administration (`/admin`)
- **Staff Directory & Access Control** (`/admin/users`): Administrator invite engine, role management (`dentist`, `secretary`, `admin`), active sessions, and security oversight.
- **Branch & Facility Directory** (`/admin/branches`): Multi-clinic location registration, contact directories, and active status toggles.
- **Dental Hours & Shift Schedules** (`/admin/hours`): Manage branch opening/closing hours, midday lunch breaks, slot duration intervals (30m to 120m), and operating days with live slot previews.
- **Dentist Profiles & Duty Rosters** (`/admin/dentists`): Practitioner bio, license verification, specialty tags, and multi-branch schedule editor with 1-click day/hour presets.
- **Role Viewport Switcher**: Allows administrators to preview the system from the authentic perspective of any practitioner or receptionist without logging out.

---

## ⚡ High-Volume Scalability & Architecture

- **Dynamic Duty Engine (`lib/duty-schedule.ts`)**: Pure-function schedule parser and evaluation engine supporting fuzzy branch matching, schedule intervals, and next-open-date algorithms.
- **Zero Infinite Scroll**: All tabular views (Patients, Appointments, Invoices, Payment Logs, Documents, Reports) feature clean pagination with page jumping, configurable rows-per-page (`10`, `25`, `50`, `100`), and live record totals.
- **PostgreSQL Double-Booking Exclusion**: Database-level `EXCLUDE USING gist` constraints on `(dentist_id WITH =, tstzrange(start_time, end_time) WITH &&)` prevent concurrent appointment double-booking.
- **Trigger-Synced Financial Ledger**: Database triggers (`trg_payment_sync_bill`) automatically recalculate invoice balances (`unpaid`, `partially_paid`, `fully_paid`) upon payment logging.
- **Optimized B-Tree Indexes**: Custom composite indexes on `patients(created_at, last_name)`, `appointments(branch_id, start_time)`, and `treatment_bills(created_at, patient_id)` ensure sub-millisecond queries across tens of thousands of records.

---

## 🔑 Demo Login Credentials

For demonstration and client walkthroughs, access the portal via `/auth/login` (or use the 1-Click Quick Fill buttons on screen):

| Role | Email | Password | Landing Destination | Primary Workstation |
| :--- | :--- | :--- | :--- | :--- |
| **Secretary** | `secretary@cdgdental.com` | `secretary123` | `/secretary` | Reception, Queue & Cashier POS |
| **Dentist** | `dentist@cdgdental.com` | `dentist123` | `/portal` | Clinical Charting & Odontograms |
| **Admin** | `admin@gmail.com` | `admin123` | `/admin/users` | Full Clinic Operations & Access Control |

---

## 🛠️ Technology Stack

- **Framework**: [Next.js 16 (App Router)](https://nextjs.org/) (Turbopack, Server Components & Client Components)
- **Language & Runtime**: [TypeScript](https://www.typescriptlang.org/) & [Node.js](https://nodejs.org/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 17, GoTrue Auth, Row-Level Security, Views & Triggers)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with CDG clinical slate/teal design tokens and full Dark Mode support
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Routing**: React Context, URL search params, and proxy middleware RBAC

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/codeninjasph/cdg-dental.git
cd cdg-dental
npm install
```

### 2. Environment Variables

Create `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-supabase-publishable-or-anon-key
SUPABASE_DB_PASSWORD=your-database-password
```

### 3. Database Schema & Seed Data

Run the database seed script to populate sample branches, doctors, patients, tooth charts, appointments, and demo accounts:

```bash
# Seed demo accounts, branches, tooth charts, and appointments
node --env-file=.env.local scripts/seed.js
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser:
- Public Website: `http://localhost:3000/`
- Practitioner & Staff Sign In: `http://localhost:3000/auth/login`
- Analytics & Financial Reports: `http://localhost:3000/reports`

---

## 📄 License

Proprietary software developed for CDG Dental Clinic. All rights reserved.
