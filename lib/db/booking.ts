import { Pool } from "pg";
import { CDO_SERVICES_DATA } from "@/lib/cdo-clinic-data";
import { listDentists } from "./admin";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const password = process.env.SUPABASE_DB_PASSWORD || "Hv2KRnXT1xS2IdEQ";
    const connectionString = `postgresql://postgres.zgtcgpfbhfuwwuiqdlcc:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
    pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export interface PublicBranchRecord {
  id: string;
  name: string;
  shortName?: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

export interface PublicBookingInput {
  branch_id: string;
  service_id: string;
  service_title: string;
  dentist_id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  first_name: string;
  last_name: string;
  phone: string;
  email?: string | null;
  notes?: string | null;
  has_medical_alert?: boolean;
  medical_alert_details?: string | null;
}

export interface PublicBookingResult {
  success: boolean;
  appointment_id: string;
  confirmation_code: string;
  details: {
    patient_id: string;
    patient_name: string;
    phone: string;
    email: string | null;
    branch_name: string;
    branch_address: string | null;
    dentist_name: string;
    service_title: string;
    date: string;
    time: string;
    end_time: string;
  };
}

/**
 * Fetch clinic public metadata directly from the database
 */
export async function getPublicClinicData() {
  const db = getPool();

  // 1. Fetch active branches
  const { rows: branchRows } = await db.query(`
    SELECT id, name, address, phone, email, is_active
    FROM public.branches
    WHERE is_active = true
    ORDER BY name ASC;
  `);

  const branches: PublicBranchRecord[] = branchRows.map((b) => {
    // Generate clean short name
    let shortName = b.name.replace(/^CDG Dental Clinic\s*[—–-]\s*/i, "").trim();
    return {
      id: b.id,
      name: b.name,
      shortName,
      address: b.address || null,
      phone: b.phone || null,
      email: b.email || null,
      is_active: Boolean(b.is_active),
    };
  });

  // 2. Fetch active dentists
  const dentists = await listDentists(true);

  // 3. Return combined clinic data
  return {
    branches,
    dentists,
    services: CDO_SERVICES_DATA,
  };
}

/**
 * Fetch booked slots for a specific date & branch from the database
 */
export async function getPublicBookedSlots(
  branchId: string,
  date: string,
  dentistId?: string | null
): Promise<string[]> {
  const db = getPool();

  const dayStart = `${date} 00:00:00+00`;
  const dayEnd = `${date} 23:59:59+00`;

  let query = `
    SELECT 
      TO_CHAR(start_time AT TIME ZONE 'Asia/Manila', 'HH24:MI') as slot_time,
      dentist_id
    FROM public.appointments
    WHERE branch_id = $1::uuid
      AND start_time >= $2::timestamptz
      AND start_time <= $3::timestamptz
      AND status != 'cancelled'
  `;
  const params: any[] = [branchId, dayStart, dayEnd];

  if (dentistId && dentistId !== "any") {
    query += " AND dentist_id = $4::uuid";
    params.push(dentistId);
  }

  const { rows } = await db.query(query, params);
  return rows.map((r: any) => r.slot_time);
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

/**
 * Process a public booking directly against the database
 */
export async function createPublicBooking(
  input: PublicBookingInput
): Promise<PublicBookingResult> {
  const db = getPool();

  // Basic validation
  if (!input.branch_id || !input.date || !input.time) {
    throw new Error("Branch ID, appointment date, and time slot are required.");
  }
  if (!input.first_name?.trim() || !input.last_name?.trim() || !input.phone?.trim()) {
    throw new Error("First name, last name, and contact phone number are required.");
  }

  // 1. Verify branch exists and is active
  const { rows: branchRows } = await db.query(
    "SELECT id, name, address FROM public.branches WHERE id = $1::uuid AND is_active = true;",
    [input.branch_id]
  );
  if (branchRows.length === 0) {
    throw new Error("Selected clinic branch is not available or inactive.");
  }
  const branch = branchRows[0];

  // 2. Validate day of week and operating schedule
  const [year, month, day] = input.date.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat

  const { rows: schedRows } = await db.query(
    `SELECT is_open, open_time::text, close_time::text, has_break, break_start::text, break_end::text, slot_duration_minutes
     FROM public.branch_schedules
     WHERE branch_id = $1::uuid AND day_of_week = $2;`,
    [input.branch_id, dayOfWeek]
  );

  const schedule = schedRows[0] || {
    is_open: dayOfWeek !== 0,
    open_time: "09:00",
    close_time: "18:00",
    has_break: true,
    break_start: "12:00",
    break_end: "13:00",
    slot_duration_minutes: 60,
  };

  if (!schedule.is_open) {
    throw new Error(
      `The clinic branch "${branch.name}" is closed on ${DAY_NAMES[dayOfWeek]}s. Please select an open date.`
    );
  }

  const slotMinutes = Number(schedule.slot_duration_minutes || 60);

  // Validate time is within open hours
  const openTime = (schedule.open_time || "09:00").slice(0, 5);
  const closeTime = (schedule.close_time || "18:00").slice(0, 5);
  if (input.time < openTime || input.time >= closeTime) {
    throw new Error(`The requested time ${input.time} is outside clinic operating hours (${openTime} - ${closeTime}).`);
  }

  // Validate time does not overlap midday break
  if (schedule.has_break && schedule.break_start && schedule.break_end) {
    const breakStart = schedule.break_start.slice(0, 5);
    const breakEnd = schedule.break_end.slice(0, 5);
    if (input.time >= breakStart && input.time < breakEnd) {
      throw new Error(`The clinic is closed for midday break between ${breakStart} and ${breakEnd}. Please choose another time.`);
    }
  }

  // 3. Resolve Dentist
  let dentistId = input.dentist_id;
  const activeDentists = await listDentists(true);

  if (!dentistId || dentistId === "any") {
    // Pick the first available active dentist
    if (activeDentists.length === 0) {
      // Fallback to default dentist ID if table empty
      dentistId = "00000000-0000-0000-0000-000000000010";
    } else {
      dentistId = activeDentists[0].id;
    }
  }

  const assignedDentist = activeDentists.find((d) => d.id === dentistId);
  const dentistName = assignedDentist ? assignedDentist.name : "Attending CDG Dental Specialist";

  // 4. Double-Booking Conflict Check
  const startTimestamp = `${input.date}T${input.time}:00`;
  const startDate = new Date(startTimestamp);
  const endDate = new Date(startDate.getTime() + slotMinutes * 60000);
  const endHours = String(endDate.getHours()).padStart(2, "0");
  const endMins = String(endDate.getMinutes()).padStart(2, "0");
  const formattedEndTime = `${endHours}:${endMins}`;

  const { rows: conflictRows } = await db.query(
    `SELECT id FROM public.appointments
     WHERE dentist_id = $1::uuid
       AND status != 'cancelled'
       AND start_time = $2::timestamptz;`,
    [dentistId, startTimestamp]
  );

  if (conflictRows.length > 0) {
    throw new Error(
      `Appointment Conflict: This time slot (${input.time}) has already been reserved for ${dentistName}. Please select another time or doctor.`
    );
  }

  // 5. Patient Record: Find existing or insert new
  const cleanPhone = input.phone.trim();
  const cleanEmail = input.email?.trim()?.toLowerCase() || null;
  const cleanFirstName = input.first_name.trim();
  const cleanLastName = input.last_name.trim();

  let patientId: string;
  let isNewPatient = false;

  const { rows: existingPatientRows } = await db.query(
    "SELECT id, first_name, last_name FROM public.patients WHERE phone = $1 LIMIT 1;",
    [cleanPhone]
  );

  if (existingPatientRows.length > 0) {
    patientId = existingPatientRows[0].id;
    // Update email or medical alerts if provided
    if (cleanEmail || input.medical_alert_details) {
      await db.query(
        `UPDATE public.patients
         SET email = COALESCE($1, email),
             medical_alerts = COALESCE($2, medical_alerts)
         WHERE id = $3::uuid;`,
        [cleanEmail, input.medical_alert_details || null, patientId]
      );
    }
  } else {
    isNewPatient = true;
    const medicalNotes = input.has_medical_alert
      ? input.medical_alert_details || "Patient reported medical alerts upon online intake"
      : null;

    const { rows: newPatientRows } = await db.query(
      `INSERT INTO public.patients (first_name, last_name, phone, email, primary_branch_id, medical_alerts)
       VALUES ($1, $2, $3, $4, $5::uuid, $6)
       RETURNING id;`,
      [cleanFirstName, cleanLastName, cleanPhone, cleanEmail, input.branch_id, medicalNotes]
    );

    patientId = newPatientRows[0].id;

    // Initialize 32 universal adult teeth records for new patient EDR
    const teethValues: string[] = [];
    const teethParams: any[] = [patientId];
    let pIdx = 2;
    for (let t = 1; t <= 32; t++) {
      teethValues.push(`($1::uuid, $${pIdx++}, 'healthy')`);
      teethParams.push(t);
    }

    await db.query(
      `INSERT INTO public.patient_tooth_chart (patient_id, tooth_number, status)
       VALUES ${teethValues.join(", ")}
       ON CONFLICT DO NOTHING;`,
      teethParams
    );
  }

  // 6. Insert Appointment Record
  const appointmentNotes = `[Online Patient Booking] Specialty: ${input.service_title}. Patient Notes: ${input.notes || "None"}.`;

  const { rows: aptRows } = await db.query(
    `INSERT INTO public.appointments (
       patient_id, dentist_id, branch_id, start_time, end_time, status, notes
     )
     VALUES ($1::uuid, $2::uuid, $3::uuid, $4::timestamptz, $5::timestamptz, 'scheduled', $6)
     RETURNING id, created_at;`,
    [
      patientId,
      dentistId,
      input.branch_id,
      startDate.toISOString(),
      endDate.toISOString(),
      appointmentNotes,
    ]
  );

  const appointment = aptRows[0];
  const dateCompact = input.date.replace(/-/g, "").slice(4);
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const confirmationCode = `CDG-${randomSuffix}-${dateCompact}`;

  return {
    success: true,
    appointment_id: appointment.id,
    confirmation_code: confirmationCode,
    details: {
      patient_id: patientId,
      patient_name: `${cleanFirstName} ${cleanLastName}`,
      phone: cleanPhone,
      email: cleanEmail,
      branch_name: branch.name,
      branch_address: branch.address,
      dentist_name: dentistName,
      service_title: input.service_title,
      date: input.date,
      time: input.time,
      end_time: formattedEndTime,
    },
  };
}
