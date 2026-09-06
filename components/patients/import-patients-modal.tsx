"use client";

import React, { useState, useRef, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useClinic } from "@/context/clinic-context";
import { ModalPortal } from "@/components/ui/modal-portal";
import {
  X,
  Upload,
  FileSpreadsheet,
  Download,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Users,
  ChevronRight,
  RefreshCw,
  Info,
  Check,
  ArrowLeft,
  Filter,
} from "lucide-react";

interface ImportPatientsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedPatientRow {
  rowNumber: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  dob: string;
  gender: string;
  address: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  medical_alerts: string;
  // Status flags
  status: "ready" | "duplicate" | "error";
  statusReason?: string;
  existingPatientMatch?: string;
}

/**
 * Robust zero-dependency CSV parser handling quotes, line breaks inside quotes, and trimmed fields
 */
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        row.push(currentField.trim());
        currentField = "";
      } else if (char === "\r") {
        // Skip CR in CRLF
      } else if (char === "\n") {
        row.push(currentField.trim());
        // Only push row if not completely empty
        if (row.some((cell) => cell.length > 0)) {
          lines.push(row);
        }
        row = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField.length > 0 || row.length > 0) {
    row.push(currentField.trim());
    if (row.some((cell) => cell.length > 0)) {
      lines.push(row);
    }
  }

  return lines;
}

export function ImportPatientsModal({
  isOpen,
  onClose,
  onSuccess,
}: ImportPatientsModalProps) {
  const { activeBranch, branches, showToast } = useClinic();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Steps: 1 = Upload, 2 = Preview & Validate, 3 = Completed
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [fileName, setFileName] = useState<string>("");
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedPatientRow[]>([]);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const [selectedBranchId, setSelectedBranchId] = useState<string>(
    activeBranch?.id || branches[0]?.id || ""
  );

  // Status filtering in Step 2
  const [statusFilter, setStatusFilter] = useState<"all" | "ready" | "duplicate" | "error">("all");

  // Import execution
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{
    total: number;
    imported: number;
    skipped: number;
    failed: number;
  }>({ total: 0, imported: 0, skipped: 0, failed: 0 });

  // Sync active branch on open
  useEffect(() => {
    if (activeBranch?.id) {
      setSelectedBranchId(activeBranch.id);
    } else if (branches.length > 0) {
      setSelectedBranchId(branches[0].id);
    }
  }, [activeBranch, branches]);

  // Reset state when closing/opening
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => {
        setStep(1);
        setFileName("");
        setParsedRows([]);
        setIsAnalyzing(false);
        setIsImporting(false);
        setImportProgress(0);
        setStatusFilter("all");
      }, 300);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // 1. Download official CSV template
  const handleDownloadTemplate = () => {
    const csvContent =
      "First Name,Last Name,Phone,Email,Date of Birth,Gender,Address,Emergency Contact Name,Emergency Contact Phone,Medical Alerts\n" +
      "Juan,Dela Cruz,09171234567,juan@example.com,1990-05-15,Male,123 Rizal St. Manila,Maria Dela Cruz,09181234567,Allergic to Penicillin\n" +
      "Maria,Santos,09289876543,maria@example.com,1995-10-20,Female,456 Luna St. Quezon City,Jose Santos,09199876543,Hypertension\n";

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "cdg_dental_patient_import_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Template downloaded. Fill in your patient data and upload here.", "info");
  };

  // 2. Process uploaded file
  const handleFileProcess = async (file: File) => {
    if (!file.name.endsWith(".csv")) {
      showToast("Please select a standard .CSV spreadsheet file.", "error");
      return;
    }

    setFileName(file.name);
    setIsAnalyzing(true);

    try {
      const text = await file.text();
      const rawRows = parseCSV(text);

      if (rawRows.length < 2) {
        showToast("The CSV file is empty or only contains headers.", "error");
        setIsAnalyzing(false);
        return;
      }

      // Map headers flexibly
      const headers = rawRows[0].map((h) =>
        h.toLowerCase().replace(/[^a-z0-9]/g, "")
      );

      const findColIdx = (synonyms: string[]) => {
        return headers.findIndex((h) =>
          synonyms.some((syn) => h.includes(syn) || syn.includes(h))
        );
      };

      const fnIdx = findColIdx(["firstname", "fname", "first", "givenname"]);
      const lnIdx = findColIdx(["lastname", "lname", "last", "surname", "familyname"]);
      const phoneIdx = findColIdx(["phone", "cellphone", "mobile", "contact", "tel", "cell"]);
      const emailIdx = findColIdx(["email", "mail"]);
      const dobIdx = findColIdx(["dob", "birth", "birthdate", "dateofbirth"]);
      const genderIdx = findColIdx(["gender", "sex"]);
      const addressIdx = findColIdx(["address", "addr", "city", "location"]);
      const ecNameIdx = findColIdx(["emergencyname", "emergencycontact", "relative"]);
      const ecPhoneIdx = findColIdx(["emergencyphone", "emergencycontactphone", "relativephone"]);
      const alertsIdx = findColIdx(["alert", "medical", "allergies", "condition", "history", "notes"]);

      // Fallback column positions if standard headers weren't named identically
      const getVal = (row: string[], idx: number, fallbackIdx: number) => {
        const primary = idx >= 0 ? row[idx] : undefined;
        if (primary !== undefined && primary.trim().length > 0) return primary.trim();
        if (fallbackIdx >= 0 && fallbackIdx < row.length) return (row[fallbackIdx] || "").trim();
        return "";
      };

      // Fetch existing patients for duplicate detection
      const { data: existingPatients } = await supabase
        .from("patients")
        .select("id, first_name, last_name, phone");

      const existingPhoneMap = new Map<string, string>();
      const existingNameMap = new Map<string, string>();

      (existingPatients || []).forEach((p) => {
        if (p.phone) {
          const cleanPhone = p.phone.replace(/[^0-9]/g, "");
          if (cleanPhone.length >= 7) {
            existingPhoneMap.set(cleanPhone, `${p.first_name} ${p.last_name}`);
          }
        }
        const nameKey = `${p.first_name.toLowerCase()}_${p.last_name.toLowerCase()}`;
        existingNameMap.set(nameKey, `${p.first_name} ${p.last_name}`);
      });

      const parsed: ParsedPatientRow[] = [];

      for (let i = 1; i < rawRows.length; i++) {
        const row = rawRows[i];
        if (row.every((c) => !c.trim())) continue; // skip blank rows

        const firstName = getVal(row, fnIdx, 0);
        const lastName = getVal(row, lnIdx, 1);
        const phone = getVal(row, phoneIdx, 2);
        const email = getVal(row, emailIdx, 3);
        const dob = getVal(row, dobIdx, 4);
        const gender = getVal(row, genderIdx, 5) || "Male";
        const address = getVal(row, addressIdx, 6);
        const ecName = getVal(row, ecNameIdx, 7);
        const ecPhone = getVal(row, ecPhoneIdx, 8);
        const alerts = getVal(row, alertsIdx, 9);

        let status: "ready" | "duplicate" | "error" = "ready";
        let statusReason = "";
        let existingPatientMatch = "";

        // Check required fields
        if (!firstName || !lastName) {
          status = "error";
          statusReason = "Missing First or Last Name";
        } else {
          // Check duplicates against database
          const cleanPhone = phone ? phone.replace(/[^0-9]/g, "") : "";
          const nameKey = `${firstName.toLowerCase()}_${lastName.toLowerCase()}`;

          if (cleanPhone.length >= 7 && existingPhoneMap.has(cleanPhone)) {
            status = "duplicate";
            existingPatientMatch = existingPhoneMap.get(cleanPhone) || "";
            statusReason = `Phone matched existing patient (${existingPatientMatch})`;
          } else if (existingNameMap.has(nameKey)) {
            status = "duplicate";
            existingPatientMatch = existingNameMap.get(nameKey) || "";
            statusReason = `Exact name match in database (${existingPatientMatch})`;
          }
        }

        parsed.push({
          rowNumber: i,
          first_name: firstName,
          last_name: lastName,
          phone,
          email,
          dob,
          gender,
          address,
          emergency_contact_name: ecName,
          emergency_contact_phone: ecPhone,
          medical_alerts: alerts,
          status,
          statusReason,
          existingPatientMatch,
        });
      }

      setParsedRows(parsed);
      setStep(2);
      showToast(`Parsed ${parsed.length} patient rows from CSV.`, "info");
    } catch (err: any) {
      console.error("Error parsing CSV:", err);
      showToast("Failed to parse CSV file: " + (err.message || "Unknown error"), "error");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // 3. Execute bulk insertion
  const handleExecuteImport = async () => {
    setIsImporting(true);
    setImportProgress(0);

    const rowsToProcess = parsedRows.filter((r) => {
      if (r.status === "error") return false;
      if (skipDuplicates && r.status === "duplicate") return false;
      return true;
    });

    const skippedCount = parsedRows.length - rowsToProcess.length;

    if (rowsToProcess.length === 0) {
      showToast("No valid rows to import based on your filter settings.", "error");
      setIsImporting(false);
      return;
    }

    let importedCount = 0;
    let failedCount = 0;
    const chunkSize = 15;

    for (let i = 0; i < rowsToProcess.length; i += chunkSize) {
      const chunk = rowsToProcess.slice(i, i + chunkSize);

      const recordsToInsert = chunk.map((r) => {
        // Normalize DOB if valid date
        let validDob: string | null = null;
        if (r.dob) {
          const d = new Date(r.dob);
          if (!isNaN(d.getTime())) {
            validDob = d.toISOString().split("T")[0];
          }
        }

        return {
          first_name: r.first_name,
          last_name: r.last_name,
          phone: r.phone || null,
          email: r.email || null,
          dob: validDob,
          gender: r.gender || "Male",
          address: r.address || null,
          emergency_contact_name: r.emergency_contact_name || null,
          emergency_contact_phone: r.emergency_contact_phone || null,
          medical_alerts: r.medical_alerts || null,
          primary_branch_id: selectedBranchId || null,
        };
      });

      const { error } = await supabase.from("patients").insert(recordsToInsert);

      if (error) {
        console.error("Chunk insert error:", error);
        failedCount += chunk.length;
      } else {
        importedCount += chunk.length;
      }

      setImportProgress(Math.round(((i + chunk.length) / rowsToProcess.length) * 100));
    }

    setImportResult({
      total: parsedRows.length,
      imported: importedCount,
      skipped: skippedCount,
      failed: failedCount,
    });

    setIsImporting(false);
    setStep(3);
    showToast(`Import finished: ${importedCount} added, ${skippedCount} skipped.`, "success");
    onSuccess();
  };

  const readyCount = parsedRows.filter((r) => r.status === "ready").length;
  const dupCount = parsedRows.filter((r) => r.status === "duplicate").length;
  const errorCount = parsedRows.filter((r) => r.status === "error").length;

  const filteredPreviewRows = parsedRows.filter((r) => {
    if (statusFilter === "all") return true;
    return r.status === statusFilter;
  });

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center border border-teal-100 dark:border-teal-900/40">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  Import Patient Records
                  <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
                    Bulk CSV
                  </span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Quickly upload historical logbook transcriptions or Excel rosters into your CRM.
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={isImporting}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Stepper Progress Bar */}
          <div className="px-6 py-2 bg-slate-100/50 dark:bg-slate-950 border-b border-slate-200/60 dark:border-slate-800 flex items-center justify-between text-xs">
            <div className="flex items-center gap-6">
              <span
                className={`flex items-center gap-1.5 font-semibold ${
                  step === 1
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                    step === 1
                      ? "bg-teal-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  1
                </span>
                Upload CSV File
              </span>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />

              <span
                className={`flex items-center gap-1.5 font-semibold ${
                  step === 2
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                    step === 2
                      ? "bg-teal-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  2
                </span>
                Preview & Duplicate Check
              </span>

              <ChevronRight className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />

              <span
                className={`flex items-center gap-1.5 font-semibold ${
                  step === 3
                    ? "text-teal-600 dark:text-teal-400"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                <span
                  className={`w-5 h-5 rounded-full text-[11px] flex items-center justify-center font-bold ${
                    step === 3
                      ? "bg-teal-600 text-white"
                      : "bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300"
                  }`}
                >
                  3
                </span>
                Finished
              </span>
            </div>

            {/* Target Branch selection */}
            {branches.length > 1 && step < 3 && (
              <div className="flex items-center gap-2">
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Branch:
                </span>
                <select
                  value={selectedBranchId}
                  onChange={(e) => setSelectedBranchId(e.target.value)}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 rounded-lg px-2.5 py-1 text-xs font-medium focus:ring-1 focus:ring-teal-500 outline-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Modal Body */}
          <div className="p-6 overflow-y-auto flex-1">
            {/* STEP 1: Upload File or Download Template */}
            {step === 1 && (
              <div className="space-y-6">
                {/* Download Template Banner */}
                <div className="p-4 rounded-xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-100 dark:border-teal-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 shrink-0">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Need the official spreadsheet template?
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                        Download our pre-formatted CSV with sample patient rows and column headers ready to fill in.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-teal-700 dark:text-teal-300 font-bold text-xs border border-teal-200 dark:border-teal-800 shadow-sm transition-all shrink-0 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download .CSV Template</span>
                  </button>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      handleFileProcess(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    isDragging
                      ? "border-teal-500 bg-teal-50/50 dark:bg-teal-950/30 scale-[0.99]"
                      : "border-slate-300 dark:border-slate-700 hover:border-teal-500 dark:hover:border-teal-500 hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        handleFileProcess(e.target.files[0]);
                      }
                    }}
                  />

                  {isAnalyzing ? (
                    <div className="flex flex-col items-center gap-3">
                      <RefreshCw className="w-10 h-10 text-teal-600 animate-spin" />
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                        Analyzing CSV file and checking duplicates...
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="w-14 h-14 rounded-2xl bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center mb-4 border border-teal-100 dark:border-teal-900/50 shadow-sm">
                        <Upload className="w-7 h-7" />
                      </div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Click to upload or drag & drop your CSV file here
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm">
                        Supports CSV files containing Patient Name, Phone, Date of Birth, Gender, Address, and Medical Alerts.
                      </p>
                      <span className="mt-4 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-semibold">
                        Browse Computer (.CSV)
                      </span>
                    </>
                  )}
                </div>

                {/* Helpful tips for the secretary */}
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/80 dark:border-slate-800 flex items-start gap-3">
                  <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">
                      Secretary Guide:
                    </p>
                    <p>
                      • If you have an existing Excel sheet (.xlsx), open it in Excel, click <strong>File &gt; Save As</strong>, and choose <strong>CSV (Comma delimited) (*.csv)</strong>.
                    </p>
                    <p>
                      • Don&apos;t worry about minor column differences—our smart engine automatically recognizes headers like &quot;Mobile&quot;, &quot;Cell Number&quot;, &quot;Birthdate&quot;, and &quot;Allergies&quot;.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: Preview & Validation */}
            {step === 2 && (
              <div className="space-y-4">
                {/* Summary Badges & Options Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setStatusFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        statusFilter === "all"
                          ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                          : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700"
                      }`}
                    >
                      All Rows ({parsedRows.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatusFilter("ready")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                        statusFilter === "ready"
                          ? "bg-emerald-600 text-white"
                          : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready ({readyCount})</span>
                    </button>
                    {dupCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter("duplicate")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          statusFilter === "duplicate"
                            ? "bg-amber-600 text-white"
                            : "bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800"
                        }`}
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Duplicates ({dupCount})</span>
                      </button>
                    )}
                    {errorCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setStatusFilter("error")}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                          statusFilter === "error"
                            ? "bg-rose-600 text-white"
                            : "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800"
                        }`}
                      >
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Errors ({errorCount})</span>
                      </button>
                    )}
                  </div>

                  {/* Duplicate Setting Toggle */}
                  <label className="flex items-center gap-2 text-xs font-medium text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={skipDuplicates}
                      onChange={(e) => setSkipDuplicates(e.target.checked)}
                      className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500 border-slate-300"
                    />
                    <span>Skip duplicate records automatically</span>
                  </label>
                </div>

                {/* Preview Table */}
                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-950 sticky top-0 z-10 border-b border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
                        <tr>
                          <th className="py-2.5 px-3 w-12">#</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Patient Name</th>
                          <th className="py-2.5 px-3">Phone</th>
                          <th className="py-2.5 px-3">DOB / Gender</th>
                          <th className="py-2.5 px-3">Medical Alerts</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                        {filteredPreviewRows.map((row) => (
                          <tr
                            key={row.rowNumber}
                            className={`transition-colors ${
                              row.status === "error"
                                ? "bg-rose-50/40 dark:bg-rose-950/20"
                                : row.status === "duplicate"
                                ? "bg-amber-50/40 dark:bg-amber-950/20"
                                : "hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
                            }`}
                          >
                            <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">
                              {row.rowNumber}
                            </td>
                            <td className="py-2.5 px-3">
                              {row.status === "ready" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                                  <Check className="w-3 h-3" /> Ready
                                </span>
                              )}
                              {row.status === "duplicate" && (
                                <div className="flex flex-col">
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 w-fit">
                                    <AlertTriangle className="w-3 h-3" /> Duplicate
                                  </span>
                                  <span className="text-[10px] text-amber-700 dark:text-amber-400 mt-0.5 max-w-[180px] truncate" title={row.statusReason}>
                                    {row.statusReason}
                                  </span>
                                </div>
                              )}
                              {row.status === "error" && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300">
                                  <AlertCircle className="w-3 h-3" /> {row.statusReason}
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {row.first_name} {row.last_name}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {row.phone || "—"}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {row.dob || "—"} • {row.gender}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                              {row.medical_alerts ? (
                                <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 font-medium">
                                  {row.medical_alerts}
                                </span>
                              ) : (
                                <span className="text-slate-400">None</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Progress bar if importing */}
                {isImporting && (
                  <div className="space-y-2 p-4 rounded-xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900">
                    <div className="flex justify-between text-xs font-bold text-teal-900 dark:text-teal-200">
                      <span>Importing patient records into CRM...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-teal-200 dark:bg-teal-900 overflow-hidden">
                      <div
                        className="h-full bg-teal-600 transition-all duration-300 rounded-full"
                        style={{ width: `${importProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* STEP 3: Finished / Summary */}
            {step === 3 && (
              <div className="p-8 text-center flex flex-col items-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg border border-emerald-200 dark:border-emerald-800 animate-in zoom-in-50 duration-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Import Completed Successfully!
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  Your patients have been registered into the CDG Dental CRM directory and are ready for appointment scheduling, treatment plans, and odontograms.
                </p>

                {/* Breakdown Stats */}
                <div className="grid grid-cols-3 gap-3 w-full max-w-sm mt-4">
                  <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-center">
                    <div className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                      {importResult.imported}
                    </div>
                    <div className="text-[11px] font-medium text-emerald-800 dark:text-emerald-400 mt-0.5">
                      Imported
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center">
                    <div className="text-xl font-bold text-slate-700 dark:text-slate-300">
                      {importResult.skipped}
                    </div>
                    <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                      Skipped (Dups)
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-center">
                    <div className="text-xl font-bold text-rose-700 dark:text-rose-300">
                      {importResult.failed}
                    </div>
                    <div className="text-[11px] font-medium text-rose-800 dark:text-rose-400 mt-0.5">
                      Failed
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50">
            {step === 1 && (
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
            )}

            {step === 2 && (
              <>
                <button
                  type="button"
                  disabled={isImporting}
                  onClick={() => setStep(1)}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Upload</span>
                </button>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={isImporting}
                    onClick={handleExecuteImport}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isImporting ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Importing Records...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Confirm & Import ({readyCount + (!skipDuplicates ? dupCount : 0)} Patients)</span>
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {step === 3 && (
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs shadow transition-all"
              >
                Done & View Patients Directory
              </button>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
