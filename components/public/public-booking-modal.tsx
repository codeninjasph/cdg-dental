"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CDO_BRANCHES_DATA,
  CDO_DENTISTS_DATA,
  CDO_SERVICES_DATA,
  DentalServiceCategory,
} from "@/lib/cdo-clinic-data";
import { BranchSchedule } from "@/types/dental";
import {
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  X,
  AlertTriangle,
  User,
  Phone,
  Mail,
  Sparkles,
  ShieldCheck,
  Building,
  Coffee,
  Loader2,
  ArrowRight,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  getDentistDutyForDate,
  getNextOnDutyDate,
  filterDentistsByDuty,
  isBranchMatch,
} from "@/lib/duty-schedule";

interface PublicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServiceId?: string;
  initialDentistId?: string;
  initialBranchId?: string;
}

interface PublicBranch {
  id: string;
  name: string;
  shortName?: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  is_active?: boolean;
}

interface PublicDentist {
  id: string;
  name: string;
  title?: string;
  prc_license?: string;
  prcLicense?: string;
  photo_url?: string;
  photoUrl?: string;
  specialty: string;
  clinic_days?: { branchName: string; days: string; hours: string }[];
  cdoClinicDays?: { branchName: string; days: string; hours: string }[];
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

function format12Hour(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = mStr || "00";
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m} ${ampm}`;
}

export function PublicBookingModal({
  isOpen,
  onClose,
  initialServiceId,
  initialDentistId,
  initialBranchId,
}: PublicBookingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // ── Database-Driven Metadata States ──
  const [branchesList, setBranchesList] = useState<PublicBranch[]>(CDO_BRANCHES_DATA);
  const [dentistsList, setDentistsList] = useState<PublicDentist[]>(CDO_DENTISTS_DATA);
  const [servicesList, setServicesList] = useState<DentalServiceCategory[]>(CDO_SERVICES_DATA);
  const [isLoadingClinicData, setIsLoadingClinicData] = useState(false);

  // Selection States
  const [selectedServiceId, setSelectedServiceId] = useState<string>(
    initialServiceId || CDO_SERVICES_DATA[0].id
  );
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    initialBranchId || CDO_BRANCHES_DATA[0].id
  );
  const [selectedDentistId, setSelectedDentistId] = useState<string>(
    initialDentistId || ""
  );
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Patient Intake Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [hasMedicalAlert, setHasMedicalAlert] = useState(false);
  const [medicalAlertDetails, setMedicalAlertDetails] = useState("");

  // Real-time Database Operating Schedules & Booked Slots
  const [branchSchedules, setBranchSchedules] = useState<BranchSchedule[]>([]);
  const [isLoadingSchedule, setIsLoadingSchedule] = useState(false);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Submission & Confirmation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string>("");

  // 1. Fetch Public Clinic Metadata (Branches & Dentists) directly from DB
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    setIsLoadingClinicData(true);

    fetch("/api/public/clinic-data")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success) {
          if (Array.isArray(data.branches) && data.branches.length > 0) {
            setBranchesList(data.branches);
            // Default selected branch if current not in list
            if (!selectedBranchId && data.branches.length > 0) {
              setSelectedBranchId(data.branches[0].id);
            }
          }
          if (Array.isArray(data.dentists) && data.dentists.length > 0) {
            setDentistsList(data.dentists);
          }
          if (Array.isArray(data.services) && data.services.length > 0) {
            setServicesList(data.services);
          }
        }
      })
      .catch((err) => {
        console.warn("Falling back to local clinic catalog:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingClinicData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // 2. Initialize or reset modal upon opening
  useEffect(() => {
    if (isOpen) {
      if (initialServiceId) setSelectedServiceId(initialServiceId);
      if (initialBranchId) setSelectedBranchId(initialBranchId);
      if (initialDentistId) {
        setSelectedDentistId(initialDentistId);
        setStep(3);
      } else {
        setStep(1);
      }

      // Default date to tomorrow (skipping Sunday by default)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      if (tomorrow.getDay() === 0) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      setSelectedDate(tomorrow.toISOString().split("T")[0]);
      setSelectedTime("");
      setErrorMessage(null);
    }
  }, [isOpen, initialServiceId, initialDentistId, initialBranchId]);

  // 3. Fetch Branch Operating Schedules directly from database
  useEffect(() => {
    if (!isOpen || !selectedBranchId) return;
    let isMounted = true;
    setIsLoadingSchedule(true);

    fetch(`/api/public/hours?branch_id=${selectedBranchId}`)
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.schedules && Array.isArray(data.schedules)) {
          setBranchSchedules(data.schedules);
        }
      })
      .catch((err) => {
        console.warn("Could not load branch schedule from database:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSchedule(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedBranchId]);

  // 4. Fetch Real-Time Booked Slots directly from DB for double-booking conflict prevention
  useEffect(() => {
    async function checkBookedSlots() {
      if (!selectedDate || !selectedBranchId || !isOpen) return;
      setIsLoadingSlots(true);

      try {
        const dParam =
          selectedDentistId && selectedDentistId !== "any"
            ? `&dentist_id=${selectedDentistId}`
            : "";
        const res = await fetch(
          `/api/public/booked-slots?branch_id=${selectedBranchId}&date=${selectedDate}${dParam}`
        );
        const data = await res.json();
        if (data.success && Array.isArray(data.booked_slots)) {
          setBookedSlots(data.booked_slots);
        }
      } catch (err) {
        console.warn("Could not check booked slots:", err);
      } finally {
        setIsLoadingSlots(false);
      }
    }

    checkBookedSlots();
  }, [selectedDate, selectedDentistId, selectedBranchId, isOpen]);

  // 5. Active Selections & Computed Day Properties
  const activeBranch = useMemo(() => {
    return (
      branchesList.find((b) => b.id === selectedBranchId) ||
      branchesList[0] ||
      CDO_BRANCHES_DATA[0]
    );
  }, [branchesList, selectedBranchId]);

  const activeService = useMemo(() => {
    return (
      servicesList.find((s) => s.id === selectedServiceId) ||
      servicesList[0] ||
      CDO_SERVICES_DATA[0]
    );
  }, [servicesList, selectedServiceId]);

  const activeDentist = useMemo(() => {
    return dentistsList.find((d) => d.id === selectedDentistId);
  }, [dentistsList, selectedDentistId]);

  // Selected Day of Week (0 = Sun, 1 = Mon, ..., 6 = Sat)
  const selectedDayOfWeek = useMemo(() => {
    if (!selectedDate) return null;
    const parts = selectedDate.split("-").map(Number);
    if (parts.length !== 3) return null;
    const dt = new Date(parts[0], parts[1] - 1, parts[2]);
    return dt.getDay();
  }, [selectedDate]);

  // Active Day Schedule from Database
  const activeDaySchedule = useMemo(() => {
    if (selectedDayOfWeek === null) return null;
    const found = branchSchedules.find((s) => s.day_of_week === selectedDayOfWeek);
    if (found) return found;
    return {
      branch_id: selectedBranchId,
      day_of_week: selectedDayOfWeek,
      is_open: selectedDayOfWeek !== 0,
      open_time: "09:00",
      close_time: "18:00",
      has_break: true,
      break_start: "12:00",
      break_end: "13:00",
      slot_duration_minutes: 60,
    };
  }, [branchSchedules, selectedDayOfWeek, selectedBranchId]);

  const isDayClosed = activeDaySchedule ? !activeDaySchedule.is_open : false;

  // Duty Schedule Evaluation for Selected Dentist or Branch Roster
  const dentistDuty = useMemo(() => {
    if (!activeDentist || !activeBranch || !selectedDate) return null;
    return getDentistDutyForDate(activeDentist, activeBranch, selectedDate);
  }, [activeDentist, activeBranch, selectedDate]);

  const nextAvailableDutyDate = useMemo(() => {
    if (!activeDentist || !activeBranch || !selectedDate || (dentistDuty && dentistDuty.isOnDuty)) return null;
    return getNextOnDutyDate(activeDentist, activeBranch, selectedDate);
  }, [activeDentist, activeBranch, selectedDate, dentistDuty]);

  const branchDutyRoster = useMemo(() => {
    if (!activeBranch || !selectedDate) return { onDuty: [], offDuty: [] };
    return filterDentistsByDuty(dentistsList, activeBranch, selectedDate);
  }, [dentistsList, activeBranch, selectedDate]);

  const isDentistOffDuty = Boolean(activeDentist && dentistDuty && !dentistDuty.isOnDuty);
  const isNoDentistAvailable = Boolean(!activeDentist && branchDutyRoster.onDuty.length === 0);

  // Clear selected time if chosen day is closed or doctor is off duty
  useEffect(() => {
    if ((isDayClosed || isDentistOffDuty || isNoDentistAvailable) && selectedTime) {
      setSelectedTime("");
    }
  }, [isDayClosed, isDentistOffDuty, isNoDentistAvailable, selectedTime]);

  // Dynamically compute available slots for the selected day based on DB operating hours & dentist duty hours
  const computedSlots = useMemo(() => {
    if (!activeDaySchedule || !activeDaySchedule.is_open) return [];
    if (isDentistOffDuty) return [];

    const slots: string[] = [];
    let [openH, openM] = (activeDaySchedule.open_time || "09:00").slice(0, 5).split(":").map(Number);
    let [closeH, closeM] = (activeDaySchedule.close_time || "18:00").slice(0, 5).split(":").map(Number);
    const step = activeDaySchedule.slot_duration_minutes || 60;

    // Constrain to active doctor duty hours if available
    if (activeDentist && dentistDuty && dentistDuty.isOnDuty && dentistDuty.startTime && dentistDuty.endTime) {
      const [dStartH, dStartM] = dentistDuty.startTime.split(":").map(Number);
      const [dEndH, dEndM] = dentistDuty.endTime.split(":").map(Number);
      const dStartMin = dStartH * 60 + dStartM;
      const dEndMin = dEndH * 60 + dEndM;
      const bOpenMin = openH * 60 + openM;
      const bCloseMin = closeH * 60 + closeM;
      const effectiveOpen = Math.max(bOpenMin, dStartMin);
      const effectiveClose = Math.min(bCloseMin, dEndMin);
      openH = Math.floor(effectiveOpen / 60);
      openM = effectiveOpen % 60;
      closeH = Math.floor(effectiveClose / 60);
      closeM = effectiveClose % 60;
    }

    let [bStartH, bStartM] = [12, 0];
    let [bEndH, bEndM] = [13, 0];
    if (activeDaySchedule.has_break && activeDaySchedule.break_start && activeDaySchedule.break_end) {
      [bStartH, bStartM] = activeDaySchedule.break_start.slice(0, 5).split(":").map(Number);
      [bEndH, bEndM] = activeDaySchedule.break_end.slice(0, 5).split(":").map(Number);
    }

    const openMin = openH * 60 + openM;
    const closeMin = closeH * 60 + closeM;
    const bStartMin = bStartH * 60 + bStartM;
    const bEndMin = bEndH * 60 + bEndM;

    let cur = openMin;
    while (cur + step <= closeMin) {
      const overlapsBreak =
        activeDaySchedule.has_break &&
        cur >= bStartMin &&
        cur < bEndMin;

      if (!overlapsBreak) {
        const slotH = Math.floor(cur / 60);
        const slotM = cur % 60;
        slots.push(`${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`);
      }
      cur += step;
    }

    return slots;
  }, [activeDaySchedule, isDentistOffDuty, activeDentist, dentistDuty]);

  // 6. Direct Database Booking Submission via /api/public/booking
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim()) {
      setErrorMessage("Please fill in your first name, last name, and contact phone number.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      setErrorMessage("Please choose a valid date and time slot.");
      return;
    }
    if (isDayClosed) {
      setErrorMessage(
        `This clinic branch is closed on ${DAY_NAMES[selectedDayOfWeek ?? 0]}s. Please choose an open date.`
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/public/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          service_id: selectedServiceId,
          service_title: activeService.title,
          dentist_id: selectedDentistId || "any",
          date: selectedDate,
          time: selectedTime,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          email: email || null,
          notes: notes || null,
          has_medical_alert: hasMedicalAlert,
          medical_alert_details: medicalAlertDetails || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Could not reserve appointment slot. Please try again.");
      }

      setConfirmationCode(data.confirmation_code);
      setStep(5);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to confirm appointment. Please choose another slot."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCalendar = () => {
    if (!selectedDate || !selectedTime) return;
    const startIso = `${selectedDate.replace(/-/g, "")}T${selectedTime.replace(":", "")}00`;
    const endIso = `${selectedDate.replace(/-/g, "")}T${String(Number(selectedTime.split(":")[0]) + 1).padStart(2, "0")}${selectedTime.split(":")[1]}00`;
    const title = encodeURIComponent(`CDG Dental Appointment: ${activeService.title}`);
    const details = encodeURIComponent(
      `Dental appointment with ${activeDentist ? activeDentist.name : "CDG Dental Specialist"} at ${activeBranch.name}.\nConfirmation Reference: ${confirmationCode}`
    );
    const location = encodeURIComponent(activeBranch.address || activeBranch.name);
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    window.open(googleCalUrl, "_blank");
  };

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
          {/* Modal Top Header */}
          <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 text-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Direct Clinic Booking
                </span>
                <span className="text-teal-100 text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Verified Live Schedule
                </span>
              </div>
              <h2 className="text-xl font-bold mt-1 text-white">
                Book Your Dental Visit at CDG
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Wizard Steps (1 to 4) */}
          {step < 5 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-3 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                <div
                  className={`flex items-center gap-1.5 ${
                    step >= 1 ? "text-teal-600 dark:text-teal-400 font-bold" : ""
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      step >= 1 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    1
                  </span>
                  <span>Branch & Service</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <div
                  className={`flex items-center gap-1.5 ${
                    step >= 2 ? "text-teal-600 dark:text-teal-400 font-bold" : ""
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      step >= 2 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    2
                  </span>
                  <span>Dentist</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <div
                  className={`flex items-center gap-1.5 ${
                    step >= 3 ? "text-teal-600 dark:text-teal-400 font-bold" : ""
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      step >= 3 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    3
                  </span>
                  <span>Date & Slot</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <div
                  className={`flex items-center gap-1.5 ${
                    step >= 4 ? "text-teal-600 dark:text-teal-400 font-bold" : ""
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                      step >= 4 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    4
                  </span>
                  <span>Patient Info</span>
                </div>
              </div>
            </div>
          )}

          {/* Modal Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-6">
            {errorMessage && (
              <div className="mb-4 p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl text-xs text-red-700 dark:text-red-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-500" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* STEP 1: SERVICE & BRANCH */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Branch Selector (From Database) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Select Clinic Branch
                    </label>
                    {isLoadingClinicData && (
                      <span className="text-[10px] text-teal-600 animate-pulse">
                        Loading clinic branches...
                      </span>
                    )}
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {branchesList.map((branch) => {
                      const isSelected = selectedBranchId === branch.id;
                      const branchDisplayName = branch.shortName || branch.name;
                      return (
                        <button
                          key={branch.id}
                          type="button"
                          onClick={() => setSelectedBranchId(branch.id)}
                          className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between cursor-pointer ${
                            isSelected
                              ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                              : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                          }`}
                        >
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                                <Building className="w-4 h-4 text-teal-600" />
                                {branchDisplayName}
                              </span>
                              {isSelected && (
                                <CheckCircle2 className="w-4 h-4 text-teal-600" />
                              )}
                            </div>
                            <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                              {branch.address || "Main Clinic Facility"}
                            </p>
                          </div>
                          {branch.phone && (
                            <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium mt-2 block">
                              Tel: {branch.phone}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Service Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                    Select Dental Specialty or Concern
                  </label>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {servicesList.map((srv) => (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => setSelectedServiceId(srv.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer ${
                          selectedServiceId === srv.id
                            ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                            {srv.title}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            {srv.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {srv.tagline}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: DENTIST SELECTION (From Database) */}
            {step === 2 && (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Select Your Attending CDG Dentist
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Choose a specific practitioner or select the first available doctor.
                  </p>
                </div>

                {/* Any Doctor Option */}
                <button
                  type="button"
                  onClick={() => setSelectedDentistId("any")}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                    selectedDentistId === "any" || !selectedDentistId
                      ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold text-xs">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block">
                        First Available Dental Specialist
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Recommended for earliest appointment openings
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                    Earliest Slot
                  </span>
                </button>

                {/* Doctors Grid from Database */}
                <div className="grid sm:grid-cols-2 gap-3">
                  {dentistsList.map((doc) => {
                    const isSelected = selectedDentistId === doc.id;
                    const photo = doc.photo_url || doc.photoUrl || "/images/dentist-dr-kenneth.jpg";
                    const prc = doc.prc_license || doc.prcLicense || "Registered PRC";

                    return (
                      <button
                        key={doc.id}
                        type="button"
                        onClick={() => setSelectedDentistId(doc.id)}
                        className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 cursor-pointer ${
                          isSelected
                            ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                            : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <img
                          src={photo}
                          alt={doc.name}
                          className="w-12 h-12 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-700"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="font-bold text-xs text-slate-900 dark:text-slate-100 block truncate">
                            {doc.name}
                          </span>
                          <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium block truncate">
                            {doc.specialty}
                          </span>

                          {/* Branch specific schedule pill */}
                          {(() => {
                            const schedules = doc.clinic_days || doc.cdoClinicDays || [];
                            const branchSched = schedules.find((s) => isBranchMatch(s.branchName, activeBranch));
                            if (branchSched) {
                              return (
                                <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 truncate max-w-full">
                                  📅 {branchSched.days} ({branchSched.hours})
                                </span>
                              );
                            }
                            if (schedules.length > 0) {
                              return (
                                <span className="text-[10px] text-slate-400 block mt-0.5 truncate">
                                  Primary: {schedules[0].branchName}
                                </span>
                              );
                            }
                            return (
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                PRC: {prc}
                              </span>
                            );
                          })()}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: DATE & TIME MATRIX (Dynamic Database Schedules & Real-Time Conflict Checking) */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Select Date & Time Slot
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeDaySchedule
                      ? activeDaySchedule.is_open
                        ? `${activeBranch.name}: Open ${format12Hour(activeDaySchedule.open_time)} – ${format12Hour(activeDaySchedule.close_time)} on ${DAY_NAMES[selectedDayOfWeek ?? 1]}s.`
                        : `${activeBranch.name}: Closed on ${DAY_NAMES[selectedDayOfWeek ?? 0]}s.`
                      : "Choose your appointment date and available time slot."}
                  </p>
                </div>

                {/* Date Input & Real-Time Duty Badges */}
                <div className="space-y-2.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Appointment Date
                  </label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input
                        type="date"
                        value={selectedDate}
                        min={new Date().toISOString().split("T")[0]}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Off Duty Alert for selected doctor with Jump Button */}
                  {isDentistOffDuty && activeDentist && dentistDuty && (
                    <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 space-y-3 animate-in fade-in duration-200">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="block font-bold text-sm">
                            {activeDentist.name} is Not on Duty on {DAY_NAMES[selectedDayOfWeek ?? 0]}s
                          </strong>
                          <p className="text-xs text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                            {dentistDuty.reason}. Regular schedule:{" "}
                            <span className="font-semibold">{dentistDuty.scheduleDescription}</span>.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
                        {nextAvailableDutyDate && (
                          <button
                            type="button"
                            onClick={() => setSelectedDate(nextAvailableDutyDate)}
                            className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Calendar className="w-3.5 h-3.5" />
                            <span>Pick Next Open Date ({nextAvailableDutyDate})</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedDentistId("any")}
                          className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-100 font-semibold text-xs hover:bg-amber-100/50 transition-colors cursor-pointer"
                        >
                          Switch to First Available Doctor on {selectedDate}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* On Duty Confirmation for selected doctor */}
                  {!isDentistOffDuty && activeDentist && dentistDuty && dentistDuty.isOnDuty && (
                    <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs flex items-center justify-between animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="font-semibold">{activeDentist.name} is scheduled on duty</span>
                      </div>
                      <span className="font-mono font-bold text-[11px] bg-emerald-100 dark:bg-emerald-900/60 px-2 py-0.5 rounded">
                        {dentistDuty.workingHours}
                      </span>
                    </div>
                  )}

                  {/* First Available Doctor Duty Roster Summary */}
                  {(!activeDentist || selectedDentistId === "any") && (
                    <div className="p-3 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 text-teal-800 dark:text-teal-200 text-xs flex items-center justify-between animate-in fade-in duration-150">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-teal-600 shrink-0" />
                        <span className="font-semibold">
                          {branchDutyRoster.onDuty.length > 0
                            ? `${branchDutyRoster.onDuty.length} specialist${branchDutyRoster.onDuty.length > 1 ? "s" : ""} on duty at ${activeBranch.shortName || activeBranch.name}`
                            : `Earliest available doctor openings`}
                        </span>
                      </div>
                      {branchDutyRoster.onDuty.length > 0 && (
                        <span className="text-[10px] text-teal-700 dark:text-teal-300 font-medium truncate max-w-[220px]">
                          {branchDutyRoster.onDuty.map((o) => o.dentist.name.split(",")[0]).join(", ")}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Closed Alert or Time Slots Grid */}
                {isDayClosed ? (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block font-bold text-sm mb-1">
                        Clinic Branch Closed on {DAY_NAMES[selectedDayOfWeek ?? 0]}s
                      </strong>
                      <p className="leading-relaxed text-[11px] text-amber-700 dark:text-amber-300">
                        {activeBranch.name} is not open for appointments on {DAY_NAMES[selectedDayOfWeek ?? 0]}s according to the clinic operating schedule. Please choose an open day or select another clinic branch.
                      </p>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                        Available Time Slots
                      </label>
                      {(isLoadingSlots || isLoadingSchedule) && (
                        <span className="text-[10px] text-teal-600 animate-pulse">
                          Checking real-time doctor availability...
                        </span>
                      )}
                    </div>

                    {computedSlots.length > 0 ? (
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                        {computedSlots.map((slot) => {
                          const isBooked = bookedSlots.includes(slot);
                          const isSelected = selectedTime === slot;

                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={isBooked}
                              onClick={() => setSelectedTime(slot)}
                              className={`py-3 px-2 rounded-xl text-center border font-bold text-xs transition-all flex flex-col items-center justify-center cursor-pointer ${
                                isBooked
                                  ? "bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed line-through"
                                  : isSelected
                                  ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20"
                                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400 text-slate-800 dark:text-slate-200"
                              }`}
                            >
                              <span>{format12Hour(slot)}</span>
                              <span className="text-[9px] font-normal opacity-80 mt-0.5">
                                {isBooked ? "Booked" : "Available"}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500">
                        No appointment slots available within operating hours for this day.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* STEP 4: PATIENT INTAKE FORM */}
            {step === 4 && (
              <form id="public-booking-form" onSubmit={handleConfirmBooking} className="space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Patient Contact & Medical Safety
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Your appointment is directly reserved with the CDG Dental clinic team.
                  </p>
                </div>

                {/* Booking Summary Card */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Service</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">{activeService.title}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Branch</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {activeBranch.shortName || activeBranch.name}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Dentist</span>
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {activeDentist ? activeDentist.name : "First Available CDG Specialist"}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Time</span>
                    <span className="font-bold text-teal-600 dark:text-teal-400">
                      {selectedDate} at {format12Hour(selectedTime)}
                    </span>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      First Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Juan"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Last Name *
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dela Cruz"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mobile Phone (For SMS Confirmation) *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="+63 9XX XXX XXXX"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Email (Optional)
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="juan@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Medical Alert Pre-Screening */}
                <div className="pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={hasMedicalAlert}
                      onChange={(e) => setHasMedicalAlert(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300 cursor-pointer"
                    />
                    <span>I have allergies, hypertension, diabetes, or medical conditions</span>
                  </label>
                  {hasMedicalAlert && (
                    <textarea
                      rows={2}
                      placeholder="Please specify allergies or medical conditions so our clinical team prepares safe anesthesia..."
                      value={medicalAlertDetails}
                      onChange={(e) => setMedicalAlertDetails(e.target.value)}
                      className="w-full mt-2 p-2.5 rounded-xl border border-amber-300 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-amber-500"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Notes or Symptoms (Optional)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Tooth sensitivity on cold drinks, toothache on upper right, consultation for dental veneers..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </form>
            )}

            {/* STEP 5: INSTANT DATABASE CONFIRMATION */}
            {step === 5 && (
              <div className="py-6 text-center space-y-5">
                <div className="w-16 h-16 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-300 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
                  <CheckCircle2 className="w-9 h-9" />
                </div>

                <div>
                  <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                    Appointment Booked & Confirmed!
                  </span>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                    Welcome to CDG Dental, {firstName}!
                  </h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                    Your appointment has been recorded directly into our clinic management system. A confirmation SMS was dispatched to <span className="font-bold text-slate-800 dark:text-slate-200">{phone}</span>.
                  </p>
                </div>

                {/* Reference Card */}
                <div className="bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 max-w-md mx-auto text-left space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                    <span className="text-[11px] text-slate-500">Booking Reference</span>
                    <span className="text-xs font-mono font-black text-teal-600 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded">
                      {confirmationCode}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {selectedDate} at {format12Hour(selectedTime)}
                        </span>
                        <span className="text-[11px] text-slate-500 block">
                          Clinical session with {activeDentist ? activeDentist.name : "Attending Dentist"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-slate-800 dark:text-slate-200">
                          {activeBranch.name}
                        </span>
                        {activeBranch.address && (
                          <span className="text-[11px] text-slate-500 block">
                            {activeBranch.address}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleAddToCalendar}
                    className="px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm cursor-pointer"
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    Add to Google Calendar
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-500/20 cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Bottom Footer Navigation (Steps 1 to 4) */}
          {step < 5 && (
            <div className="bg-slate-50 dark:bg-slate-800/50 px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => (s - 1) as any)}
                  className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              ) : (
                <div />
              )}

              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => {
                    if (step === 3) {
                      if (isDayClosed) {
                        setErrorMessage(
                          `This clinic branch is closed on ${DAY_NAMES[selectedDayOfWeek ?? 0]}s. Please choose an open date.`
                        );
                        return;
                      }
                      if (!selectedDate || !selectedTime) {
                        setErrorMessage("Please select a date and an available time slot.");
                        return;
                      }
                    }
                    setErrorMessage(null);
                    setStep((s) => (s + 1) as any);
                  }}
                  className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20 cursor-pointer"
                >
                  Next Step
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="submit"
                  form="public-booking-form"
                  disabled={isSubmitting}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-xs font-bold hover:from-teal-700 hover:to-cyan-700 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Confirming Appointment...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm Appointment</span>
                      <CheckCircle2 className="w-4 h-4" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalPortal>
  );
}
