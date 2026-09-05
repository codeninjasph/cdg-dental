"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useClinic } from "@/context/clinic-context";
import { BranchSchedule } from "@/types/dental";
import {
  Clock,
  Building2,
  Users,
  Sparkles,
  Shield,
  CheckCircle2,
  XCircle,
  Save,
  RotateCcw,
  Copy,
  Calendar,
  AlertTriangle,
  Info,
  Layers,
  ChevronDown,
  Loader2,
  Eye,
  Coffee,
  Sun,
  Moon,
} from "lucide-react";

interface BranchScheduleItem {
  day_of_week: number;
  day_name: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  has_break: boolean;
  break_start: string;
  break_end: string;
  slot_duration_minutes: number;
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

const TIME_OPTIONS = [
  "06:00", "06:30", "07:00", "07:30", "08:00", "08:30",
  "09:00", "09:30", "10:00", "10:30", "11:00", "11:30",
  "12:00", "12:30", "13:00", "13:30", "14:00", "14:30",
  "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
  "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"
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

export default function AdminHoursPage() {
  const { showToast, branches, activeBranch } = useClinic();

  const [selectedBranchId, setSelectedBranchId] = useState<string>("");
  const [schedules, setSchedules] = useState<BranchScheduleItem[]>([]);
  const [initialSchedules, setInitialSchedules] = useState<BranchScheduleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [copyToAll, setCopyToAll] = useState(false);
  const [previewDay, setPreviewDay] = useState<number>(1); // Default preview Monday

  // Set default branch when branches load
  useEffect(() => {
    if (branches.length > 0 && !selectedBranchId) {
      const defaultId = activeBranch?.id || branches[0].id;
      setSelectedBranchId(defaultId);
    }
  }, [branches, activeBranch, selectedBranchId]);

  // Fetch schedule for selected branch
  const fetchSchedule = async (branchId: string) => {
    if (!branchId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/hours?branch_id=${branchId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load operating hours.");

      const mapped: BranchScheduleItem[] = (data.schedules || []).map((s: BranchSchedule) => ({
        day_of_week: s.day_of_week,
        day_name: DAY_NAMES[s.day_of_week],
        is_open: s.is_open,
        open_time: s.open_time ? s.open_time.slice(0, 5) : "09:00",
        close_time: s.close_time ? s.close_time.slice(0, 5) : "18:00",
        has_break: s.has_break,
        break_start: s.break_start ? s.break_start.slice(0, 5) : "12:00",
        break_end: s.break_end ? s.break_end.slice(0, 5) : "13:00",
        slot_duration_minutes: s.slot_duration_minutes || 60,
      }));

      // Sort Monday to Sunday (1..6, 0)
      const sorted = mapped.sort((a, b) => {
        const orderA = a.day_of_week === 0 ? 7 : a.day_of_week;
        const orderB = b.day_of_week === 0 ? 7 : b.day_of_week;
        return orderA - orderB;
      });

      setSchedules(sorted);
      setInitialSchedules(JSON.parse(JSON.stringify(sorted)));
    } catch (err: any) {
      showToast(err.message || "Failed to load operating hours.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedBranchId) {
      fetchSchedule(selectedBranchId);
    }
  }, [selectedBranchId]);

  const selectedBranch = useMemo(() => {
    return branches.find((b) => b.id === selectedBranchId) || branches[0];
  }, [branches, selectedBranchId]);

  // Handle individual field update for a day
  const updateDay = (dayOfWeek: number, patch: Partial<BranchScheduleItem>) => {
    setSchedules((prev) =>
      prev.map((item) =>
        item.day_of_week === dayOfWeek ? { ...item, ...patch } : item
      )
    );
  };

  // Quick Preset 1: Standard Clinic Hours (Mon-Sat 9AM-6PM, Sun Closed)
  const applyStandardHours = () => {
    setSchedules((prev) =>
      prev.map((item) => {
        const isSunday = item.day_of_week === 0;
        return {
          ...item,
          is_open: !isSunday,
          open_time: "09:00",
          close_time: "18:00",
          has_break: true,
          break_start: "12:00",
          break_end: "13:00",
          slot_duration_minutes: 60,
        };
      })
    );
    showToast("Applied Standard Schedule (Mon–Sat 9AM–6PM, Sun Closed). Don't forget to save!", "info");
  };

  // Quick Preset 2: 7-Day Extended Hours
  const applyExtendedHours = () => {
    setSchedules((prev) =>
      prev.map((item) => ({
        ...item,
        is_open: true,
        open_time: "08:00",
        close_time: "20:00",
        has_break: true,
        break_start: "12:00",
        break_end: "13:00",
        slot_duration_minutes: 60,
      }))
    );
    showToast("Applied 7-Day Extended Schedule (8AM–8PM).", "info");
  };

  // Quick Copy: Copy Monday's hours to all open days
  const copyMondayHoursToAll = () => {
    const monday = schedules.find((s) => s.day_of_week === 1);
    if (!monday) return;

    setSchedules((prev) =>
      prev.map((item) => {
        if (item.day_of_week === 0) return item; // keep Sunday as is
        return {
          ...item,
          open_time: monday.open_time,
          close_time: monday.close_time,
          has_break: monday.has_break,
          break_start: monday.break_start,
          break_end: monday.break_end,
          slot_duration_minutes: monday.slot_duration_minutes,
        };
      })
    );
    showToast("Copied Monday's hours and slot settings to all weekdays.", "info");
  };

  // Check if dirty
  const isDirty = useMemo(() => {
    return JSON.stringify(schedules) !== JSON.stringify(initialSchedules);
  }, [schedules, initialSchedules]);

  // Discard changes
  const handleDiscard = () => {
    setSchedules(JSON.parse(JSON.stringify(initialSchedules)));
    showToast("Reverted changes to last saved state.", "info");
  };

  // Save changes
  const handleSave = async () => {
    if (!selectedBranchId) return;
    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branch_id: selectedBranchId,
          schedules: schedules.map((s) => ({
            day_of_week: s.day_of_week,
            is_open: s.is_open,
            open_time: s.open_time,
            close_time: s.close_time,
            has_break: s.has_break,
            break_start: s.has_break ? s.break_start : null,
            break_end: s.has_break ? s.break_end : null,
            slot_duration_minutes: s.slot_duration_minutes,
          })),
          copy_to_all: copyToAll,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save operating schedule.");

      showToast(data.message || "Operating hours saved successfully!", "success");
      setInitialSchedules(JSON.parse(JSON.stringify(schedules)));
      setCopyToAll(false);
    } catch (err: any) {
      showToast(err.message || "Could not save operating hours.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Compute live preview booking slots for the selected preview day
  const previewScheduleItem = schedules.find((s) => s.day_of_week === previewDay);
  const previewSlots = useMemo(() => {
    if (!previewScheduleItem || !previewScheduleItem.is_open) return [];

    const slots: string[] = [];
    const [openH, openM] = previewScheduleItem.open_time.split(":").map(Number);
    const [closeH, closeM] = previewScheduleItem.close_time.split(":").map(Number);
    const step = previewScheduleItem.slot_duration_minutes || 60;

    let [breakStartH, breakStartM] = [12, 0];
    let [breakEndH, breakEndM] = [13, 0];
    if (previewScheduleItem.has_break && previewScheduleItem.break_start && previewScheduleItem.break_end) {
      [breakStartH, breakStartM] = previewScheduleItem.break_start.split(":").map(Number);
      [breakEndH, breakEndM] = previewScheduleItem.break_end.split(":").map(Number);
    }

    const openTotalMinutes = openH * 60 + openM;
    const closeTotalMinutes = closeH * 60 + closeM;
    const breakStartTotalMinutes = breakStartH * 60 + breakStartM;
    const breakEndTotalMinutes = breakEndH * 60 + breakEndM;

    let current = openTotalMinutes;
    while (current + step <= closeTotalMinutes) {
      // Check if this slot overlaps midday break
      const overlapsBreak =
        previewScheduleItem.has_break &&
        current >= breakStartTotalMinutes &&
        current < breakEndTotalMinutes;

      if (!overlapsBreak) {
        const slotH = Math.floor(current / 60);
        const slotM = current % 60;
        slots.push(`${String(slotH).padStart(2, "0")}:${String(slotM).padStart(2, "0")}`);
      }
      current += step;
    }

    return slots;
  }, [previewScheduleItem]);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* ── Admin Navigation Suite Tabs ── */}
      <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-2xl w-fit border border-slate-200/80 dark:border-slate-800">
        <Link
          href="/admin/users"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Users className="w-3.5 h-3.5 text-slate-500" />
          <span>Staff Directory & Access</span>
        </Link>
        <Link
          href="/admin/branches"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Building2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Clinic Branches & Locations</span>
        </Link>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/80 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
          <Clock className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
          <span>Dental Hours & Open Days</span>
        </div>
        <Link
          href="/admin/dentists"
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-slate-500" />
          <span>Dentist Directory & Content</span>
        </Link>
      </div>

      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700 border border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800">
              <Shield className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              Clinic Administration
            </span>
            <span className="text-xs text-slate-300 dark:text-slate-600">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              Operating Hours & Booking Schedule
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            Dental Hours & Operating Days
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-3xl">
            Configure opening times, closing times, midday breaks, and open/closed days per clinic branch. Changes dynamically govern which appointment dates and time slots appear on the public booking portal.
          </p>
        </div>

        {/* Save & Discard Buttons */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto shrink-0">
          {isDirty && (
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 transition-all cursor-pointer"
            >
              <RotateCcw className="w-4 h-4 text-slate-400" />
              <span>Discard</span>
            </button>
          )}

          <button
            onClick={handleSave}
            disabled={isSaving || !isDirty}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition-all cursor-pointer ${
              isDirty
                ? "bg-teal-600 hover:bg-teal-700 text-white shadow-teal-600/20 hover:shadow-md"
                : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed border border-slate-200 dark:border-slate-800"
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Saving Schedule...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Operating Hours</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* ── Branch Selector & Quick Actions Banner ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Branch Switcher Card */}
        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            <span>Select Clinic Branch to Manage</span>
          </label>
          <div className="relative">
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-bold text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-teal-500 appearance-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.is_active ? "" : "(Inactive)"}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {selectedBranch && (
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 space-y-1">
              <div className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                {selectedBranch.name}
              </div>
              <div className="truncate">{selectedBranch.address || "Address not specified"}</div>
              <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-medium">
                <span>{selectedBranch.phone || "No phone listed"}</span>
                <span>•</span>
                <span>{selectedBranch.email || "No email listed"}</span>
              </div>
            </div>
          )}
        </div>

        {/* Quick Batch Presets */}
        <div className="lg:col-span-2 p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Quick Schedule Presets & Multi-Branch Sync
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Quickly apply standard medical practice hours or replicate one branch's dental hours across the whole network.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applyStandardHours}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Standard: Mon–Sat 9AM–6PM (Sun Closed)
            </button>
            <button
              type="button"
              onClick={applyExtendedHours}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer"
            >
              Extended: 7-Day 8AM–8PM
            </button>
            <button
              type="button"
              onClick={copyMondayHoursToAll}
              className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-teal-50 dark:hover:bg-teal-950/40 text-slate-700 dark:text-slate-300 hover:text-teal-600 dark:hover:text-teal-300 border border-slate-200/80 dark:border-slate-700 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Copy className="w-3 h-3 text-slate-400" />
              <span>Copy Monday to all weekdays</span>
            </button>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center gap-2">
            <input
              type="checkbox"
              id="copy-to-all"
              checked={copyToAll}
              onChange={(e) => setCopyToAll(e.target.checked)}
              className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
            />
            <label
              htmlFor="copy-to-all"
              className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer font-medium"
            >
              Replicate these operating hours to <strong className="text-slate-900 dark:text-slate-100">ALL other active clinic branches</strong> upon saving
            </label>
          </div>
        </div>
      </div>

      {/* ── Main Workspace: 7-Day Schedule Matrix & Live Public Preview ── */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* Left / Center (8 cols): 7-Day Table */}
        <div className="xl:col-span-8 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-teal-600 dark:text-teal-400" />
                  Weekly Operating Schedule
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Set daily open/closed status, operating shift, and midday intermission for {selectedBranch?.name}.
                </p>
              </div>
              {isDirty && (
                <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 px-2.5 py-1 rounded-full animate-pulse">
                  Unsaved Changes
                </span>
              )}
            </div>

            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center gap-3">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                <p className="text-xs text-slate-500">Loading branch schedule...</p>
              </div>
            ) : (
              <div className="space-y-3">
                {schedules.map((day) => {
                  const isSelectedForPreview = previewDay === day.day_of_week;
                  return (
                    <div
                      key={day.day_of_week}
                      className={`p-4 rounded-2xl border transition-all ${
                        day.is_open
                          ? isSelectedForPreview
                            ? "border-teal-500 bg-teal-50/40 dark:bg-teal-950/20 ring-1 ring-teal-500"
                            : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300"
                          : "border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 opacity-75"
                      }`}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Day Name & Open/Closed Switch */}
                        <div className="flex items-center gap-3 min-w-[180px]">
                          {/* Toggle */}
                          <button
                            type="button"
                            role="switch"
                            aria-checked={day.is_open}
                            onClick={() => updateDay(day.day_of_week, { is_open: !day.is_open })}
                            className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer shrink-0 ${
                              day.is_open ? "bg-teal-600" : "bg-slate-300 dark:bg-slate-700"
                            }`}
                          >
                            <span
                              className={`w-4 h-4 rounded-full bg-white transition-transform block absolute top-1 ${
                                day.is_open ? "left-6" : "left-1"
                              }`}
                            />
                          </button>

                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                                {day.day_name}
                              </span>
                              {day.is_open ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  OPEN
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  CLOSED
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400">
                              {day.is_open
                                ? `${format12Hour(day.open_time)} – ${format12Hour(day.close_time)}`
                                : "No booking slots available"}
                            </span>
                          </div>
                        </div>

                        {/* If Open: Hours, Breaks & Slot Step Controls */}
                        {day.is_open ? (
                          <div className="flex flex-wrap items-center gap-3">
                            {/* Open & Close Times */}
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                              <Sun className="w-3.5 h-3.5 text-amber-500 shrink-0 ml-1" />
                              <select
                                value={day.open_time}
                                onChange={(e) => updateDay(day.day_of_week, { open_time: e.target.value })}
                                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {format12Hour(t)}
                                  </option>
                                ))}
                              </select>
                              <span className="text-xs text-slate-400 font-medium">to</span>
                              <Moon className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <select
                                value={day.close_time}
                                onChange={(e) => updateDay(day.day_of_week, { close_time: e.target.value })}
                                className="bg-transparent text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none cursor-pointer"
                              >
                                {TIME_OPTIONS.map((t) => (
                                  <option key={t} value={t}>
                                    {format12Hour(t)}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Midday Lunch Break */}
                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/80 p-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700">
                              <label className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-300 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={day.has_break}
                                  onChange={(e) => updateDay(day.day_of_week, { has_break: e.target.checked })}
                                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer"
                                />
                                <Coffee className="w-3.5 h-3.5 text-amber-600" />
                                <span className="font-semibold text-[11px]">Break:</span>
                              </label>

                              {day.has_break ? (
                                <div className="flex items-center gap-1 text-xs">
                                  <select
                                    value={day.break_start}
                                    onChange={(e) => updateDay(day.day_of_week, { break_start: e.target.value })}
                                    className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                                  >
                                    {TIME_OPTIONS.map((t) => (
                                      <option key={t} value={t}>
                                        {format12Hour(t)}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-slate-400 text-[10px]">-</span>
                                  <select
                                    value={day.break_end}
                                    onChange={(e) => updateDay(day.day_of_week, { break_end: e.target.value })}
                                    className="bg-transparent text-[11px] font-bold text-slate-700 dark:text-slate-300 focus:outline-none cursor-pointer"
                                  >
                                    {TIME_OPTIONS.map((t) => (
                                      <option key={t} value={t}>
                                        {format12Hour(t)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 font-medium">None</span>
                              )}
                            </div>

                            {/* Slot Interval */}
                            <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200/80 dark:border-slate-700 text-xs">
                              <span className="text-slate-500 text-[11px]">Slot:</span>
                              <select
                                value={day.slot_duration_minutes}
                                onChange={(e) => updateDay(day.day_of_week, { slot_duration_minutes: Number(e.target.value) })}
                                className="bg-transparent text-xs font-bold text-teal-700 dark:text-teal-300 focus:outline-none cursor-pointer"
                              >
                                <option value={30}>30 mins</option>
                                <option value={45}>45 mins</option>
                                <option value={60}>60 mins (1 hr)</option>
                                <option value={90}>90 mins</option>
                                <option value={120}>120 mins</option>
                              </select>
                            </div>

                            {/* Preview Simulator Trigger */}
                            <button
                              type="button"
                              onClick={() => setPreviewDay(day.day_of_week)}
                              className={`p-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 ${
                                isSelectedForPreview
                                  ? "bg-teal-600 text-white"
                                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}
                              title="Preview booking slots for this day"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline text-[11px]">Preview</span>
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-rose-500 font-medium flex items-center gap-1.5">
                              <XCircle className="w-3.5 h-3.5" />
                              Public booking disabled on {day.day_name}s
                            </span>
                            <button
                              type="button"
                              onClick={() => setPreviewDay(day.day_of_week)}
                              className="text-[11px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline ml-2 cursor-pointer"
                            >
                              See patient view
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right (4 cols): Live Public Booking Simulator Preview */}
        <div className="xl:col-span-4 space-y-4">
          <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-teal-50 text-teal-600 dark:bg-teal-950/60 dark:text-teal-400">
                  <Eye className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                  Live Patient Booking Simulator
                </h3>
              </div>
              <span className="text-[10px] font-mono font-bold bg-teal-100/80 text-teal-800 dark:bg-teal-950/80 dark:text-teal-300 px-2 py-0.5 rounded-full">
                Real-Time
              </span>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">
              This preview shows precisely what public visitors and patients will experience when booking an appointment for this branch.
            </p>

            {/* Day Selector for preview */}
            <div className="mt-4 space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Preview Day of Week
              </label>
              <div className="grid grid-cols-7 gap-1">
                {schedules.map((d) => (
                  <button
                    key={d.day_of_week}
                    type="button"
                    onClick={() => setPreviewDay(d.day_of_week)}
                    className={`py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      previewDay === d.day_of_week
                        ? "bg-teal-600 text-white shadow-xs"
                        : d.is_open
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200"
                        : "bg-slate-50 dark:bg-slate-900/60 text-slate-400 border border-dashed border-slate-300 dark:border-slate-700"
                    }`}
                  >
                    {d.day_name.slice(0, 3)}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulator Output Box */}
            <div className="mt-5 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200/80 dark:border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-xs text-slate-800 dark:text-slate-200">
                  {previewScheduleItem?.day_name} Simulator
                </span>
                <span className="text-[10px] text-slate-400">
                  {selectedBranch?.name}
                </span>
              </div>

              {previewScheduleItem?.is_open ? (
                <div>
                  <div className="text-[11px] text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/40 p-2 rounded-lg border border-teal-200/60 dark:border-teal-800/40 mb-3 flex items-center justify-between">
                    <span>
                      Operating Hours: <strong>{format12Hour(previewScheduleItem.open_time)} – {format12Hour(previewScheduleItem.close_time)}</strong>
                    </span>
                    <span className="font-mono text-[10px]">
                      {previewSlots.length} slot(s)
                    </span>
                  </div>

                  {previewScheduleItem.has_break && (
                    <div className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-1 rounded-md border border-amber-200/60 dark:border-amber-800/40 mb-3 flex items-center gap-1.5">
                      <Coffee className="w-3 h-3 shrink-0" />
                      <span>
                        Lunch Break excluded: {format12Hour(previewScheduleItem.break_start)} – {format12Hour(previewScheduleItem.break_end)}
                      </span>
                    </div>
                  )}

                  <label className="block text-[11px] font-bold text-slate-600 dark:text-slate-400 mb-2">
                    Available Time Slots on Public Booking Modal:
                  </label>

                  {previewSlots.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                      {previewSlots.map((slot) => (
                        <div
                          key={slot}
                          className="py-1.5 px-2 rounded-lg bg-white dark:bg-slate-900 border border-teal-500/30 text-teal-700 dark:text-teal-300 font-bold text-xs text-center shadow-2xs hover:border-teal-500 transition-colors"
                        >
                          {format12Hour(slot)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-rose-500 italic">
                      No slots can be generated within these operating hours and interval.
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-rose-50/70 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-center space-y-2">
                  <XCircle className="w-6 h-6 text-rose-500 mx-auto" />
                  <div className="font-bold text-xs text-rose-800 dark:text-rose-200">
                    Clinic Branch Closed on {previewScheduleItem?.day_name}s
                  </div>
                  <p className="text-[11px] text-rose-600 dark:text-rose-300">
                    When a patient selects {previewScheduleItem?.day_name} in the date picker, the booking modal displays an alert asking them to choose another day or branch.
                  </p>
                </div>
              )}
            </div>

            {/* Explanatory Info Card */}
            <div className="mt-4 p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-800 dark:text-blue-300 space-y-1">
              <div className="flex items-center gap-1.5 font-bold">
                <Info className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                <span>How This Impacts Public Bookings</span>
              </div>
              <p className="text-[10px] leading-relaxed text-blue-700 dark:text-blue-400">
                The public booking intake form checks this schedule in real time. If a patient picks a closed day, slot selection is disabled. If open, slots are calculated from opening to closing minus the lunch hour.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
