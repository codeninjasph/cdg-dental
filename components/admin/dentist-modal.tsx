"use client";

import React, { useState, useEffect, useRef } from "react";
import { useClinic } from "@/context/clinic-context";
import { CDO_BRANCHES_DATA } from "@/lib/cdo-clinic-data";
import { isBranchMatch, parseDaysOfWeek } from "@/lib/duty-schedule";
import {
  X,
  Sparkles,
  Award,
  GraduationCap,
  Calendar,
  Building,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Plus,
  Trash2,
  UserCheck,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

export interface DentistProfileData {
  id?: string;
  name: string;
  title: string;
  prc_license?: string;
  prcLicense?: string;
  photo_url?: string;
  photoUrl?: string;
  specialty: string;
  education?: string | null;
  certifications?: string[];
  experience_years?: number;
  experienceYears?: number;
  bio?: string | null;
  clinic_days?: { branchName: string; days: string; hours: string }[];
  cdoClinicDays?: { branchName: string; days: string; hours: string }[];
  display_order?: number;
  is_active?: boolean;
}

interface DentistModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  dentistToEdit?: DentistProfileData | null;
}

const PRESET_HEADSHOTS = [
  { label: "Dr. Kenneth", url: "/images/dentist-dr-kenneth.jpg" },
  { label: "Dr. Andrea", url: "/images/dentist-dr-andrea.jpg" },
  { label: "Dr. Marcus", url: "/images/dentist-dr-marcus.jpg" },
  { label: "Dr. Sophia", url: "/images/dentist-dr-sophia.jpg" },
];

export function DentistModal({
  isOpen,
  onClose,
  onSuccess,
  dentistToEdit,
}: DentistModalProps) {
  const { showToast, branches: clinicBranches } = useClinic();
  const isEditing = Boolean(dentistToEdit && dentistToEdit.id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dynamicBranches, setDynamicBranches] = useState<
    Array<{ id: string; name: string; shortName: string }>
  >(
    CDO_BRANCHES_DATA.map((b) => ({
      id: b.id,
      name: b.name,
      shortName: b.shortName,
    }))
  );

  useEffect(() => {
    if (clinicBranches && clinicBranches.length > 0) {
      setDynamicBranches(
        clinicBranches.map((b) => ({
          id: b.id,
          name: b.name,
          shortName:
            b.name.includes("—")
              ? b.name.split("—")[1].trim()
              : b.name.replace(/^CDG Dental Clinic\s*[—–-]\s*/i, "").trim(),
        }))
      );
    } else {
      fetch("/api/public/clinic-data")
        .then((res) => res.json())
        .then((data) => {
          if (data.branches && data.branches.length > 0) {
            setDynamicBranches(
              data.branches.map((b: any) => ({
                id: b.id,
                name: b.name,
                shortName:
                  b.shortName ||
                  (b.name.includes("—")
                    ? b.name.split("—")[1].trim()
                    : b.name.replace(/^CDG Dental Clinic\s*[—–-]\s*/i, "").trim()),
              }))
            );
          }
        })
        .catch(() => {});
    }
  }, [clinicBranches]);

  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [prcLicense, setPrcLicense] = useState("");
  const [photoUrl, setPhotoUrl] = useState("/images/dentist-dr-kenneth.jpg");
  const [specialty, setSpecialty] = useState("");
  const [experienceYears, setExperienceYears] = useState(5);
  const [education, setEducation] = useState("");
  const [certificationsText, setCertificationsText] = useState("");
  const [bio, setBio] = useState("");
  const [clinicDays, setClinicDays] = useState<
    { branchName: string; days: string; hours: string }[]
  >([
    { branchName: "Downtown (Limketkai)", days: "Mon – Fri", hours: "9:00 AM – 6:00 PM" },
  ]);
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (dentistToEdit) {
      setName(dentistToEdit.name || "");
      setTitle(dentistToEdit.title || "");
      setPrcLicense(dentistToEdit.prc_license || dentistToEdit.prcLicense || "");
      setPhotoUrl(
        dentistToEdit.photo_url ||
          dentistToEdit.photoUrl ||
          "/images/dentist-dr-kenneth.jpg"
      );
      setSpecialty(dentistToEdit.specialty || "");
      setExperienceYears(
        dentistToEdit.experience_years ?? dentistToEdit.experienceYears ?? 5
      );
      setEducation(dentistToEdit.education || "");
      const certs = dentistToEdit.certifications || [];
      setCertificationsText(certs.join("\n"));
      setBio(dentistToEdit.bio || "");
      const schedules =
        dentistToEdit.clinic_days || dentistToEdit.cdoClinicDays || [];
      setClinicDays(
        schedules.length > 0
          ? schedules
          : [
              {
                branchName: "Downtown (Limketkai)",
                days: "Mon – Fri",
                hours: "9:00 AM – 6:00 PM",
              },
            ]
      );
      setIsActive(
        dentistToEdit.is_active !== undefined ? dentistToEdit.is_active : true
      );
    } else {
      setName("");
      setTitle("");
      setPrcLicense("");
      setPhotoUrl("/images/dentist-dr-kenneth.jpg");
      setSpecialty("");
      setExperienceYears(5);
      setEducation("");
      setCertificationsText("");
      setBio("");
      setClinicDays([
        {
          branchName: "Downtown (Limketkai)",
          days: "Mon – Fri",
          hours: "9:00 AM – 6:00 PM",
        },
      ]);
      setIsActive(true);
    }
    setError(null);
  }, [dentistToEdit, isOpen]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file (PNG, JPG, WebP).");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image file size must be under 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setPhotoUrl(reader.result);
        setError(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddScheduleRow = () => {
    setClinicDays((prev) => [
      ...prev,
      { branchName: "Uptown (Pueblo de Oro)", days: "Tue, Thu, Sat", hours: "9:00 AM – 5:00 PM" },
    ]);
  };

  const handleRemoveScheduleRow = (index: number) => {
    setClinicDays((prev) => prev.filter((_, i) => i !== index));
  };

  const handleScheduleChange = (
    index: number,
    field: "branchName" | "days" | "hours",
    value: string
  ) => {
    setClinicDays((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setError("Doctor full name is required.");
      return;
    }
    if (!title.trim()) {
      setError("Doctor title/role is required.");
      return;
    }
    if (!specialty.trim()) {
      setError("Specialty is required.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const certifications = certificationsText
        .split("\n")
        .map((c) => c.trim())
        .filter(Boolean);

      const payload = {
        ...(isEditing ? { id: dentistToEdit?.id } : {}),
        name: name.trim(),
        title: title.trim(),
        prc_license: prcLicense.trim() || "PRC Pending",
        photo_url: photoUrl.trim(),
        specialty: specialty.trim(),
        education: education.trim() || null,
        certifications,
        experience_years: Number(experienceYears) || 0,
        bio: bio.trim() || null,
        clinic_days: clinicDays.filter((s) => s.branchName.trim() !== ""),
        is_active: isActive,
      };

      const res = await fetch("/api/admin/dentists", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save doctor profile.");
      }

      showToast(
        isEditing
          ? `Dr. ${name} updated successfully!`
          : `New doctor profile for Dr. ${name} added!`,
        "success"
      );

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden text-slate-900 dark:text-slate-100">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/50 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  {isEditing ? "Edit Dentist Profile" : "Add New Attending Doctor"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {isEditing
                    ? "Update doctor credentials, clinical bio, schedule & portrait photo"
                    : "Register an attending dental specialist in CDO"}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body / Scrollable Form */}
          <form
            onSubmit={handleSubmit}
            className="flex-1 overflow-y-auto p-6 space-y-6 text-xs sm:text-sm"
          >
            {error && (
              <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900 flex items-start gap-2.5 text-rose-800 dark:text-rose-200 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Photo Management Section */}
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 space-y-4">
              <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-teal-600" />
                Doctor Portrait Photo
              </span>

              <div className="grid sm:grid-cols-12 gap-5 items-center">
                {/* Photo Preview */}
                <div className="sm:col-span-4 flex flex-col items-center">
                  <div className="relative w-32 h-40 sm:w-36 sm:h-44 rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 shadow-md">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt="Doctor preview"
                        className="w-full h-full object-cover"
                        onError={() => setPhotoUrl("/images/dentist-dr-kenneth.jpg")}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-400">
                        No Photo
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mt-2 font-medium">
                    Live Photo Preview
                  </span>
                </div>

                {/* Photo Upload & Presets */}
                <div className="sm:col-span-8 space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Photo URL or Local File
                    </label>
                    <input
                      type="text"
                      value={photoUrl}
                      onChange={(e) => setPhotoUrl(e.target.value)}
                      placeholder="https://... or /images/..."
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    />
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800 hover:bg-teal-100 transition-colors text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload Local Photo</span>
                    </button>
                    <span className="text-[11px] text-slate-400">PNG, JPG, WebP (Max 5MB)</span>
                  </div>

                  {/* Preset Avatars */}
                  <div>
                    <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block mb-1.5">
                      Or select clinic headshot preset:
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {PRESET_HEADSHOTS.map((preset) => (
                        <button
                          key={preset.url}
                          type="button"
                          onClick={() => setPhotoUrl(preset.url)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-all cursor-pointer flex items-center gap-1.5 ${
                            photoUrl === preset.url
                              ? "bg-teal-600 text-white border-teal-600 font-bold shadow-sm"
                              : "bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400"
                          }`}
                        >
                          <img
                            src={preset.url}
                            alt={preset.label}
                            className="w-4 h-4 rounded-full object-cover"
                          />
                          <span>{preset.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Core Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Doctor Full Name */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Doctor Full Name & Honorifics *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Kenneth Galve, DDM, FICOI"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Title / Role */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Official Title & Designation *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Lead Implantologist & Aesthetic Specialist"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* PRC License */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  PRC Professional License No.
                </label>
                <input
                  type="text"
                  value={prcLicense}
                  onChange={(e) => setPrcLicense(e.target.value)}
                  placeholder="e.g. 0054891"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              {/* Years Experience */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Clinical Experience (Years)
                </label>
                <input
                  type="number"
                  min={0}
                  max={60}
                  value={experienceYears}
                  onChange={(e) => setExperienceYears(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Specialty */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Primary Specialty & Clinical Scope *
              </label>
              <input
                type="text"
                required
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Dental Implants, Full-Arch Rehabilitation, Cosmetic Smile Design"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Education & Degrees */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <GraduationCap className="w-3.5 h-3.5 text-teal-600" />
                Academic Background & Degrees
              </label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. Doctor of Dental Medicine, Southwestern University; Post-Grad Implantology, NYU College of Dentistry"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              />
            </div>

            {/* Certifications / Fellowships */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Award className="w-3.5 h-3.5 text-teal-600" />
                Certifications & Affiliations (one per line)
              </label>
              <textarea
                rows={3}
                value={certificationsText}
                onChange={(e) => setCertificationsText(e.target.value)}
                placeholder="Fellow, International Congress of Oral Implantologists (FICOI)&#10;Certified Provider, Straumann Dental Implants&#10;Member, Philippine Dental Association (PDA)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none font-sans"
              />
            </div>

            {/* Biography */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                Doctor Biography & Patient Care Philosophy
              </label>
              <textarea
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Write a warm, authoritative summary of the doctor's practice and patient philosophy..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 text-xs focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
              />
            </div>

            {/* Clinic Schedule by Branch */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-teal-600" />
                  Clinic Schedule & Branch Availability
                </label>
                <button
                  type="button"
                  onClick={handleAddScheduleRow}
                  className="px-2.5 py-1 rounded-lg text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/60 transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Branch Schedule</span>
                </button>
              </div>

              <div className="space-y-3">
                {clinicDays.map((row, idx) => {
                  const matchedBranch = dynamicBranches.find((b) => isBranchMatch(row.branchName, b));
                  const isExplicitCustom = !matchedBranch && Boolean(row.branchName);
                  const currentSelectValue = matchedBranch ? matchedBranch.shortName : (isExplicitCustom ? "__custom__" : "");

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                        {/* Branch Dropdown */}
                        <div className="sm:col-span-5 space-y-1">
                          <select
                            value={currentSelectValue}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === "__custom__") {
                                handleScheduleChange(idx, "branchName", "");
                              } else {
                                handleScheduleChange(idx, "branchName", val);
                              }
                            }}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                          >
                            <option value="" disabled>
                              Select Clinic Branch...
                            </option>
                            {dynamicBranches.map((b) => (
                              <option key={b.id || b.shortName} value={b.shortName}>
                                {b.shortName}
                              </option>
                            ))}
                            <option value="__custom__">✏️ Custom / Other Branch...</option>
                          </select>

                          {(currentSelectValue === "__custom__" || (!matchedBranch && Boolean(row.branchName))) && (
                            <input
                              type="text"
                              value={row.branchName}
                              onChange={(e) =>
                                handleScheduleChange(idx, "branchName", e.target.value)
                              }
                              placeholder="Type custom branch name..."
                              className="w-full px-2 py-1 rounded-lg bg-white dark:bg-slate-800 border border-teal-400/50 dark:border-teal-500/50 text-[11px] text-teal-800 dark:text-teal-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                            />
                          )}
                        </div>

                        {/* Days Input */}
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={row.days}
                            onChange={(e) =>
                              handleScheduleChange(idx, "days", e.target.value)
                            }
                            placeholder="Days (e.g. Mon, Wed, Fri)"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                          />
                        </div>

                        {/* Hours Input */}
                        <div className="sm:col-span-3">
                          <input
                            type="text"
                            value={row.hours}
                            onChange={(e) =>
                              handleScheduleChange(idx, "hours", e.target.value)
                            }
                            placeholder="Hours (e.g. 9am - 5pm)"
                            className="w-full px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium"
                          />
                        </div>

                        {/* Delete Row Button */}
                        <div className="sm:col-span-1 flex justify-center">
                          <button
                            type="button"
                            disabled={clinicDays.length <= 1}
                            onClick={() => handleRemoveScheduleRow(idx)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-slate-400 transition-colors cursor-pointer"
                            title="Remove schedule entry"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Clickable Days of Week Toggles */}
                      <div className="space-y-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-bold text-slate-500 mr-0.5 shrink-0">
                              Click Days:
                            </span>
                            {[
                              { index: 1, label: "Mon" },
                              { index: 2, label: "Tue" },
                              { index: 3, label: "Wed" },
                              { index: 4, label: "Thu" },
                              { index: 5, label: "Fri" },
                              { index: 6, label: "Sat" },
                              { index: 0, label: "Sun" },
                            ].map((d) => {
                              const activeIndices = parseDaysOfWeek(row.days || "");
                              const isSelected = activeIndices.includes(d.index);

                              return (
                                <button
                                  key={d.index}
                                  type="button"
                                  onClick={() => {
                                    const currentIndices = parseDaysOfWeek(row.days || "");
                                    let nextIndices: number[];
                                    if (currentIndices.includes(d.index)) {
                                      nextIndices = currentIndices.filter((x) => x !== d.index);
                                    } else {
                                      nextIndices = [...currentIndices, d.index];
                                    }

                                    const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
                                    const DAY_LABELS: Record<number, string> = {
                                      1: "Mon",
                                      2: "Tue",
                                      3: "Wed",
                                      4: "Thu",
                                      5: "Fri",
                                      6: "Sat",
                                      0: "Sun",
                                    };

                                    let formatted = "";
                                    if (nextIndices.length === 7) {
                                      formatted = "Daily";
                                    } else if (nextIndices.length > 0) {
                                      const sorted = DAY_ORDER.filter((x) => nextIndices.includes(x));
                                      if (sorted.length === 5 && [1, 2, 3, 4, 5].every((x) => sorted.includes(x))) {
                                        formatted = "Mon – Fri";
                                      } else if (sorted.length === 6 && [1, 2, 3, 4, 5, 6].every((x) => sorted.includes(x))) {
                                        formatted = "Mon – Sat";
                                      } else {
                                        formatted = sorted.map((x) => DAY_LABELS[x]).join(", ");
                                      }
                                    }

                                    handleScheduleChange(idx, "days", formatted);
                                  }}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    isSelected
                                      ? "bg-teal-600 text-white shadow-xs scale-105"
                                      : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400 hover:text-teal-600 dark:hover:border-teal-500"
                                  }`}
                                >
                                  {d.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Quick Presets */}
                          <div className="flex items-center gap-1 shrink-0 flex-wrap">
                            {[
                              { label: "Mon, Wed, Fri", val: "Mon, Wed, Fri" },
                              { label: "Tue, Thu, Sat", val: "Tue, Thu, Sat" },
                              { label: "Mon – Fri", val: "Mon – Fri" },
                              { label: "All Days", val: "Daily" },
                              { label: "Clear", val: "" },
                            ].map((preset) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => handleScheduleChange(idx, "days", preset.val)}
                                className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-colors cursor-pointer"
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Quick Presets for Hours */}
                        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[10px]">
                          <span className="text-slate-400 font-medium mr-1">Hours Presets:</span>
                          {["9:00 AM – 5:00 PM", "9:00 AM – 6:00 PM", "10:00 AM – 8:00 PM"].map((preset) => (
                            <button
                              key={preset}
                              type="button"
                              onClick={() => handleScheduleChange(idx, "hours", preset)}
                              className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                                row.hours === preset
                                  ? "bg-teal-600 text-white font-bold"
                                  : "bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 border border-slate-200 dark:border-slate-700"
                              }`}
                            >
                              {preset}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Visibility Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-700/80">
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                  Doctor Profile Visibility
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {isActive
                    ? "Active — publicly visible on /dentists and available for patient bookings"
                    : "Inactive / On-Leave — hidden from public doctor directory"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive(!isActive)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 border border-teal-200 dark:border-teal-800"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {isActive ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
                    <span>Active Profile</span>
                  </>
                ) : (
                  <span>Inactive</span>
                )}
              </button>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="py-2.5 px-4 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isLoading}
                className="py-2.5 px-5 rounded-xl font-bold text-xs sm:text-sm text-white bg-teal-600 hover:bg-teal-700 shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving Profile...</span>
                  </>
                ) : (
                  <>
                    <UserCheck className="w-4 h-4" />
                    <span>
                      {isEditing ? "Save Profile Changes" : "Create Doctor Profile"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </ModalPortal>
  );
}
