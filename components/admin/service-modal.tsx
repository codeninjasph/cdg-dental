"use client";

import React, { useState, useEffect } from "react";
import { X, Sparkles, Clock, DollarSign, Tag, CheckCircle2, Shield } from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";
import { DentalService } from "@/lib/db/services";

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  service?: DentalService | null;
  adminName: string;
  adminId?: string;
  branchName?: string;
}

export const SERVICE_CATEGORIES = [
  "Diagnostics & Preventative",
  "Restorative & Endodontics",
  "Oral & Maxillofacial Surgery",
  "Orthodontics & Dentofacial",
  "Prosthodontics & Rehabilitation",
  "Cosmetic & Aesthetic Dentistry",
  "Periodontics",
];

export function ServiceModal({
  isOpen,
  onClose,
  onSuccess,
  service,
  adminName,
  adminId,
  branchName,
}: ServiceModalProps) {
  const [code, setCode] = useState("");
  const [category, setCategory] = useState(SERVICE_CATEGORIES[0]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [basePrice, setBasePrice] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [duration, setDuration] = useState("45");
  const [isActive, setIsActive] = useState(true);
  const [bookableOnline, setBookableOnline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (service) {
      setCode(service.code || "");
      setCategory(service.category || SERVICE_CATEGORIES[0]);
      setName(service.name || "");
      setDescription(service.description || "");
      setBasePrice(String(service.base_price || 0));
      setMinPrice(service.min_price !== null && service.min_price !== undefined ? String(service.min_price) : "");
      setMaxPrice(service.max_price !== null && service.max_price !== undefined ? String(service.max_price) : "");
      setDuration(String(service.default_duration_minutes || 45));
      setIsActive(service.is_active !== undefined ? service.is_active : true);
      setBookableOnline(service.bookable_online !== undefined ? service.bookable_online : true);
    } else {
      setCode("");
      setCategory(SERVICE_CATEGORIES[0]);
      setName("");
      setDescription("");
      setBasePrice("2500");
      setMinPrice("2000");
      setMaxPrice("3500");
      setDuration("45");
      setIsActive(true);
      setBookableOnline(true);
    }
    setErrorMessage(null);
  }, [service, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage("Procedure name is required.");
      return;
    }
    const numBase = Number(basePrice);
    if (isNaN(numBase) || numBase < 0) {
      setErrorMessage("Please enter a valid base price (₱0.00 or higher).");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const payload = {
        id: service?.id,
        code: code.trim() || undefined,
        category,
        name: name.trim(),
        description: description.trim() || "",
        base_price: numBase,
        min_price: minPrice ? Number(minPrice) : null,
        max_price: maxPrice ? Number(maxPrice) : null,
        default_duration_minutes: Number(duration) || 45,
        is_active: isActive,
        bookable_online: bookableOnline,
        actorName: adminName,
        actorId: adminId,
        branchName,
      };

      const url = "/api/admin/services";
      const method = service ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save dental service.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden max-h-[92vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {service ? "Edit Dental Procedure" : "Add New Clinical Procedure"}
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Master Fee Schedule & Clinical Catalog
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4 flex-1">
            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 text-xs font-semibold">
                {errorMessage}
              </div>
            )}

            {/* Category & Procedure Code */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Clinical Specialty / Category *
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                >
                  {SERVICE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Item Code
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="e.g. PR-01"
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Procedure Name */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Official Procedure Name *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Light-Cure Composite Restoration (Posterior MOD)"
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                Clinical Description / Scope of Treatment
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Details of materials, technique, or indications for this procedure..."
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            {/* Standard Base Price & Range */}
            <div className="p-3.5 rounded-2xl bg-teal-50/50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/60 space-y-3">
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                <span>Pricing Schedule (Philippine Peso)</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Standard Base Fee *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      required
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs font-mono font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Min Price (Opt.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      placeholder="Min"
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400">
                    Max Price (Opt.)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-mono text-slate-400">₱</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      placeholder="Max"
                      className="w-full pl-7 pr-3 py-1.5 rounded-xl text-xs font-mono bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Standard Duration */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Estimated Operatory Chair Duration</span>
              </label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-3 py-2 rounded-xl text-xs bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                <option value="15">15 minutes (Quick consult / radiograph)</option>
                <option value="30">30 minutes (Checkup, simple extraction, fluoride)</option>
                <option value="45">45 minutes (Standard restoration, prophylaxis)</option>
                <option value="60">60 minutes (Complex restoration, orthodontic adjustment)</option>
                <option value="75">75 minutes (Power laser bleaching)</option>
                <option value="90">90 minutes (Odontectomy, root canal therapy)</option>
                <option value="120">120 minutes (Full arch cosmetic / rehabilitation)</option>
              </select>
            </div>

            {/* Operation & Booking Toggles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Active Service</div>
                  <div className="text-[10px] text-slate-500">Available in clinic POS & operatory</div>
                </div>
              </label>

              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 cursor-pointer">
                <input
                  type="checkbox"
                  checked={bookableOnline}
                  onChange={(e) => setBookableOnline(e.target.checked)}
                  className="rounded text-teal-600 focus:ring-teal-500"
                />
                <div>
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200">Public Booking</div>
                  <div className="text-[10px] text-slate-500">Show on public appointment portal</div>
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl text-xs font-bold bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-1.5"
              >
                {isSubmitting ? (
                  <span>Saving...</span>
                ) : (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{service ? "Save Changes" : "Create Procedure"}</span>
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
