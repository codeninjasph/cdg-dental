"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  Calendar,
  ShieldCheck,
  GraduationCap,
  Award,
  Clock,
  MapPin,
  Building,
  CheckCircle2,
  ArrowRight,
  Phone,
} from "lucide-react";
import { CDO_DENTISTS_DATA } from "@/lib/cdo-clinic-data";
import { PublicBookingModal } from "@/components/public/public-booking-modal";

export default function DentistsPage() {
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedDentistForModal, setSelectedDentistForModal] = useState<string | undefined>();

  const handleBookWithDoctor = (dentistId: string) => {
    setSelectedDentistForModal(dentistId);
    setIsBookingModalOpen(true);
  };

  return (
    <div className="flex flex-col min-h-screen bg-white dark:bg-slate-950">
      {/* Page Header */}
      <section className="bg-gradient-to-b from-teal-50/70 via-white to-white dark:from-slate-900 dark:via-slate-950 dark:to-slate-950 pt-12 pb-16 border-b border-slate-100 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
          <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/80 border border-teal-200 dark:border-teal-800 px-3.5 py-1 rounded-full inline-block">
            Our Attending Specialists in CDO
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 dark:text-white tracking-tight">
            Meet the CDG Dental Doctors
          </h1>
          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Our multi-disciplinary team brings together board-certified cosmetic surgeons, orthodontists, periodontists, and gentle general practitioners serving Northern Mindanao.
          </p>
        </div>
      </section>

      {/* Dentists Directory */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-16">
          {CDO_DENTISTS_DATA.map((doctor, index) => (
            <div
              key={doctor.id}
              className="bg-slate-50/60 dark:bg-slate-900/50 rounded-3xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm hover:shadow-xl hover:border-teal-500/40 transition-all p-6 sm:p-8"
            >
              <div className="grid lg:grid-cols-12 gap-8 items-center">
                {/* Doctor Photo Column */}
                <div className="lg:col-span-4 flex flex-col items-center text-center">
                  <div className="relative w-56 h-72 sm:w-64 sm:h-80 rounded-2xl overflow-hidden shadow-xl border-4 border-white dark:border-slate-800 group">
                    <img
                      src={doctor.photoUrl}
                      alt={doctor.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />
                    <div className="absolute bottom-3 left-3 right-3 text-left">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-teal-300 bg-teal-950/80 px-2 py-0.5 rounded border border-teal-800/80">
                        PRC Lic: {doctor.prcLicense}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs font-semibold text-slate-500">
                    <Award className="w-4 h-4 text-teal-600" />
                    <span>{doctor.experienceYears} Years Clinical Experience</span>
                  </div>
                </div>

                {/* Doctor Details Column */}
                <div className="lg:col-span-8 space-y-5">
                  <div className="space-y-1">
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-400">
                      {doctor.specialty}
                    </span>
                    <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                      {doctor.name}
                    </h2>
                    <p className="text-xs sm:text-sm font-semibold text-slate-600 dark:text-slate-300">
                      {doctor.title}
                    </p>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {doctor.bio}
                  </p>

                  {/* Credentials & Education */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-200/80 dark:border-slate-800 text-xs">
                    <div className="flex items-start gap-2 text-slate-700 dark:text-slate-300">
                      <GraduationCap className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold">Education: </span>
                        <span>{doctor.education}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="font-bold text-slate-700 dark:text-slate-300 block">
                        Affiliations & Certifications:
                      </span>
                      {doctor.certifications.map((cert, cIdx) => (
                        <div
                          key={cIdx}
                          className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-400 pl-2"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 shrink-0" />
                          <span>{cert}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Clinic Schedules in CDO */}
                  <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Cagayan de Oro Clinic Hours
                    </span>
                    <div className="grid sm:grid-cols-2 gap-3">
                      {doctor.cdoClinicDays.map((sched, sIdx) => (
                        <div key={sIdx} className="space-y-0.5 text-xs">
                          <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-teal-600" />
                            {sched.branchName}
                          </span>
                          <span className="text-[11px] text-slate-500 block">
                            {sched.days} • {sched.hours}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Booking CTA Button */}
                  <div className="pt-2 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => handleBookWithDoctor(doctor.id)}
                      className="px-6 py-3 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white font-bold text-xs shadow-md shadow-teal-500/25 transition-all flex items-center gap-2"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Book Appointment with {doctor.name.split(",")[0]}</span>
                    </button>
                    <span className="text-[11px] text-slate-500">
                      Zero double-booking guarantee
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Global Booking Modal */}
      <PublicBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialDentistId={selectedDentistForModal}
      />
    </div>
  );
}
