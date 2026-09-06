"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useClinic } from "@/context/clinic-context";
import { DentalService } from "@/lib/db/services";
import { ServiceModal, SERVICE_CATEGORIES } from "@/components/admin/service-modal";
import {
  Sparkles,
  Plus,
  Search,
  Tag,
  Clock,
  DollarSign,
  CheckCircle2,
  XCircle,
  Edit2,
  Trash2,
  Globe,
  Filter,
  Layers,
  ArrowRight,
  Shield,
  RefreshCw,
  TrendingUp,
} from "lucide-react";

export default function AdminServicesPage() {
  const { currentStaff, showToast, activeBranch } = useClinic();
  const [services, setServices] = useState<DentalService[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<DentalService | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchServices = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/services");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load services");
      setServices(data.services || []);
    } catch (err: any) {
      showToast(err.message || "Could not load clinical services.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleToggleStatus = async (service: DentalService) => {
    setActionLoadingId(service.id);
    try {
      const newStatus = !service.is_active;
      const res = await fetch("/api/admin/services", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: service.id,
          is_active: newStatus,
          actorName: currentStaff?.full_name || "Clinic Administrator",
          actorId: currentStaff?.id,
          branchName: activeBranch?.name,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update service status.");

      showToast(`'${service.name}' is now ${newStatus ? "ACTIVE" : "INACTIVE"}.`, "info");
      await fetchServices();
    } catch (err: any) {
      showToast(err.message || "Failed to toggle status.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDelete = async (service: DentalService) => {
    const confirmed = window.confirm(
      `Are you sure you want to remove '${service.name}' from the master catalog?`
    );
    if (!confirmed) return;

    setActionLoadingId(service.id);
    try {
      const res = await fetch(`/api/admin/services?id=${service.id}&actorName=${encodeURIComponent(currentStaff?.full_name || "Clinic Administrator")}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete service.");

      showToast(`Removed '${service.name}' from catalog.`, "info");
      await fetchServices();
    } catch (err: any) {
      showToast(err.message || "Failed to delete service.", "error");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Filtered Services
  const filteredServices = useMemo(() => {
    return services.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.code && s.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.description && s.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesCategory =
        selectedCategory === "all" || s.category.toLowerCase() === selectedCategory.toLowerCase();

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [services, searchQuery, selectedCategory, statusFilter]);

  // Statistics
  const stats = useMemo(() => {
    const activeCount = services.filter((s) => s.is_active).length;
    const bookableCount = services.filter((s) => s.bookable_online).length;
    const avgPrice = services.length > 0
      ? Math.round(services.reduce((sum, s) => sum + Number(s.base_price || 0), 0) / services.length)
      : 0;

    return {
      total: services.length,
      active: activeCount,
      bookable: bookableCount,
      avgPrice,
    };
  }, [services]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold bg-teal-500/10 text-teal-700 dark:text-teal-300 border border-teal-500/20">
              Admin Governance
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              CDG Practice Management
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
            <Sparkles className="w-7 h-7 text-teal-600 dark:text-teal-400 shrink-0" />
            <span>Master Fee Schedule & Treatment Catalog</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
            Standardized clinical procedure pricing, operatory chair durations, and public online booking eligibility.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-start sm:self-center">
          <Link
            href="/admin/audit"
            className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-violet-500" />
            <span>Audit Trail</span>
          </Link>

          <button
            onClick={() => {
              setEditingService(null);
              setIsModalOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white font-bold text-xs shadow-md shadow-teal-600/20 transition-all cursor-pointer flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Add Procedure</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] uppercase tracking-wider font-bold">Total Catalog</span>
            <Tag className="w-4 h-4 text-teal-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
            {stats.total}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Defined clinical procedures</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] uppercase tracking-wider font-bold">Active in POS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400">
            {stats.active}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Ready for treatment recording</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] uppercase tracking-wider font-bold">Online Booking</span>
            <Globe className="w-4 h-4 text-blue-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-blue-600 dark:text-blue-400">
            {stats.bookable}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Enabled on public website</p>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] uppercase tracking-wider font-bold">Average Base Fee</span>
            <DollarSign className="w-4 h-4 text-violet-600" />
          </div>
          <div className="mt-2 text-2xl font-black font-mono text-slate-900 dark:text-white">
            ₱{stats.avgPrice.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Across all procedures</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-2xs space-y-3">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs no-scrollbar">
          <button
            onClick={() => setSelectedCategory("all")}
            className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
              selectedCategory === "all"
                ? "bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-2xs"
                : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200"
            }`}
          >
            All Specialties ({services.length})
          </button>
          {SERVICE_CATEGORIES.map((cat) => {
            const count = services.filter((s) => s.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl font-bold whitespace-nowrap transition-colors cursor-pointer shrink-0 border ${
                  selectedCategory === cat
                    ? "bg-teal-600 text-white border-teal-600 shadow-2xs"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-transparent hover:bg-slate-200"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>

        {/* Search & Status Controls */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, code, or description..."
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs self-start sm:self-center">
            <span className="text-[11px] font-semibold text-slate-400 mr-1">Status:</span>
            {[
              { key: "all" as const, label: "All" },
              { key: "active" as const, label: "Active" },
              { key: "inactive" as const, label: "Inactive" },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setStatusFilter(st.key)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  statusFilter === st.key
                    ? "bg-teal-600 text-white font-bold"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Services Table / Cards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Loading master fee schedule...</span>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Tag className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto" />
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              No dental procedures found matching your filters.
            </p>
            <button
              onClick={() => {
                setSearchQuery("");
                setSelectedCategory("all");
                setStatusFilter("all");
              }}
              className="text-xs font-bold text-teal-600 hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          filteredServices.map((service) => (
            <div
              key={service.id}
              className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-850/40 transition-colors"
            >
              {/* Left Details */}
              <div className="space-y-1.5 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {service.code && (
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {service.code}
                    </span>
                  )}
                  <h3 className="font-black text-slate-900 dark:text-slate-100 text-base">
                    {service.name}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                    {service.category}
                  </span>

                  {service.bookable_online && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-900">
                      <Globe className="w-2.5 h-2.5" />
                      <span>Online Booking</span>
                    </span>
                  )}
                </div>

                {service.description && (
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 max-w-2xl">
                    {service.description}
                  </p>
                )}

                <div className="flex items-center gap-3 text-xs text-slate-400 pt-0.5 flex-wrap">
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>Est. {service.default_duration_minutes} mins</span>
                  </span>
                  {service.min_price && service.max_price && (
                    <span>
                      Range: ₱{Number(service.min_price).toLocaleString()} – ₱{Number(service.max_price).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>

              {/* Right: Fee & Action Buttons */}
              <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                <div className="text-left sm:text-right">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-slate-400">
                    Base Standard Fee
                  </div>
                  <div className="text-xl font-black font-mono text-teal-700 dark:text-teal-300">
                    ₱{Number(service.base_price).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Active Toggle Button */}
                  <button
                    onClick={() => handleToggleStatus(service)}
                    disabled={actionLoadingId === service.id}
                    title={service.is_active ? "Deactivate procedure" : "Activate procedure"}
                    className={`p-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      service.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300"
                        : "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 dark:text-slate-500"
                    }`}
                  >
                    {service.is_active ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <XCircle className="w-4 h-4" />
                    )}
                  </button>

                  {/* Edit Button */}
                  <button
                    onClick={() => {
                      setEditingService(service);
                      setIsModalOpen(true);
                    }}
                    className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:text-teal-600 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                    title="Edit procedure fee & duration"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  {/* Delete Button */}
                  <button
                    onClick={() => handleDelete(service)}
                    disabled={actionLoadingId === service.id}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer"
                    title="Delete procedure"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Service Modal */}
      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={fetchServices}
        service={editingService}
        adminName={currentStaff?.full_name || "Clinic Administrator"}
        adminId={currentStaff?.id}
        branchName={activeBranch?.name}
      />
    </div>
  );
}
