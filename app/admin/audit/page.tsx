"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useClinic } from "@/context/clinic-context";
import { AuditLogRecord, AuditActionCategory } from "@/lib/db/audit";
import {
  ShieldCheck,
  Search,
  Filter,
  Download,
  RefreshCw,
  Clock,
  User,
  Building,
  Receipt,
  Tag,
  Sparkles,
  Users,
  Shield,
  Key,
  Layers,
  ChevronRight,
  Eye,
  X,
  Copy,
  Check,
  AlertCircle,
  Calendar,
  FileSpreadsheet,
  ArrowLeft,
  SlidersHorizontal,
} from "lucide-react";
import { ModalPortal } from "@/components/ui/modal-portal";

const CATEGORY_TABS: { id: string; label: string; category?: AuditActionCategory }[] = [
  { id: "all", label: "All Activities" },
  { id: "billing", label: "Billing & Discounts", category: "billing" },
  { id: "pricing", label: "Fee Schedule & Pricing", category: "pricing" },
  { id: "treatment", label: "Chairside Treatments", category: "treatment" },
  { id: "patient", label: "Patient CRM & Merges", category: "patient" },
  { id: "access_control", label: "Security & Access", category: "access_control" },
];

function getCategoryBadge(category: AuditActionCategory) {
  switch (category) {
    case "billing":
      return {
        icon: Receipt,
        bg: "bg-purple-100 dark:bg-purple-950/70",
        text: "text-purple-700 dark:text-purple-300",
        border: "border-purple-200 dark:border-purple-800",
      };
    case "pricing":
      return {
        icon: Tag,
        bg: "bg-emerald-100 dark:bg-emerald-950/70",
        text: "text-emerald-700 dark:text-emerald-300",
        border: "border-emerald-200 dark:border-emerald-800",
      };
    case "treatment":
      return {
        icon: Sparkles,
        bg: "bg-teal-100 dark:bg-teal-950/70",
        text: "text-teal-700 dark:text-teal-300",
        border: "border-teal-200 dark:border-teal-800",
      };
    case "patient":
      return {
        icon: Users,
        bg: "bg-blue-100 dark:bg-blue-950/70",
        text: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-800",
      };
    case "access_control":
      return {
        icon: Shield,
        bg: "bg-rose-100 dark:bg-rose-950/70",
        text: "text-rose-700 dark:text-rose-300",
        border: "border-rose-200 dark:border-rose-800",
      };
    case "appointment":
      return {
        icon: Calendar,
        bg: "bg-amber-100 dark:bg-amber-950/70",
        text: "text-amber-700 dark:text-amber-300",
        border: "border-amber-200 dark:border-amber-800",
      };
    default:
      return {
        icon: Layers,
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-700 dark:text-slate-300",
        border: "border-slate-200 dark:border-slate-700",
      };
  }
}

export default function AdminAuditPage() {
  const { currentStaff, showToast, activeBranch } = useClinic();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "week" | "month">("all");

  const [inspectLog, setInspectLog] = useState<AuditLogRecord | null>(null);
  const [copiedPayload, setCopiedPayload] = useState(false);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/audit?limit=300");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load audit logs");
      setLogs(data.logs || []);
    } catch (err: any) {
      showToast(err.message || "Failed to load audit logs.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Filter logs by tab, search, role, and date range
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Category tab
      if (activeTab !== "all") {
        const tabDef = CATEGORY_TABS.find((t) => t.id === activeTab);
        if (tabDef?.category && log.action_category !== tabDef.category) {
          return false;
        }
      }

      // Role filter
      if (selectedRole !== "all") {
        if (log.actor_role?.toLowerCase() !== selectedRole.toLowerCase()) {
          return false;
        }
      }

      // Date filter
      if (dateFilter !== "all") {
        const createdDate = new Date(log.created_at);
        const now = new Date();
        if (dateFilter === "today") {
          const isToday =
            createdDate.getDate() === now.getDate() &&
            createdDate.getMonth() === now.getMonth() &&
            createdDate.getFullYear() === now.getFullYear();
          if (!isToday) return false;
        } else if (dateFilter === "week") {
          const weekAgo = new Date();
          weekAgo.setDate(now.getDate() - 7);
          if (createdDate < weekAgo) return false;
        } else if (dateFilter === "month") {
          const monthAgo = new Date();
          monthAgo.setMonth(now.getMonth() - 1);
          if (createdDate < monthAgo) return false;
        }
      }

      // Text search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchDesc = log.description.toLowerCase().includes(q);
        const matchActor = log.actor_name.toLowerCase().includes(q);
        const matchAction = log.action_type.toLowerCase().includes(q);
        const matchEntity = log.entity_type?.toLowerCase().includes(q) || false;
        const matchBranch = log.branch_name?.toLowerCase().includes(q) || false;
        const matchMeta = log.metadata ? JSON.stringify(log.metadata).toLowerCase().includes(q) : false;

        if (!matchDesc && !matchActor && !matchAction && !matchEntity && !matchBranch && !matchMeta) {
          return false;
        }
      }

      return true;
    });
  }, [logs, activeTab, selectedRole, dateFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const billing = logs.filter((l) => l.action_category === "billing").length;
    const statutoryDiscounts = logs.filter(
      (l) =>
        l.metadata?.statutory_discount ||
        l.description.includes("Statutory Discount") ||
        l.description.includes("OSCA")
    ).length;
    const pricingUpdates = logs.filter((l) => l.action_category === "pricing").length;
    const securityEvents = logs.filter((l) => l.action_category === "access_control").length;

    return { total, billing, statutoryDiscounts, pricingUpdates, securityEvents };
  }, [logs]);

  // CSV Export handler
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast("No audit records to export.", "info");
      return;
    }

    const headers = [
      "Timestamp (UTC)",
      "Action Type",
      "Category",
      "Actor Name",
      "Actor Role",
      "Branch",
      "Description",
      "Entity Type",
      "Entity ID",
      "Metadata JSON",
    ];

    const rows = filteredLogs.map((l) => [
      `"${l.created_at}"`,
      `"${l.action_type}"`,
      `"${l.action_category}"`,
      `"${l.actor_name.replace(/"/g, '""')}"`,
      `"${l.actor_role}"`,
      `"${(l.branch_name || "").replace(/"/g, '""')}"`,
      `"${l.description.replace(/"/g, '""')}"`,
      `"${l.entity_type || ""}"`,
      `"${l.entity_id || ""}"`,
      `"${JSON.stringify(l.metadata || {}).replace(/"/g, '""')}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `cdg_dental_audit_log_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${filteredLogs.length} audit records to CSV.`, "success");
  };

  const handleCopyPayload = () => {
    if (!inspectLog) return;
    navigator.clipboard.writeText(JSON.stringify(inspectLog, null, 2));
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
    showToast("Audit payload copied to clipboard", "info");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
            <Link
              href="/admin"
              className="hover:text-teal-600 dark:hover:text-teal-400 transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin Console</span>
            </Link>
            <span>/</span>
            <span className="font-semibold text-slate-900 dark:text-slate-200">Compliance & Security</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
                Audit Trail & Activity Log
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Immutable compliance ledger tracking billing discounts, appointments, patient merges, fee alterations, and access control changes.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <Link
            href="/admin/services"
            className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/60 font-bold text-xs text-slate-700 dark:text-slate-300 transition-colors flex items-center gap-1.5 shadow-2xs"
          >
            <Tag className="w-4 h-4 text-teal-600" />
            <span>Fee Schedule</span>
          </Link>

          <button
            onClick={fetchLogs}
            disabled={isLoading}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-teal-600" : ""}`} />
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-teal-600" />
            Total Audit Events
          </span>
          <p className="text-2xl font-black text-slate-900 dark:text-slate-100">
            {stats.total.toLocaleString()}
          </p>
          <span className="text-[10px] text-slate-400">All registered system operations</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Statutory Discounts
          </span>
          <p className="text-2xl font-black text-purple-700 dark:text-purple-300">
            {stats.statutoryDiscounts}
          </p>
          <span className="text-[10px] text-slate-400">RA 9994 (Senior) & RA 10754 (PWD)</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" />
            Fee Alterations
          </span>
          <p className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
            {stats.pricingUpdates}
          </p>
          <span className="text-[10px] text-slate-400">Catalog additions & price updates</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
            <Key className="w-3.5 h-3.5" />
            Security & Access
          </span>
          <p className="text-2xl font-black text-rose-700 dark:text-rose-300">
            {stats.securityEvents}
          </p>
          <span className="text-[10px] text-slate-400">Role changes & staff permissions</span>
        </div>
      </div>

      {/* Filter and Tab Bar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs space-y-4">
        {/* Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORY_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-xl font-bold text-xs whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? "bg-teal-600 text-white shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by actor, description, OSCA/PWD ID, invoice #..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter */}
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="all">All Roles</option>
              <option value="admin">Administrators</option>
              <option value="dentist">Dentists</option>
              <option value="secretary">Secretaries</option>
              <option value="system">System Engine</option>
            </select>

            {/* Date Filter */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
            >
              <option value="all">All Dates</option>
              <option value="today">Today Only</option>
              <option value="week">Past 7 Days</option>
              <option value="month">Past 30 Days</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Audit Activity Stream */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-slate-100 text-sm">
              Activity Ledger
            </span>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {filteredLogs.length} events
            </span>
          </div>
          <span className="text-[11px] text-slate-400 hidden sm:inline">
            Click any entry to inspect raw audit payload
          </span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-teal-600" />
            <p>Loading compliance audit log...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs space-y-2">
            <AlertCircle className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-600" />
            <p className="font-semibold text-slate-700 dark:text-slate-300">
              No audit records match your filters.
            </p>
            <p className="text-[11px]">Try clearing search parameters or adjusting category tabs.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
            {filteredLogs.map((log) => {
              const badge = getCategoryBadge(log.action_category);
              const BadgeIcon = badge.icon;
              const hasStatutory =
                log.metadata?.statutory_discount ||
                log.description.includes("Statutory Discount") ||
                log.description.includes("OSCA");

              return (
                <div
                  key={log.id}
                  onClick={() => setInspectLog(log)}
                  className="p-4 sm:p-5 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors cursor-pointer flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs group"
                >
                  <div className="flex items-start gap-3.5">
                    {/* Category Icon */}
                    <div
                      className={`p-2.5 rounded-xl ${badge.bg} ${badge.text} border ${badge.border} shrink-0 mt-0.5`}
                    >
                      <BadgeIcon className="w-4 h-4" />
                    </div>

                    <div className="space-y-1.5">
                      {/* Action Type & Badges */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-slate-100">
                          {log.action_type}
                        </span>

                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${badge.bg} ${badge.text}`}
                        >
                          {log.action_category.replace("_", " ")}
                        </span>

                        {hasStatutory && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Tax Statutory Compliance</span>
                          </span>
                        )}
                      </div>

                      {/* Description */}
                      <p className="text-slate-800 dark:text-slate-200 text-xs leading-relaxed font-medium">
                        {log.description}
                      </p>

                      {/* Actor and Context */}
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-slate-500 dark:text-slate-400">
                        <span className="flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300">
                          <User className="w-3 h-3 text-slate-400" />
                          {log.actor_name}
                          <span className="font-normal text-[10px] px-1.5 py-0.2 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 uppercase">
                            {log.actor_role}
                          </span>
                        </span>

                        {log.branch_name && (
                          <span className="flex items-center gap-1">
                            <Building className="w-3 h-3 text-slate-400" />
                            {log.branch_name}
                          </span>
                        )}

                        {log.entity_type && (
                          <span className="font-mono text-[10px] text-slate-400">
                            entity: {log.entity_type}
                            {log.entity_id ? ` #${log.entity_id.substring(0, 8)}...` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Timestamp & Action Indicator */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-1 shrink-0 pt-2 sm:pt-0">
                    <span className="font-mono text-[11px] font-bold text-slate-600 dark:text-slate-400">
                      {new Date(log.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(log.created_at).toLocaleDateString()}
                    </span>

                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 text-teal-600 font-bold text-[11px] mt-1">
                      <span>Inspect</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Audit Record Inspector Modal */}
      {inspectLog && (
        <ModalPortal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/70">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                      Audit Event Inspector
                    </h3>
                    <p className="font-mono text-[10px] text-slate-400">
                      ID: {inspectLog.id}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setInspectLog(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto space-y-4 text-xs">
                {/* Event Summary Box */}
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 dark:text-slate-100 text-sm">
                      {inspectLog.action_type}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300">
                      {inspectLog.action_category}
                    </span>
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 text-xs font-medium">
                    {inspectLog.description}
                  </p>
                </div>

                {/* Attribute Matrix */}
                <div className="grid grid-cols-2 gap-3 text-[11px]">
                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Actor</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {inspectLog.actor_name} ({inspectLog.actor_role})
                    </p>
                    {inspectLog.actor_id && (
                      <p className="font-mono text-[10px] text-slate-400 truncate">
                        UUID: {inspectLog.actor_id}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Timestamp</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {new Date(inspectLog.created_at).toLocaleString()}
                    </p>
                    <p className="font-mono text-[10px] text-slate-400">
                      {inspectLog.created_at}
                    </p>
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Target Entity</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {inspectLog.entity_type || "N/A"}
                    </p>
                    {inspectLog.entity_id && (
                      <p className="font-mono text-[10px] text-slate-400 truncate">
                        {inspectLog.entity_id}
                      </p>
                    )}
                  </div>

                  <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Clinic Branch</span>
                    <p className="font-bold text-slate-800 dark:text-slate-200">
                      {inspectLog.branch_name || "Main Clinic Hub"}
                    </p>
                    {inspectLog.branch_id && (
                      <p className="font-mono text-[10px] text-slate-400 truncate">
                        {inspectLog.branch_id}
                      </p>
                    )}
                  </div>
                </div>

                {/* Metadata JSON Viewer */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 dark:text-slate-300 text-xs">
                      Recorded Metadata & Compliance Proof
                    </span>
                    <button
                      onClick={handleCopyPayload}
                      className="flex items-center gap-1 text-[11px] font-bold text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Payload</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-60 border border-slate-800">
                    {JSON.stringify(inspectLog.metadata || {}, null, 2)}
                  </pre>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <button
                  onClick={() => setInspectLog(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 font-bold text-xs text-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                >
                  Close Inspector
                </button>
              </div>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  );
}
