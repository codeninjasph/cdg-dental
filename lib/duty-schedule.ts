/**
 * Duty Schedule Engine
 * Robust parser & evaluator for CDG Dental Clinic duty rosters.
 * Evaluates dentist branch availability, days of week, and duty hours.
 */

export interface ClinicScheduleRow {
  branchName: string;
  days: string;
  hours: string;
}

export interface BranchRef {
  id?: string;
  name: string;
  shortName?: string;
}

export interface DentistWithSchedule {
  id: string;
  name: string;
  clinic_days?: ClinicScheduleRow[];
  cdoClinicDays?: ClinicScheduleRow[];
  [key: string]: any;
}

export interface DentistDutyStatus {
  dentistId: string;
  dentistName: string;
  isOnDuty: boolean;
  dutyStatus: "on_duty" | "off_duty_other_branch" | "off_duty_today";
  workingHours?: string;
  startTime?: string; // "09:00"
  endTime?: string;   // "17:00"
  dutyBranch?: string;
  reason: string;
  scheduleDescription: string;
}

const DAY_MAP: Record<string, number> = {
  sun: 0,
  sunday: 0,
  mon: 1,
  monday: 1,
  tue: 2,
  tues: 2,
  tuesday: 2,
  wed: 3,
  wednesday: 3,
  thu: 4,
  thur: 4,
  thurs: 4,
  thursday: 4,
  fri: 5,
  friday: 5,
  sat: 6,
  saturday: 6,
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const DAY_SHORT_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/**
 * Parses day string into an array of day-of-week indices (0 = Sun, 1 = Mon, ..., 6 = Sat)
 * Supports:
 * - "Mon, Wed, Fri" or "Mon,Wed,Fri"
 * - "Tue, Thu, Sat"
 * - "Mon – Fri", "Mon-Fri", "Monday to Friday"
 * - "Daily", "Everyday", "Weekdays", "Weekends"
 */
export function parseDaysOfWeek(daysStr: string): number[] {
  if (!daysStr || typeof daysStr !== "string") return [];
  const normalized = daysStr.toLowerCase().trim();

  if (normalized.includes("daily") || normalized.includes("everyday") || normalized.includes("all days")) {
    return [1, 2, 3, 4, 5, 6];
  }
  if (normalized.includes("weekday")) {
    return [1, 2, 3, 4, 5];
  }
  if (normalized.includes("weekend")) {
    return [0, 6];
  }

  const result = new Set<number>();

  // Check for range with dash or 'to' (e.g. "Mon - Fri" or "Monday to Saturday")
  const rangeMatch = normalized.match(/([a-z]+)\s*(?:[-–—]|to)\s*([a-z]+)/i);
  if (rangeMatch) {
    const startToken = rangeMatch[1].toLowerCase().slice(0, 3);
    const endToken = rangeMatch[2].toLowerCase().slice(0, 3);
    const startIdx = DAY_MAP[startToken];
    const endIdx = DAY_MAP[endToken];

    if (startIdx !== undefined && endIdx !== undefined) {
      if (startIdx <= endIdx) {
        for (let i = startIdx; i <= endIdx; i++) result.add(i);
      } else {
        // Wrap around (e.g. Fri - Mon)
        for (let i = startIdx; i <= 6; i++) result.add(i);
        for (let i = 0; i <= endIdx; i++) result.add(i);
      }
    }
  }

  // Also check comma/space/slash separated tokens
  const tokens = normalized.split(/[,/&\s]+/).filter(Boolean);
  for (const t of tokens) {
    const cleanToken = t.slice(0, 3);
    if (DAY_MAP[cleanToken] !== undefined) {
      result.add(DAY_MAP[cleanToken]);
    }
  }

  return Array.from(result).sort((a, b) => a - b);
}

/**
 * Convert time string into 24-hour "HH:MM" format
 * e.g. "9:00 AM" -> "09:00", "5:30 PM" -> "17:30", "9am" -> "09:00", "18:00" -> "18:00"
 */
function to24Hour(timeStr: string): string | null {
  if (!timeStr) return null;
  const clean = timeStr.trim().toLowerCase();

  // Check 12-hour format with AM/PM
  const match12 = clean.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const mins = match12[2] ? match12[2] : "00";
    const isPm = match12[3] === "pm";

    if (isPm && hours < 12) hours += 12;
    if (!isPm && hours === 12) hours = 0;

    return `${String(hours).padStart(2, "0")}:${mins}`;
  }

  // Check 24-hour format "HH:MM"
  const match24 = clean.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    return `${String(hours).padStart(2, "0")}:${match24[2]}`;
  }

  return null;
}

/**
 * Parses working hours string into start & end time (24h)
 * e.g. "9:00 AM – 5:00 PM" -> { start: "09:00", end: "17:00" }
 */
export function parseTimeRange(hoursStr: string): { start: string; end: string } {
  if (!hoursStr || typeof hoursStr !== "string") {
    return { start: "09:00", end: "18:00" };
  }

  const parts = hoursStr.split(/[-–—to]+/).map((p) => p.trim());
  if (parts.length >= 2) {
    const start = to24Hour(parts[0]) || "09:00";
    const end = to24Hour(parts[1]) || "18:00";
    return { start, end };
  }

  return { start: "09:00", end: "18:00" };
}

/**
 * Fuzzy matches branch names across representations:
 * - "Downtown (Limketkai)", "Downtown CDO (Limketkai Hub)", "CDG Dental Clinic — Downtown (Limketkai)"
 * - "Uptown (Pueblo de Oro)", "Uptown CDO (Pueblo de Oro Hub)"
 * - "Centrio (Ayala Mall)", "Centrio CDO Hub (Ayala Malls)"
 */
export function isBranchMatch(
  scheduleBranchName: string,
  targetBranch: BranchRef | string
): boolean {
  if (!scheduleBranchName) return false;

  const targetName = typeof targetBranch === "string" ? targetBranch : targetBranch.name || targetBranch.shortName || "";
  const targetShort = typeof targetBranch === "string" ? targetBranch : targetBranch.shortName || "";

  const s = scheduleBranchName.toLowerCase();
  const t = targetName.toLowerCase();
  const ts = targetShort.toLowerCase();

  // 1. Direct or partial string containment
  if (s === t || s === ts || t.includes(s) || s.includes(t) || (ts && s.includes(ts))) {
    return true;
  }

  // 2. Key geographic landmarks matching for CDO
  const isDowntownS = s.includes("downtown") || s.includes("limketkai");
  const isDowntownT = t.includes("downtown") || t.includes("limketkai") || ts.includes("downtown");
  if (isDowntownS && isDowntownT) return true;

  const isUptownS = s.includes("uptown") || s.includes("pueblo");
  const isUptownT = t.includes("uptown") || t.includes("pueblo") || ts.includes("uptown");
  if (isUptownS && isUptownT) return true;

  const isCentrioS = s.includes("centrio") || s.includes("ayala");
  const isCentrioT = t.includes("centrio") || t.includes("ayala") || ts.includes("centrio");
  if (isCentrioS && isCentrioT) return true;

  return false;
}

/**
 * Determines whether a dentist is on duty on a specific date at a specific branch
 */
export function getDentistDutyForDate(
  dentist: DentistWithSchedule,
  branch: BranchRef | string,
  dateInput: string | Date
): DentistDutyStatus {
  const dentistName = dentist.name || "Attending Dentist";
  const rawSchedules: ClinicScheduleRow[] =
    Array.isArray(dentist.clinic_days) && dentist.clinic_days.length > 0
      ? dentist.clinic_days
      : Array.isArray(dentist.cdoClinicDays) && dentist.cdoClinicDays.length > 0
      ? dentist.cdoClinicDays
      : [];

  const targetDate = typeof dateInput === "string" ? new Date(dateInput + "T00:00:00") : dateInput;
  const dayOfWeek = targetDate.getDay(); // 0 = Sun, 1 = Mon, ..., 6 = Sat
  const dayName = DAY_NAMES[dayOfWeek];

  const scheduleDescriptions = rawSchedules
    .map((s) => `${s.branchName}: ${s.days} (${s.hours})`)
    .join(" • ");

  // If no schedules configured, default to general availability
  if (rawSchedules.length === 0) {
    return {
      dentistId: dentist.id,
      dentistName,
      isOnDuty: dayOfWeek !== 0,
      dutyStatus: dayOfWeek !== 0 ? "on_duty" : "off_duty_today",
      workingHours: "9:00 AM – 6:00 PM",
      startTime: "09:00",
      endTime: "18:00",
      reason: dayOfWeek === 0 ? "Off duty on Sundays" : "General clinic duty schedule",
      scheduleDescription: "General practice hours (Mon – Sat)",
    };
  }

  // 1. Check if the dentist has a schedule entry for this branch that includes this day
  for (const row of rawSchedules) {
    if (isBranchMatch(row.branchName, branch)) {
      const scheduledDays = parseDaysOfWeek(row.days);
      if (scheduledDays.includes(dayOfWeek)) {
        const timeRange = parseTimeRange(row.hours);
        return {
          dentistId: dentist.id,
          dentistName,
          isOnDuty: true,
          dutyStatus: "on_duty",
          workingHours: row.hours,
          startTime: timeRange.start,
          endTime: timeRange.end,
          dutyBranch: row.branchName,
          reason: `On duty at ${row.branchName} on ${dayName}s (${row.hours})`,
          scheduleDescription: scheduleDescriptions,
        };
      }
    }
  }

  // 2. Not on duty at this branch today. Is the dentist on duty at another branch today?
  for (const row of rawSchedules) {
    const scheduledDays = parseDaysOfWeek(row.days);
    if (scheduledDays.includes(dayOfWeek)) {
      return {
        dentistId: dentist.id,
        dentistName,
        isOnDuty: false,
        dutyStatus: "off_duty_other_branch",
        workingHours: row.hours,
        dutyBranch: row.branchName,
        reason: `On duty at ${row.branchName} on ${dayName}s, not at this branch`,
        scheduleDescription: scheduleDescriptions,
      };
    }
  }

  // 3. Off duty completely today
  return {
    dentistId: dentist.id,
    dentistName,
    isOnDuty: false,
    dutyStatus: "off_duty_today",
    reason: `Off duty on ${dayName}s`,
    scheduleDescription: scheduleDescriptions,
  };
}

/**
 * Finds the next upcoming date within the next 30 days where the dentist is on duty at the target branch
 */
export function getNextOnDutyDate(
  dentist: DentistWithSchedule,
  branch: BranchRef | string,
  fromDateStr?: string
): string | null {
  const start = fromDateStr ? new Date(fromDateStr + "T00:00:00") : new Date();

  // Scan up to 30 days ahead
  for (let i = 1; i <= 30; i++) {
    const checkDate = new Date(start);
    checkDate.setDate(checkDate.getDate() + i);

    const status = getDentistDutyForDate(dentist, branch, checkDate);
    if (status.isOnDuty) {
      const year = checkDate.getFullYear();
      const month = String(checkDate.getMonth() + 1).padStart(2, "0");
      const day = String(checkDate.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    }
  }

  return null;
}

/**
 * Filters a list of dentists into on-duty vs off-duty for a given branch and date
 */
export function filterDentistsByDuty(
  dentists: DentistWithSchedule[],
  branch: BranchRef | string,
  dateInput: string | Date
): {
  onDuty: { dentist: DentistWithSchedule; status: DentistDutyStatus }[];
  offDuty: { dentist: DentistWithSchedule; status: DentistDutyStatus }[];
} {
  const onDuty: { dentist: DentistWithSchedule; status: DentistDutyStatus }[] = [];
  const offDuty: { dentist: DentistWithSchedule; status: DentistDutyStatus }[] = [];

  for (const d of dentists) {
    const status = getDentistDutyForDate(d, branch, dateInput);
    if (status.isOnDuty) {
      onDuty.push({ dentist: d, status });
    } else {
      offDuty.push({ dentist: d, status });
    }
  }

  return { onDuty, offDuty };
}
