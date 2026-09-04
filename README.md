# CDG Dental Clinic — Practice Management System (PMS)

An enterprise-grade Dental Practice Management System and Electronic Dental Records (EDR) suite built for multi-branch clinics. Features real-time chairside odontograms, front-desk reception workflows, conflict-free appointment scheduling, integrated POS invoicing, and high-volume data scalability.

---

## 🌟 Key Modules & Workspaces

### 1. 🌐 Public Dental Suite
- **Patient-Facing Clinic Portal**: Modern responsive website showcasing CDG Dental's branches, dentists, and dental specialties.
- **Online Booking System**: Integrated appointment intake modal for patients with branch selection, preferred dentists, and medical alerts.
- **Emergency Dental Care**: Direct hotline integration for acute dental needs.

### 2. 🩺 Clinical Doctor Suite (`/portal`)
- **Chairside 32-Tooth Odontogram**: Interactive adult dental charting with color-coded tooth statuses (healthy, decayed, filled, crowned, extracted, implant, root canal, bridge) and surface-specific notes.
- **Operatory Queue Management**: Track active operatory visits with one-click status transitions (*Scheduled* → *Arrived* → *In Operatory* → *Completed*).
- **Electronic Dental Records (EDR)**: Patient medical contraindications, penicillin/latex allergies, emergency contacts, and complete treatment history.

### 3. 📋 Front-Desk & Secretary Hub (`/secretary`)
A unified command center for clinic receptionists and secretaries organized into 4 dedicated workstations:
- 🕒 **Queue & Check-In**: Real-time lobby queue, walk-in scheduling, patient routing slip vouchers, and doctor filtering.
- 👥 **Patient Records & CRM**: Fast patient search, instant profile preview, intake registration, and duplicate record merging.
- 💳 **Cashier POS & Invoicing**: Treatment bill creation, cash/GCash/card payment logging, official receipt generation, and live receivables tracking.
- 📁 **Intake Documents Vault**: Secure document intake for patient consent forms, signed waivers, ID attachments, and medical clearances.

### 4. 🛡️ Master Administration (`/admin`)
- **Staff Directory & Access Control**: Administrator invite engine, role management (`dentist`, `secretary`, `admin`), and security oversight.
- **Role Viewport Switcher**: Allows administrators to preview the system from the authentic perspective of any practitioner or receptionist without logging out.
- **Branch Management**: Multi-clinic location configurations (Ortigas Center, BGC Premier, Cagayan de Oro).

---

## ⚡ High-Volume Scalability & Performance

- **Zero Infinite Scroll**: All tables (Patients, Appointments, Invoices, Payment Logs, Documents) feature clean pagination with page jumping, configurable rows-per-page (`10`, `25`, `50`, `100`), and live record counts.
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

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router, Server Components & Client Components)
- **Language & Runtime**: [TypeScript](https://www.typescriptlang.org/) & [Node.js](https://nodejs.org/)
- **Database & Auth**: [Supabase](https://supabase.com/) (PostgreSQL 17, GoTrue Auth, Row-Level Security, Views & Triggers)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with CDG clinical slate/teal design system
- **Icons**: [Lucide React](https://lucide.dev/)
- **State & Context**: Custom React Clinic Context with role cookies and proxy middleware RBAC

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
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

Run the database migration and seed script to populate sample branches, doctors, patients, tooth charts, and demo accounts:

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

---

## 📄 License

Proprietary software developed for CDG Dental Clinic. All rights reserved.
