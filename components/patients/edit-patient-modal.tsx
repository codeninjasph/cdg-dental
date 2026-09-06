"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { Patient } from "@/types/dental";
import { X, UserCheck, AlertTriangle, Save, RefreshCw } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: Patient | null;
  onSuccess: (updated: Patient) => void;
}

export function EditPatientModal({
  isOpen,
  onClose,
  patient,
  onSuccess,
}: EditPatientModalProps) {
  const { branches, showToast, triggerRefresh } = useClinic();
  const supabase = createClient();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [dob, setDob] = useState("");
  const [gender, setGender] = useState("Male");
  const [address, setAddress] = useState("");
  const [emergencyContactName, setEmergencyContactName] = useState("");
  const [emergencyContactPhone, setEmergencyContactPhone] = useState("");
  const [medicalAlerts, setMedicalAlerts] = useState("");
  const [branchId, setBranchId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Prepopulate form when patient changes
  useEffect(() => {
    if (patient) {
      setFirstName(patient.first_name || "");
      setLastName(patient.last_name || "");
      setPhone(patient.phone || "");
      setEmail(patient.email || "");
      setDob(patient.dob || "");
      setGender(patient.gender || "Male");
      setAddress(patient.address || "");
      setEmergencyContactName(patient.emergency_contact_name || "");
      setEmergencyContactPhone(patient.emergency_contact_phone || "");
      setMedicalAlerts(patient.medical_alerts || "");
      setBranchId(patient.primary_branch_id || branches[0]?.id || "");
    }
  }, [patient, branches, isOpen]);

  if (!isOpen || !patient) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) {
      showToast("First name and Last name are required.", "error");
      return;
    }

    setIsSubmitting(true);

    try {
      const updatePayload = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        phone: phone.trim() || null,
        email: email.trim() || null,
        dob: dob || null,
        gender: gender || "Male",
        address: address.trim() || null,
        emergency_contact_name: emergencyContactName.trim() || null,
        emergency_contact_phone: emergencyContactPhone.trim() || null,
        medical_alerts: medicalAlerts.trim() || null,
        primary_branch_id: branchId || null,
      };

      const { data, error } = await supabase
        .from("patients")
        .update(updatePayload)
        .eq("id", patient.id)
        .select()
        .single();

      if (error) throw error;

      showToast(`Patient record for ${firstName} ${lastName} updated successfully!`, "success");
      triggerRefresh();
      if (data) {
        onSuccess(data);
      }
      onClose();
    } catch (err: any) {
      console.error("Failed to update patient:", err);
      showToast(err?.message || "Failed to update patient details.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 flex-shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-slate-100 text-base">
                  Edit Patient Information
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Update contact, demographics, or medical alerts for CRM records
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 min-h-0 text-xs">
            {/* Names */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="e.g., Juan"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-medium"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="e.g., Dela Cruz"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-medium"
                />
              </div>
            </div>

            {/* Contacts */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Mobile / Phone Number
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0917 123 4567"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="patient@example.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
            </div>

            {/* Demographics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 cursor-pointer"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Primary Branch
                </label>
                <select
                  value={branchId}
                  onChange={(e) => setBranchId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Address */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                Home / Postal Address
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Unit, Street, Barangay, City, Province"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
              />
            </div>

            {/* Emergency Contact */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Emergency Contact Name
                </label>
                <input
                  type="text"
                  value={emergencyContactName}
                  onChange={(e) => setEmergencyContactName(e.target.value)}
                  placeholder="e.g., Maria Dela Cruz (Spouse)"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1">
                  Emergency Contact Phone
                </label>
                <input
                  type="tel"
                  value={emergencyContactPhone}
                  onChange={(e) => setEmergencyContactPhone(e.target.value)}
                  placeholder="0918 765 4321"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 font-mono"
                />
              </div>
            </div>

            {/* Medical Alerts & Allergies */}
            <div className="pt-1">
              <label className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Medical Alerts & Allergies
              </label>
              <textarea
                value={medicalAlerts}
                onChange={(e) => setMedicalAlerts(e.target.value)}
                placeholder="e.g., Allergic to Penicillin, Hypertensive, Diabetic, Bleeding tendencies, Pregnant"
                rows={2}
                className="w-full px-3.5 py-2 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/30 dark:bg-rose-950/20 text-slate-900 dark:text-slate-100 text-xs sm:text-sm focus:ring-2 focus:ring-rose-500/30 focus:border-rose-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                These alerts are highlighted on the odontogram and treatment screen to ensure chairside clinical safety.
              </span>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Changes...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save Patient Information</span>
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
