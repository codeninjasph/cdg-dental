-- ==============================================================================
-- CDG DENTAL CLINIC SYSTEM — PRODUCTION SUPABASE POSTGRESQL SCHEMA
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- 2. CUSTOM ENUMS
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('dentist', 'secretary', 'admin');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE appointment_status AS ENUM ('scheduled', 'confirmed', 'arrived', 'in_treatment', 'completed', 'cancelled', 'no_show');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE tooth_status AS ENUM ('healthy', 'decayed', 'filled', 'missing', 'crowned', 'extracted', 'implant', 'root_canal', 'bridge');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE bill_status AS ENUM ('unpaid', 'partially_paid', 'fully_paid', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
    CREATE TYPE payment_method_type AS ENUM ('cash', 'card', 'gcash', 'bank_transfer', 'insurance');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. BRANCHES
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. USER PROFILES
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'secretary',
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION get_my_role()
RETURNS user_role AS $$
    SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- 5. PATIENTS (CRM)
CREATE TABLE IF NOT EXISTS patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    dob DATE,
    gender TEXT,
    address TEXT,
    emergency_contact_name TEXT,
    emergency_contact_phone TEXT,
    medical_alerts TEXT,
    primary_branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);

-- 6. APPOINTMENTS (Conflict-Resolution with Double-Booking Exclusion)
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    dentist_id UUID NOT NULL REFERENCES profiles(id),
    branch_id UUID NOT NULL REFERENCES branches(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status appointment_status DEFAULT 'scheduled',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT chk_appointment_time_valid CHECK (end_time > start_time)
);

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'no_dentist_double_booking'
    ) THEN
        ALTER TABLE appointments ADD CONSTRAINT no_dentist_double_booking 
        EXCLUDE USING gist (dentist_id WITH =, tstzrange(start_time, end_time) WITH &&) 
        WHERE (status NOT IN ('cancelled'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_appointments_start ON appointments(start_time);
CREATE INDEX IF NOT EXISTS idx_appointments_dentist ON appointments(dentist_id, start_time);

-- 7. PATIENT TOOTH CHART (32 Teeth Adult Universal Odontogram)
CREATE TABLE IF NOT EXISTS patient_tooth_chart (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    tooth_number INTEGER NOT NULL CHECK (tooth_number >= 1 AND tooth_number <= 32),
    status tooth_status NOT NULL DEFAULT 'healthy',
    surface TEXT,
    notes TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(patient_id, tooth_number)
);

-- 8. CLINICAL TREATMENTS & PROCEDURES
CREATE TABLE IF NOT EXISTS treatments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    dentist_id UUID NOT NULL REFERENCES profiles(id),
    tooth_number INTEGER CHECK (tooth_number >= 1 AND tooth_number <= 32),
    procedure_name TEXT NOT NULL,
    clinical_notes TEXT,
    cost NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treatments_patient ON treatments(patient_id);

-- 9. PATIENT DIGITAL RECORDS & X-RAYS
CREATE TABLE IF NOT EXISTS patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('xray', 'lab_result', 'prescription', 'consent_form', 'photo', 'other')),
    file_url TEXT NOT NULL,
    file_size INTEGER,
    mime_type TEXT,
    notes TEXT,
    uploaded_by UUID REFERENCES profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 10. FINANCIAL LEDGER & BILLING
CREATE SEQUENCE IF NOT EXISTS invoice_seq START 1001;

CREATE TABLE IF NOT EXISTS treatment_bills (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number TEXT UNIQUE NOT NULL DEFAULT ('INV-' || TO_CHAR(NOW(), 'YYYYMM') || '-' || LPAD(nextval('invoice_seq')::TEXT, 4, '0')),
    patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    net_amount NUMERIC(10, 2) GENERATED ALWAYS AS (GREATEST(total_amount - discount_amount, 0.00)) STORED,
    status bill_status DEFAULT 'unpaid',
    due_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bill_id UUID NOT NULL REFERENCES treatment_bills(id) ON DELETE CASCADE,
    amount_logged NUMERIC(10, 2) NOT NULL CHECK (amount_logged > 0),
    payment_method payment_method_type NOT NULL,
    reference_number TEXT,
    notes TEXT,
    logged_by UUID NOT NULL REFERENCES profiles(id),
    logged_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_bill ON payment_logs(bill_id);

-- 11. REAL-TIME OUTSTANDING BALANCES VIEW
CREATE OR REPLACE VIEW outstanding_balances AS
SELECT 
    b.id AS bill_id,
    b.invoice_number,
    b.patient_id,
    p.first_name,
    p.last_name,
    p.phone,
    b.net_amount,
    COALESCE(SUM(l.amount_logged), 0.00) AS total_paid,
    (b.net_amount - COALESCE(SUM(l.amount_logged), 0.00)) AS balance_due,
    b.status,
    b.created_at
FROM treatment_bills b
JOIN patients p ON b.patient_id = p.id
LEFT JOIN payment_logs l ON b.id = l.bill_id
GROUP BY b.id, b.invoice_number, b.patient_id, p.first_name, p.last_name, p.phone, b.net_amount, b.status, b.created_at
HAVING (b.net_amount - COALESCE(SUM(l.amount_logged), 0.00)) > 0;

-- 12. AUTOMATIC BILL STATUS RECALCULATION TRIGGER
CREATE OR REPLACE FUNCTION trigger_sync_bill_status()
RETURNS TRIGGER AS $$
DECLARE
    target_bill_id UUID;
    v_net_amount NUMERIC(10, 2);
    v_total_paid NUMERIC(10, 2);
    new_status bill_status;
BEGIN
    target_bill_id := COALESCE(NEW.bill_id, OLD.bill_id);
    
    SELECT net_amount INTO v_net_amount FROM treatment_bills WHERE id = target_bill_id;
    SELECT COALESCE(SUM(amount_logged), 0.00) INTO v_total_paid FROM payment_logs WHERE bill_id = target_bill_id;
    
    IF v_total_paid <= 0 THEN
        new_status := 'unpaid';
    ELSIF v_total_paid < v_net_amount THEN
        new_status := 'partially_paid';
    ELSE
        new_status := 'fully_paid';
    END IF;
    
    UPDATE treatment_bills SET status = new_status WHERE id = target_bill_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_payment_sync_bill ON payment_logs;
CREATE TRIGGER trg_payment_sync_bill
AFTER INSERT OR UPDATE OR DELETE ON payment_logs
FOR EACH ROW EXECUTE FUNCTION trigger_sync_bill_status();

-- 13. AUTH TO PROFILE TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_role public.user_role;
BEGIN
    BEGIN
        v_role := (NEW.raw_user_meta_data->>'role')::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        v_role := 'secretary'::public.user_role;
    END;

    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'Clinic Staff'),
        COALESCE(v_role, 'secretary'::public.user_role)
    )
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 14. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_tooth_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatments ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE treatment_bills ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view branches" ON branches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can modify branches" ON branches FOR ALL TO authenticated USING (get_my_role() = 'admin');

CREATE POLICY "Staff can view profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

CREATE POLICY "Staff can read and manage patients" ON patients FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can read and manage appointments" ON appointments FOR ALL TO authenticated USING (true);

CREATE POLICY "Staff can view dental charts" ON patient_tooth_chart FOR SELECT TO authenticated USING (true);
CREATE POLICY "Dentists and admins can update tooth charts" ON patient_tooth_chart FOR ALL TO authenticated 
    USING (get_my_role() IN ('dentist', 'admin'));

CREATE POLICY "Staff can view treatments" ON treatments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Dentists and admins can add/edit treatments" ON treatments FOR ALL TO authenticated 
    USING (get_my_role() IN ('dentist', 'admin'));

CREATE POLICY "Staff can view patient documents" ON patient_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Staff can upload patient documents" ON patient_documents FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Staff can view and manage bills" ON treatment_bills FOR ALL TO authenticated USING (true);
CREATE POLICY "Staff can view and record payments" ON payment_logs FOR ALL TO authenticated USING (true);
