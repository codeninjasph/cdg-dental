"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CDO_BRANCHES_DATA,
  CDO_DENTISTS_DATA,
  CDO_SERVICES_DATA,
} from "@/lib/cdo-clinic-data";
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
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface PublicBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialServiceId?: string;
  initialDentistId?: string;
  initialBranchId?: string;
}

const AVAILABLE_SLOTS = [
  "09:00",
  "10:00",
  "11:00",
  "13:30",
  "14:30",
  "15:30",
  "16:30",
];

export function PublicBookingModal({
  isOpen,
  onClose,
  initialServiceId,
  initialDentistId,
  initialBranchId,
}: PublicBookingModalProps) {
  const supabase = createClient();

  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
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

  // Patient Info Form
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [hasMedicalAlert, setHasMedicalAlert] = useState(false);
  const [medicalAlertDetails, setMedicalAlertDetails] = useState("");

  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [confirmationCode, setConfirmationCode] = useState<string>("");

  // Initialize or reset when opened
  useEffect(() => {
    if (isOpen) {
      if (initialServiceId) setSelectedServiceId(initialServiceId);
      if (initialBranchId) setSelectedBranchId(initialBranchId);
      if (initialDentistId) {
        setSelectedDentistId(initialDentistId);
        setStep(3); // Skip directly to date/time if service & doctor are known
      } else {
        setStep(1);
      }

      // Default date to tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      // If Sunday, skip to Monday
      if (tomorrow.getDay() === 0) {
        tomorrow.setDate(tomorrow.getDate() + 1);
      }
      setSelectedDate(tomorrow.toISOString().split("T")[0]);
      setSelectedTime("");
      setErrorMessage(null);
    }
  }, [isOpen, initialServiceId, initialDentistId, initialBranchId]);

  // Check booked slots whenever date, dentist, or branch changes
  useEffect(() => {
    async function checkBookedSlots() {
      if (!selectedDate || !isOpen) return;
      setIsLoadingSlots(true);

      const dayStart = `${selectedDate}T00:00:00Z`;
      const dayEnd = `${selectedDate}T23:59:59Z`;

      let query = supabase
        .from("appointments")
        .select("start_time, end_time, dentist_id")
        .neq("status", "cancelled")
        .gte("start_time", dayStart)
        .lte("start_time", dayEnd);

      if (selectedDentistId && selectedDentistId !== "any") {
        query = query.eq("dentist_id", selectedDentistId);
      }

      const { data } = await query;
      if (data) {
        const booked = data.map((apt) => {
          const d = new Date(apt.start_time);
          const hh = String(d.getHours()).padStart(2, "0");
          const mm = String(d.getMinutes()).padStart(2, "0");
          return `${hh}:${mm}`;
        });
        setBookedSlots(booked);
      }
      setIsLoadingSlots(false);
    }

    checkBookedSlots();
  }, [selectedDate, selectedDentistId, selectedBranchId, isOpen, supabase]);

  if (!isOpen) return null;

  const activeBranch =
    CDO_BRANCHES_DATA.find((b) => b.id === selectedBranchId) ||
    CDO_BRANCHES_DATA[0];
  const activeService =
    CDO_SERVICES_DATA.find((s) => s.id === selectedServiceId) ||
    CDO_SERVICES_DATA[0];
  const activeDentist = CDO_DENTISTS_DATA.find((d) => d.id === selectedDentistId);

  // Handle final submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !phone) {
      setErrorMessage("Please fill in your first name, last name, and contact phone number.");
      return;
    }
    if (!selectedDate || !selectedTime) {
      setErrorMessage("Please choose a valid date and time slot.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      // 1. Check or create patient record
      let patientId: string | null = null;
      const { data: existingPatient } = await supabase
        .from("patients")
        .select("id")
        .eq("phone", phone.trim())
        .maybeSingle();

      if (existingPatient) {
        patientId = existingPatient.id;
      } else {
        const medicalNotes = hasMedicalAlert
          ? medicalAlertDetails || "Patient reported medical alerts upon online booking"
          : null;

        const { data: newPatient, error: patientError } = await supabase
          .from("patients")
          .insert({
            first_name: firstName.trim(),
            last_name: lastName.trim(),
            phone: phone.trim(),
            email: email.trim() || null,
            primary_branch_id: selectedBranchId,
            medical_alerts: medicalNotes,
          })
          .select("id")
          .single();

        if (patientError) throw patientError;
        patientId = newPatient.id;

        // Initialize 32 healthy adult teeth for new patient
        const teethRecords = Array.from({ length: 32 }, (_, i) => ({
          patient_id: newPatient.id,
          tooth_number: i + 1,
          status: "healthy",
        }));
        await supabase.from("patient_tooth_chart").insert(teethRecords);
      }

      // 2. Select dentist: if "any", pick first dentist associated with this branch
      let targetDentistId = selectedDentistId;
      if (!targetDentistId || targetDentistId === "any") {
        targetDentistId = CDO_DENTISTS_DATA[0].id;
      }

      // 3. Create appointment with 60 mins duration
      const startDateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const endDateTime = new Date(startDateTime.getTime() + 60 * 60000);

      const appointmentNotes = `[Online Patient Booking] Specialty: ${activeService.title}. Notes: ${notes || "None"}.`;

      const { data: aptData, error: aptError } = await supabase
        .from("appointments")
        .insert({
          patient_id: patientId,
          dentist_id: targetDentistId,
          branch_id: selectedBranchId,
          start_time: startDateTime.toISOString(),
          end_time: endDateTime.toISOString(),
          status: "scheduled",
          notes: appointmentNotes,
        })
        .select("id")
        .single();

      if (aptError) {
        if (aptError.message.includes("double_booking")) {
          throw new Error("This exact time slot was just booked by another patient. Please choose another time.");
        }
        throw aptError;
      }

      const refCode = `CDG-CDO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
      setConfirmationCode(refCode);
      setStep(5); // Move to success step!
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Failed to complete appointment booking. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddToCalendar = () => {
    if (!selectedDate || !selectedTime) return;
    const startIso = `${selectedDate.replace(/-/g, "")}T${selectedTime.replace(":", "")}00`;
    const endIso = `${selectedDate.replace(/-/g, "")}T${String(Number(selectedTime.split(":")[0]) + 1).padStart(2, "0")}${selectedTime.split(":")[1]}00`;
    const title = encodeURIComponent(`CDG Dental Appointment: ${activeService.title}`);
    const details = encodeURIComponent(`Dental appointment with ${activeDentist ? activeDentist.name : "CDG Specialist"} at ${activeBranch.name}.\nReference: ${confirmationCode}`);
    const location = encodeURIComponent(activeBranch.address);
    const googleCalUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}&location=${location}`;
    window.open(googleCalUrl, "_blank");
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 w-full max-w-3xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Top Header */}
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 px-6 py-4 text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 text-white text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Cagayan de Oro City
              </span>
              <span className="text-teal-100 text-xs flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Hospital-Grade Sterilization
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1 text-white">
              Book Your Dental Visit at CDG
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition-colors"
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
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step >= 1 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>1</span>
                <span>Service & Hub</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <div
                className={`flex items-center gap-1.5 ${
                  step >= 2 ? "text-teal-600 dark:text-teal-400 font-bold" : ""
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step >= 2 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>2</span>
                <span>Dentist</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <div
                className={`flex items-center gap-1.5 ${
                  step >= 3 ? "text-teal-600 dark:text-teal-400 font-bold" : ""
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step >= 3 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>3</span>
                <span>Date & Time</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
              <div
                className={`flex items-center gap-1.5 ${
                  step >= 4 ? "text-teal-600 dark:text-teal-400 font-bold" : ""
                }`}
              >
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                  step >= 4 ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-600"
                }`}>4</span>
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
              {/* Branch Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Select Cagayan de Oro Clinic Branch
                </label>
                <div className="grid sm:grid-cols-2 gap-3">
                  {CDO_BRANCHES_DATA.map((branch) => (
                    <button
                      key={branch.id}
                      type="button"
                      onClick={() => setSelectedBranchId(branch.id)}
                      className={`p-4 rounded-xl border text-left transition-all flex flex-col justify-between ${
                        selectedBranchId === branch.id
                          ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                            <Building className="w-4 h-4 text-teal-600" />
                            {branch.shortName}
                          </span>
                          {selectedBranchId === branch.id && (
                            <CheckCircle2 className="w-4 h-4 text-teal-600" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                          {branch.address}
                        </p>
                      </div>
                      <span className="text-[10px] text-teal-700 dark:text-teal-400 font-medium mt-2 block">
                        {branch.landmarks}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Choose Clinical Dental Specialty
                </label>
                <div className="grid sm:grid-cols-2 gap-2.5">
                  {CDO_SERVICES_DATA.map((srv) => (
                    <button
                      key={srv.id}
                      type="button"
                      onClick={() => setSelectedServiceId(srv.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all ${
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

          {/* STEP 2: DENTIST SELECTION */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Select Your Attending CDO Dentist
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  You can choose a specific specialist or select the earliest open slot.
                </p>
              </div>

              {/* Any Doctor Option */}
              <button
                type="button"
                onClick={() => setSelectedDentistId("any")}
                className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between ${
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
                      First Available CDO Specialist
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Recommended for earliest available appointments
                    </span>
                  </div>
                </div>
                <span className="text-[10px] bg-teal-600 text-white font-bold px-2 py-0.5 rounded-full">
                  Earliest Slot
                </span>
              </button>

              {/* Doctors Grid */}
              <div className="grid sm:grid-cols-2 gap-3">
                {CDO_DENTISTS_DATA.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setSelectedDentistId(doc.id)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex items-center gap-3 ${
                      selectedDentistId === doc.id
                        ? "border-teal-500 bg-teal-50/70 dark:bg-teal-950/30 ring-2 ring-teal-500/20"
                        : "border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-900"
                    }`}
                  >
                    <img
                      src={doc.photoUrl}
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
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        PRC Lic: {doc.prcLicense}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* STEP 3: DATE & TIME MATRIX */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Select Date & Time Slot
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Clinic hours: Monday to Saturday, 9:00 AM – 6:00 PM in Cagayan de Oro.
                </p>
              </div>

              {/* Date Input & Quick Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2">
                  Appointment Date
                </label>
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="date"
                      value={selectedDate}
                      min={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setSelectedDate(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>

              {/* Time Slots Matrix */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Available Time Slots
                  </label>
                  {isLoadingSlots && (
                    <span className="text-[10px] text-teal-600 animate-pulse">
                      Checking real-time schedule...
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {AVAILABLE_SLOTS.map((slot) => {
                    const isBooked = bookedSlots.includes(slot);
                    const isSelected = selectedTime === slot;

                    const [h, m] = slot.split(":");
                    const hourNum = parseInt(h, 10);
                    const ampm = hourNum >= 12 ? "PM" : "AM";
                    const displayHour = hourNum % 12 || 12;
                    const displayTime = `${displayHour}:${m} ${ampm}`;

                    return (
                      <button
                        key={slot}
                        type="button"
                        disabled={isBooked}
                        onClick={() => setSelectedTime(slot)}
                        className={`py-3 px-2 rounded-xl text-center border font-bold text-xs transition-all flex flex-col items-center justify-center ${
                          isBooked
                            ? "bg-slate-100 dark:bg-slate-800/40 text-slate-400 border-slate-200 dark:border-slate-800 cursor-not-allowed line-through"
                            : isSelected
                            ? "bg-teal-600 text-white border-teal-600 shadow-md shadow-teal-500/20"
                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-teal-400 text-slate-800 dark:text-slate-200"
                        }`}
                      >
                        <span>{displayTime}</span>
                        <span className="text-[9px] font-normal opacity-80 mt-0.5">
                          {isBooked ? "Booked" : "Available"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: PATIENT DETAILS */}
          {step === 4 && (
            <form id="public-booking-form" onSubmit={handleConfirmBooking} className="space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Patient Contact & Health Safety
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  We will send your instant appointment confirmation and SMS reminder.
                </p>
              </div>

              {/* Booking Summary Box */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-4 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Service</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeService.title}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Branch</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{activeBranch.shortName}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Dentist</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    {activeDentist ? activeDentist.name : "First Available CDO Doctor"}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Time</span>
                  <span className="font-bold text-teal-600 dark:text-teal-400">
                    {selectedDate} at {selectedTime}
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
                    className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                  />
                  <span>I have allergies, hypertension, diabetes, or medical conditions</span>
                </label>
                {hasMedicalAlert && (
                  <textarea
                    rows={2}
                    placeholder="Please specify your allergies or conditions so our doctors prepare safe anesthesia..."
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
                  placeholder="e.g. Tooth sensitivity on cold drinks, toothache on right side, interested in veneer consultation..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </form>
          )}

          {/* STEP 5: INSTANT CONFIRMATION */}
          {step === 5 && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 bg-teal-100 dark:bg-teal-950 text-teal-600 dark:text-teal-300 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-teal-500/20">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <span className="text-xs font-bold text-teal-700 dark:text-teal-400 uppercase tracking-wider">
                  Appointment Confirmed!
                </span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100 mt-1">
                  Maayong Adlaw, {firstName}!
                </h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto mt-1">
                  Your appointment has been reserved in our Cagayan de Oro clinic system.
                  We sent a confirmation text message to <span className="font-bold text-slate-800 dark:text-slate-200">{phone}</span>.
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
                        {selectedDate} at {selectedTime}
                      </span>
                      <span className="text-[11px] text-slate-500 block">60-minute clinical session</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-800 dark:text-slate-200">
                        {activeBranch.name}
                      </span>
                      <span className="text-[11px] text-slate-500 block">
                        {activeBranch.address}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleAddToCalendar}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2 shadow-sm"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  Add to Google Calendar
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all shadow-md shadow-teal-500/20"
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
                className="px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5"
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
                  if (step === 3 && (!selectedDate || !selectedTime)) {
                    setErrorMessage("Please select a date and an available time slot.");
                    return;
                  }
                  setErrorMessage(null);
                  setStep((s) => (s + 1) as any);
                }}
                className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold hover:bg-teal-700 transition-all flex items-center gap-1.5 shadow-md shadow-teal-500/20"
              >
                Next Step
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="submit"
                form="public-booking-form"
                disabled={isSubmitting}
                className="px-6 py-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 text-white text-xs font-bold hover:from-teal-700 hover:to-cyan-700 transition-all flex items-center gap-2 shadow-lg shadow-teal-500/25 disabled:opacity-50"
              >
                {isSubmitting ? "Confirming Slot..." : "Confirm Appointment"}
                <CheckCircle2 className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  </ModalPortal>
  );
}
