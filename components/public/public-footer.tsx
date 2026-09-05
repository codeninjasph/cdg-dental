"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Sparkles,
  MapPin,
  Phone,
  Clock,
  ShieldCheck,
  Building,
} from "lucide-react";
import { CDO_BRANCHES_DATA, CDO_DENTISTS_DATA, CDO_SERVICES_DATA } from "@/lib/cdo-clinic-data";

export function PublicFooter() {
  const [branchesList, setBranchesList] = useState(CDO_BRANCHES_DATA);
  const [dentistsList, setDentistsList] = useState(CDO_DENTISTS_DATA);

  useEffect(() => {
    fetch("/api/public/clinic-data")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          if (Array.isArray(data.branches) && data.branches.length > 0) {
            setBranchesList((prev) =>
              data.branches.map((b: any) => {
                const match = prev.find((p) => p.id === b.id);
                return {
                  id: b.id,
                  name: b.name,
                  shortName: b.shortName || (b.name.includes("—") ? b.name.split("—")[1].trim() : b.name),
                  address: b.address || match?.address || "Cagayan de Oro City",
                  phone: b.phone || match?.phone || "+63 88 850 1234",
                  mobile: match?.mobile || "+63 917 123 4567",
                  email: b.email || match?.email || "cdo@cdgdental.ph",
                  hours: match?.hours || "Monday – Saturday: 9:00 AM – 6:00 PM",
                  landmarks: match?.landmarks || "Strategically located dental hub in Cagayan de Oro.",
                  parking: match?.parking || "Ample customer parking available on premises.",
                };
              })
            );
          }
          if (Array.isArray(data.dentists) && data.dentists.length > 0) {
            setDentistsList(data.dentists);
          }
        }
      })
      .catch((err) => console.error("Error loading footer clinic data:", err));
  }, []);

  return (
    <footer id="branches" className="bg-slate-950 text-slate-300 border-t border-slate-800">
      {/* Branches Highlight Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-400 bg-teal-950/60 border border-teal-800 px-3 py-1 rounded-full">
            {branchesList.length} Convenient Hubs in Cagayan de Oro
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-white mt-3">
            Visit Our CDO Dental Suites
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-2">
            Accessible hospital-grade dental suites strategically located across Downtown Lapasan, Uptown Pueblo de Oro, and Centrio Ayala Mall.
          </p>
        </div>

        {/* Branch Cards */}
        <div className={`grid grid-cols-1 md:grid-cols-2 ${branchesList.length >= 3 ? "lg:grid-cols-3" : ""} gap-6 mb-16`}>
          {branchesList.map((branch) => (
            <div
              key={branch.id}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 hover:border-teal-500/50 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                    <Building className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-white line-clamp-1">
                      {branch.name}
                    </h3>
                    <span className="text-[11px] text-teal-400 font-medium line-clamp-1">
                      {branch.landmarks}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-400 mt-4">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{branch.address}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-slate-500 shrink-0" />
                    <span>{branch.hours}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="font-semibold text-slate-200">
                      Landline: {branch.phone} {branch.mobile ? `| Mobile: ${branch.mobile}` : ""}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-medium flex items-center gap-1.5 line-clamp-1">
                  <ShieldCheck className="w-4 h-4 text-teal-400 shrink-0" />
                  {branch.parking}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Navigation & Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pt-12 border-t border-slate-800/80">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-teal-500 to-cyan-400 text-white flex items-center justify-center">
                <Sparkles className="w-5 h-5" />
              </div>
              <span className="font-black text-lg text-white tracking-tight">
                CDG DENTAL
              </span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cagayan de Oro&apos;s leading clinic for cosmetic smile makeovers, invisible clear aligners, laser gum therapy, and pain-free restorative medicine.
            </p>
            <p className="text-[11px] text-teal-400 font-medium">
              Maayong pag-abot sa CDG Dental Clinic!
            </p>
          </div>

          {/* Specialties */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Dental Specialties
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {CDO_SERVICES_DATA.map((srv) => (
                <li key={srv.id}>
                  <Link
                    href={`/services#${srv.id}`}
                    className="hover:text-teal-300 transition-colors"
                  >
                    {srv.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Clinical Team & Hours */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Specialist Doctors
            </h4>
            <ul className="space-y-2 text-xs text-slate-400">
              {dentistsList.slice(0, 5).map((d) => (
                <li key={d.id || d.name}>
                  <Link href="/dentists" className="hover:text-teal-300 transition-colors">
                    {d.name.split(",")[0]} {d.specialty ? `(${d.specialty.split("&")[0].trim()})` : ""}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick Access & Emergency */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-white mb-3">
              Emergency Dental Care
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed mb-3">
              Experiencing severe acute toothache, knocked-out tooth, or broken restoration in Cagayan de Oro?
            </p>
            <a
              href="tel:+63888501234"
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-bold hover:bg-teal-500/20 transition-colors"
            >
              <Phone className="w-3.5 h-3.5" />
              Call CDO Hotline: (088) 850-1234
            </a>
          </div>
        </div>

        {/* Bottom Legal */}
        <div className="mt-12 pt-6 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-400">
          <p>
            © {new Date().getFullYear()} CDG Dental Clinic Cagayan de Oro. All rights reserved.
          </p>
          <div className="flex items-center gap-4 flex-wrap">
            <span>PRC Accredited Dental Practice</span>
            <span>•</span>
            <span>{branchesList.map((b) => b.shortName || b.name).join(" • ")}</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
