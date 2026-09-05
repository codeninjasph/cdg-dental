export type UserRole = 'dentist' | 'secretary' | 'admin';
export type AppointmentStatus = 'scheduled' | 'confirmed' | 'arrived' | 'in_treatment' | 'completed' | 'cancelled' | 'no_show';
export type ToothStatus = 'healthy' | 'decayed' | 'filled' | 'missing' | 'crowned' | 'extracted' | 'implant' | 'root_canal' | 'bridge';
export type BillStatus = 'unpaid' | 'partially_paid' | 'fully_paid' | 'cancelled';
export type PaymentMethod = 'cash' | 'card' | 'gcash' | 'bank_transfer' | 'insurance';

export interface Branch {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface BranchSchedule {
  id?: string;
  branch_id: string;
  day_of_week: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  is_open: boolean;
  open_time: string; // e.g. "09:00"
  close_time: string; // e.g. "18:00"
  has_break: boolean;
  break_start?: string | null; // e.g. "12:00"
  break_end?: string | null; // e.g. "13:00"
  slot_duration_minutes: number; // e.g. 30, 45, 60
  created_at?: string;
  updated_at?: string;
}

export interface Profile {
  id: string;
  role: UserRole;
  branch_id?: string | null;
  full_name: string;
  phone?: string | null;
  created_at: string;
}

export interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  dob?: string | null;
  gender?: string | null;
  address?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  medical_alerts?: string | null;
  primary_branch_id?: string | null;
  created_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  dentist_id: string;
  branch_id: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes?: string | null;
  created_at: string;
  patient?: Patient;
  dentist?: Profile;
  branch?: Branch;
}

export interface ToothRecord {
  id?: string;
  patient_id: string;
  tooth_number: number;
  status: ToothStatus;
  surface?: string | null;
  notes?: string | null;
  last_updated?: string;
}

export interface Treatment {
  id: string;
  patient_id: string;
  appointment_id?: string | null;
  dentist_id: string;
  tooth_number?: number | null;
  procedure_name: string;
  clinical_notes?: string | null;
  cost: number;
  bill_id?: string | null;
  billing_status?: "pending" | "billed" | "waived";
  created_at: string;
  dentist?: Profile;
}

export interface PatientDocument {
  id: string;
  patient_id: string;
  title: string;
  category: 'xray' | 'lab_result' | 'prescription' | 'consent_form' | 'photo' | 'other';
  file_url: string;
  file_size?: number | null;
  mime_type?: string | null;
  notes?: string | null;
  uploaded_by?: string | null;
  created_at: string;
}

export type InstallmentPlanType = "orthodontics" | "implants" | "prosthodontics" | "general";

export interface InstallmentPreferredSchedule {
  standing_day?: "Monday" | "Tuesday" | "Wednesday" | "Thursday" | "Friday" | "Saturday" | "Sunday";
  timing?: "1st_week" | "2nd_week" | "3rd_week" | "4th_week" | "every_4_weeks" | "custom";
  preferred_time?: string;
  notes?: string;
}

export interface TreatmentBill {
  id: string;
  invoice_number: string;
  patient_id: string;
  branch_id?: string | null;
  appointment_id?: string | null;
  dentist_id?: string | null;
  total_amount: number;
  discount_amount: number;
  net_amount: number;
  status: BillStatus;
  due_date?: string | null;
  notes?: string | null;
  is_installment?: boolean;
  plan_type?: InstallmentPlanType | null;
  downpayment_amount?: number;
  installment_amount?: number;
  total_installments?: number;
  frequency?: "per_visit" | "monthly" | "milestone";
  preferred_schedule?: InstallmentPreferredSchedule | null;
  created_at: string;
  patient?: Patient;
  dentist?: Profile;
  treatments?: Treatment[];
  payments?: PaymentLog[];
}

export interface PaymentLog {
  id: string;
  bill_id: string;
  branch_id?: string | null;
  amount_logged: number;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  notes?: string | null;
  logged_by: string;
  logged_at: string;
  staff?: Profile;
}

export interface OutstandingBalance {
  bill_id: string;
  invoice_number: string;
  patient_id: string;
  branch_id?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  net_amount: number;
  total_paid: number;
  balance_due: number;
  status: BillStatus;
  is_installment?: boolean;
  plan_type?: InstallmentPlanType | null;
  downpayment_amount?: number;
  installment_amount?: number;
  total_installments?: number;
  frequency?: "per_visit" | "monthly" | "milestone";
  preferred_schedule?: InstallmentPreferredSchedule | null;
  created_at: string;
}

