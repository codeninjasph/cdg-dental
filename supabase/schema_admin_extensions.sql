-- ==============================================================================
-- CDG DENTAL CLINIC — ADMIN EXTENSIONS & GOVERNANCE MIGRATION
-- 1. Master Fee Schedule (dental_services)
-- 2. Statutory Senior/PWD Discount & Tax Compliance Fields (treatment_bills)
-- 3. Immutable Audit Trail (audit_logs)
-- ==============================================================================

-- 1. DENTAL SERVICES & MASTER FEE SCHEDULE
CREATE TABLE IF NOT EXISTS dental_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    category TEXT NOT NULL,
    code TEXT UNIQUE,
    name TEXT NOT NULL,
    description TEXT,
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (base_price >= 0),
    min_price NUMERIC(10, 2),
    max_price NUMERIC(10, 2),
    default_duration_minutes INT NOT NULL DEFAULT 45 CHECK (default_duration_minutes > 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    bookable_online BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dental_services_category ON dental_services(category);
CREATE INDEX IF NOT EXISTS idx_dental_services_active ON dental_services(is_active);

-- Enable RLS for dental_services
ALTER TABLE dental_services ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Public can view active dental services" ON dental_services;
    CREATE POLICY "Public can view active dental services"
        ON dental_services FOR SELECT
        USING (is_active = true OR auth.role() = 'authenticated');
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated staff can manage dental services" ON dental_services;
    CREATE POLICY "Authenticated staff can manage dental services"
        ON dental_services FOR ALL
        TO authenticated
        USING (true)
        WITH CHECK (true);
EXCEPTION WHEN others THEN null; END $$;

-- 2. STATUTORY DISCOUNT & TAX COMPLIANCE ON TREATMENT BILLS
ALTER TABLE treatment_bills
ADD COLUMN IF NOT EXISTS discount_type TEXT,
ADD COLUMN IF NOT EXISTS discount_id_number TEXT,
ADD COLUMN IF NOT EXISTS discount_id_cardholder TEXT;

CREATE INDEX IF NOT EXISTS idx_treatment_bills_discount_type ON treatment_bills(discount_type);

-- 3. IMMUTABLE AUDIT TRAIL & ACTIVITY LOG
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    actor_role TEXT NOT NULL,
    action_category TEXT NOT NULL, -- e.g. "billing", "appointment", "patient", "pricing", "access_control", "system"
    action_type TEXT NOT NULL, -- e.g. "DISCOUNT_APPLIED", "BILL_CREATED", "SERVICE_CREATED", "SERVICE_UPDATED", etc.
    entity_type TEXT,
    entity_id TEXT,
    description TEXT NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    branch_name TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(action_category);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

-- Enable RLS for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON audit_logs;
    CREATE POLICY "Authenticated users can read audit logs"
        ON audit_logs FOR SELECT
        TO authenticated
        USING (true);
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
    DROP POLICY IF EXISTS "Authenticated users can create audit logs" ON audit_logs;
    CREATE POLICY "Authenticated users can create audit logs"
        ON audit_logs FOR INSERT
        TO authenticated
        WITH CHECK (true);
EXCEPTION WHEN others THEN null; END $$;

-- 4. SEED INITIAL CORE DENTAL SERVICES
INSERT INTO dental_services (code, category, name, description, base_price, min_price, max_price, default_duration_minutes, is_active, bookable_online)
VALUES
  ('PR-01', 'Diagnostics & Preventative', 'Comprehensive Oral Examination', 'Visual, tactile examination with full clinical charting and treatment planning.', 800.00, 500.00, 1000.00, 30, true, true),
  ('PR-02', 'Diagnostics & Preventative', 'Ultrasonic Scaling & Polishing (Prophylaxis)', 'Hospital-grade ultrasonic calculus removal with fine polishing paste.', 2500.00, 1800.00, 3500.00, 45, true, true),
  ('PR-03', 'Diagnostics & Preventative', 'Periapical Digital X-Ray (Single Sensor)', 'High-resolution digital radiograph with instant sensor readout.', 600.00, 500.00, 800.00, 15, true, false),
  ('PR-04', 'Diagnostics & Preventative', 'Topical Fluoride Treatment', 'Enamel remineralization varnish application for caries prevention.', 1500.00, 1200.00, 2000.00, 30, true, true),
  ('RS-01', 'Restorative & Endodontics', 'Light-Cure Composite Restoration (Anterior)', 'Shade-matched nano-hybrid resin filling for anterior teeth.', 2800.00, 2200.00, 3500.00, 45, true, true),
  ('RS-02', 'Restorative & Endodontics', 'Light-Cure Composite Restoration (Posterior MOD)', 'High-strength micro-hybrid restoration for premolars and molars.', 3200.00, 2800.00, 4500.00, 60, true, true),
  ('RS-03', 'Restorative & Endodontics', 'Root Canal Therapy (Single Canal - Anterior)', 'Complete pulpectomy, biomechanical prep, and warm gutta-percha obturation.', 6500.00, 5500.00, 8000.00, 90, true, false),
  ('RS-04', 'Restorative & Endodontics', 'Root Canal Therapy (Molar - Multi-Canal)', 'Endodontic treatment for 3-4 canals under digital radiograph verification.', 12000.00, 10000.00, 15000.00, 90, true, false),
  ('OS-01', 'Oral & Maxillofacial Surgery', 'Simple Routine Extraction', 'Atraumatic tooth removal with local infiltration/nerve block anesthesia.', 2000.00, 1500.00, 2800.00, 45, true, true),
  ('OS-02', 'Oral & Maxillofacial Surgery', 'Complicated / Sectional Surgical Extraction', 'Surgical extraction requiring bone guttering or root sectioning.', 4500.00, 3500.00, 6000.00, 60, true, false),
  ('OS-03', 'Oral & Maxillofacial Surgery', 'Impacted Wisdom Tooth Odontectomy', 'Full surgical removal of mesioangular or horizontal impacted third molar.', 8500.00, 7000.00, 14000.00, 90, true, false),
  ('OR-01', 'Orthodontics & Dentofacial', 'Comprehensive Orthodontic Assessment & Study Casts', 'Pre-orthodontic photographic analysis, dental impressions, and cephalometric analysis.', 3500.00, 3000.00, 5000.00, 60, true, true),
  ('OR-02', 'Orthodontics & Dentofacial', 'Metal Bracket System (Full Arch Case Downpayment)', 'High-grade stainless steel bracket system initial bonding.', 25000.00, 20000.00, 35000.00, 90, true, false),
  ('OR-03', 'Orthodontics & Dentofacial', 'Monthly Orthodontic Wire Adjustment', 'Wire reactivation, elastic chain replacement, and progress check.', 1500.00, 1200.00, 2000.00, 30, true, true),
  ('PR-05', 'Prosthodontics & Rehabilitation', 'All-Ceramic Zirconia Crown (CAD/CAM)', 'Monolithic computer-milled high-strength crown with custom color shading.', 14000.00, 12000.00, 18000.00, 60, true, false),
  ('PR-06', 'Prosthodontics & Rehabilitation', 'Porcelain-Fused-to-Metal (PFM) Crown', 'Cast metal substructure with esthetic dental porcelain veneer.', 8500.00, 7500.00, 11000.00, 60, true, false),
  ('CS-01', 'Cosmetic & Aesthetic Dentistry', 'In-Clinic Power Laser Teeth Whitening', 'Hydrogen peroxide photo-accelerated whitening (3 cycles in 1 visit).', 12000.00, 9000.00, 15000.00, 75, true, true)
ON CONFLICT (code) DO UPDATE
SET base_price = EXCLUDED.base_price,
    description = EXCLUDED.description,
    default_duration_minutes = EXCLUDED.default_duration_minutes;
