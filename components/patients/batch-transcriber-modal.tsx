"use client";

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  X,
  NotebookPen,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Save,
  ClipboardPaste,
  Sparkles,
  Info,
  RefreshCw,
  Building2,
} from "lucide-react";

interface BatchTranscriberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface TranscribeRow {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  dob: string;
  gender: string;
  address: string;
  medical_alerts: string;
}

const createBlankRow = (): TranscribeRow => ({
  id: Math.random().toString(36).substring(2, 9),
  first_name: "",
  last_name: "",
  phone: "",
  dob: "",
  gender: "Male",
  address: "",
  medical_alerts: "",
});

export function BatchTranscriberModal({
  isOpen,
  onClose,
  onSuccess,
}: BatchTranscriberModalProps) {
  const { activeBranch, branches, showToast } = useClinic();
  const supabase = createClient();

  const [rows, setRows] = useState<TranscribeRow[]>([
    createBlankRow(),
    createBlankRow(),
    createBlankRow(),
  ]);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    activeBranch?.id || branches[0]?.id || ""
  );
  const [isSaving, setIsSaving] = useState(false);
  const [showPasteHelper, setShowPasteHelper] = useState(false);
  const [pastedText, setPastedText] = useState("");

  const firstInputRef = useRef<HTMLInputElement>(null);
  const lastAlertInputRef = useRef<HTMLInputElement>(null);

  // Sync branch
  useEffect(() => {
    if (activeBranch?.id) {
      setSelectedBranchId(activeBranch.id);
    } else if (branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [activeBranch, branches]);

  // Focus first input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        firstInputRef.current?.focus();
      }, 150);
    } else {
      // Reset on close
      setRows([createBlankRow(), createBlankRow(), createBlankRow()]);
      setIsSaving(false);
      setShowPasteHelper(false);
      setPastedText("");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRowChange = (id: string, field: keyof TranscribeRow, value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const handleAddRow = () => {
    const newRow = createBlankRow();
    setRows((prev) => [...prev, newRow]);
    // Allow DOM to update, then focus new row's first name
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>(
        'input[data-field="first_name"]'
      );
      if (inputs.length > 0) {
        inputs[inputs.length - 1].focus();
      }
    }, 50);
  };

  const handleRemoveRow = (id: string) => {
    if (rows.length <= 1) {
      setRows([createBlankRow()]);
      return;
    }
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleClearBlanks = () => {
    const filled = rows.filter(
      (r) =>
        r.first_name.trim() ||
        r.last_name.trim() ||
        r.phone.trim() ||
        r.medical_alerts.trim()
    );
    if (filled.length === 0) {
      setRows([createBlankRow()]);
    } else {
      setRows(filled);
    }
    showToast("Cleared empty blank rows.", "info");
  };

  // Quick clipboard paste from Excel/Sheets
  const handleProcessPastedData = () => {
    if (!pastedText.trim()) return;

    const lines = pastedText
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const newRows: TranscribeRow[] = [];

    for (const line of lines) {
      // Split by tab (Excel/Google Sheets standard) or comma
      const parts = line.includes("\t") ? line.split("\t") : line.split(",");

      if (parts.length >= 1) {
        newRows.push({
          id: Math.random().toString(36).substring(2, 9),
          first_name: (parts[0] || "").trim(),
          last_name: (parts[1] || "").trim(),
          phone: (parts[2] || "").trim(),
          dob: (parts[3] || "").trim(),
          gender: (parts[4] || "").trim().toLowerCase().startsWith("f")
            ? "Female"
            : "Male",
          address: (parts[5] || "").trim(),
          medical_alerts: (parts[6] || "").trim(),
        });
      }
    }

    if (newRows.length > 0) {
      // Replace completely empty rows or append
      const existingFilled = rows.filter(
        (r) => r.first_name.trim() || r.last_name.trim()
      );
      setRows([...existingFilled, ...newRows]);
      setPastedText("");
      setShowPasteHelper(false);
      showToast(`Pasted ${newRows.length} patient rows from clipboard.`, "success");
    }
  };

  // Save all valid rows
  const handleSaveAll = async () => {
    // 1. Filter rows that have any data
    const activeRows = rows.filter(
      (r) =>
        r.first_name.trim() ||
        r.last_name.trim() ||
        r.phone.trim() ||
        r.address.trim() ||
        r.medical_alerts.trim()
    );

    if (activeRows.length === 0) {
      showToast("Please enter at least one patient record.", "error");
      return;
    }

    // 2. Validate that active rows have at least first and last name
    const invalidRows = activeRows.filter(
      (r) => !r.first_name.trim() || !r.last_name.trim()
    );

    if (invalidRows.length > 0) {
      showToast(
        `${invalidRows.length} row(s) are missing either First Name or Last Name. Please fill them before saving.`,
        "error"
      );
      return;
    }

    setIsSaving(true);

    try {
      const recordsToInsert = activeRows.map((r) => {
        let validDob: string | null = null;
        if (r.dob) {
          const d = new Date(r.dob);
          if (!isNaN(d.getTime())) {
            validDob = d.toISOString().split("T")[0];
          }
        }

        return {
          first_name: r.first_name.trim(),
          last_name: r.last_name.trim(),
          phone: r.phone.trim() || null,
          dob: validDob,
          gender: r.gender || "Male",
          address: r.address.trim() || null,
          medical_alerts: r.medical_alerts.trim() || null,
          primary_branch_id: selectedBranchId || null,
        };
      });

      const { data, error } = await supabase
        .from("patients")
        .insert(recordsToInsert)
        .select();

      if (error) throw error;

      showToast(
        `Successfully transcribed ${activeRows.length} patient(s) into CRM!`,
        "success"
      );
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error("Error batch saving patients:", err);
      showToast("Failed to save records: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsSaving(false);
    }
  };

  const validCount = rows.filter(
    (r) => r.first_name.trim() && r.last_name.trim()
  ).length;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-6xl max-h-[95vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          {/* Top Header */}
          <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/40">
                <NotebookPen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Paper Logbook Transcriber
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                    High-Speed Manual Entry
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Transcribe handwritten appointment books or paper card stacks directly into the CRM.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Branch Selector */}
              {branches.length > 0 && (
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  <Building2 className="w-3.5 h-3.5 text-teal-600" />
                  <select
                    value={selectedBranchId}
                    onChange={(e) => setSelectedBranchId(e.target.value)}
                    className="bg-transparent border-none text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id} className="dark:bg-slate-900">
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <button
                onClick={onClose}
                disabled={isSaving}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Secretary Ergonomics & Productivity Hints */}
          <div className="px-6 py-2.5 bg-teal-50/50 dark:bg-teal-950/20 border-b border-teal-100/60 dark:border-teal-900/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
              <span className="p-1 rounded-md bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <span>
                <strong>Secretary Speed Mode:</strong> Press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px] text-slate-800 dark:text-slate-200">
                  Tab
                </kbd>{" "}
                to move to the next field. On the last field, press{" "}
                <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 font-mono font-bold text-[10px] text-slate-800 dark:text-slate-200">
                  Enter
                </kbd>{" "}
                to auto-create the next row.
              </span>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowPasteHelper(!showPasteHelper)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-900/40 transition-colors cursor-pointer"
              >
                <ClipboardPaste className="w-3.5 h-3.5" />
                <span>{showPasteHelper ? "Hide Paste Helper" : "Paste from Excel / Sheets"}</span>
              </button>
            </div>
          </div>

          {/* Paste Drawer (Optional) */}
          {showPasteHelper && (
            <div className="p-4 bg-slate-100/80 dark:bg-slate-950/80 border-b border-slate-200 dark:border-slate-800 animate-in slide-in-from-top-2 duration-150">
              <div className="max-w-2xl mx-auto space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Paste multiple cells copied from Excel, Word, or Google Sheets:</span>
                  <span className="text-[11px] text-slate-400">
                    Columns: First Name, Last Name, Phone, DOB, Gender, Address, Alerts
                  </span>
                </div>
                <textarea
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder="Juan	Dela Cruz	09171234567	1992-04-12	Male	Manila	Penicillin Allergy&#10;Maria	Santos	09287654321	1995-08-20	Female	Quezon City	Hypertension"
                  rows={3}
                  className="w-full p-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPasteHelper(false)}
                    className="px-3 py-1 text-xs text-slate-500 hover:text-slate-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleProcessPastedData}
                    className="px-4 py-1.5 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm"
                  >
                    Insert Rows
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Main Spreadsheet Grid */}
          <div className="p-4 sm:p-6 overflow-y-auto flex-1">
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full min-w-[900px] text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-3 w-10 text-center">#</th>
                    <th className="py-3 px-3 min-w-[140px]">
                      First Name <span className="text-rose-500">*</span>
                    </th>
                    <th className="py-3 px-3 min-w-[140px]">
                      Last Name <span className="text-rose-500">*</span>
                    </th>
                    <th className="py-3 px-3 min-w-[130px]">Phone Number</th>
                    <th className="py-3 px-3 min-w-[90px]">Gender</th>
                    <th className="py-3 px-3 min-w-[120px]">Date of Birth</th>
                    <th className="py-3 px-3 min-w-[160px]">Address / City</th>
                    <th className="py-3 px-3 min-w-[160px]">Medical Alerts</th>
                    <th className="py-3 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                  {rows.map((row, idx) => {
                    const isLastRow = idx === rows.length - 1;
                    const hasSomeData =
                      row.first_name.trim() ||
                      row.last_name.trim() ||
                      row.phone.trim();
                    const isMissingName =
                      hasSomeData && (!row.first_name.trim() || !row.last_name.trim());

                    return (
                      <tr
                        key={row.id}
                        className={`transition-colors hover:bg-slate-50/70 dark:hover:bg-slate-800/40 ${
                          isMissingName ? "bg-rose-50/50 dark:bg-rose-950/20" : ""
                        }`}
                      >
                        {/* Row Index */}
                        <td className="py-2 px-3 text-center font-mono text-slate-400 text-[11px]">
                          {idx + 1}
                        </td>

                        {/* First Name */}
                        <td className="py-2 px-2">
                          <input
                            ref={idx === 0 ? firstInputRef : undefined}
                            data-field="first_name"
                            type="text"
                            value={row.first_name}
                            onChange={(e) =>
                              handleRowChange(row.id, "first_name", e.target.value)
                            }
                            placeholder="e.g. Juan"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-medium"
                          />
                        </td>

                        {/* Last Name */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.last_name}
                            onChange={(e) =>
                              handleRowChange(row.id, "last_name", e.target.value)
                            }
                            placeholder="e.g. Dela Cruz"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none font-medium"
                          />
                        </td>

                        {/* Phone */}
                        <td className="py-2 px-2">
                          <input
                            type="tel"
                            value={row.phone}
                            onChange={(e) =>
                              handleRowChange(row.id, "phone", e.target.value)
                            }
                            placeholder="0917 123 4567"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                          />
                        </td>

                        {/* Gender */}
                        <td className="py-2 px-2">
                          <select
                            value={row.gender}
                            onChange={(e) =>
                              handleRowChange(row.id, "gender", e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                          </select>
                        </td>

                        {/* Date of Birth */}
                        <td className="py-2 px-2">
                          <input
                            type="date"
                            value={row.dob}
                            onChange={(e) =>
                              handleRowChange(row.id, "dob", e.target.value)
                            }
                            className="w-full px-2 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </td>

                        {/* Address */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.address}
                            onChange={(e) =>
                              handleRowChange(row.id, "address", e.target.value)
                            }
                            placeholder="Barangay / City"
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </td>

                        {/* Medical Alerts (Press Enter here to add new row) */}
                        <td className="py-2 px-2">
                          <input
                            type="text"
                            value={row.medical_alerts}
                            onChange={(e) =>
                              handleRowChange(row.id, "medical_alerts", e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleAddRow();
                              }
                            }}
                            placeholder="Allergies, Asthma, etc."
                            className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 outline-none"
                          />
                        </td>

                        {/* Delete Row */}
                        <td className="py-2 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveRow(row.id)}
                            title="Remove row"
                            className="p-1 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Quick Actions Bar under grid */}
            <div className="flex items-center justify-between mt-3">
              <button
                type="button"
                onClick={handleAddRow}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 dark:bg-teal-950/60 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800/80 transition-all cursor-pointer shadow-sm"
              >
                <Plus className="w-4 h-4" />
                <span>Add Patient Row (or press Enter on last cell)</span>
              </button>

              <button
                type="button"
                onClick={handleClearBlanks}
                className="text-xs text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
              >
                Clear Blank Rows
              </button>
            </div>
          </div>

          {/* Bottom Summary & Commit Bar */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-500 dark:text-slate-400">
                Ready to record:{" "}
                <strong className="text-slate-900 dark:text-slate-100 font-mono font-bold">
                  {validCount}
                </strong>{" "}
                patient(s)
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isSaving || validCount === 0}
                onClick={handleSaveAll}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Saving Records to CRM...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save {validCount} Patient(s) to CRM</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
