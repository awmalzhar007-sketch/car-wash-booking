"use client";

import Link from "next/link";
import { QrCode, Calendar, Clock, ShieldCheck, UserCheck, Sparkles, ArrowRight, ArrowLeft } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

interface BranchItem {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  qrIdentifier: string;
  openTime: string;
  closeTime: string;
  brand: {
    name: string;
  };
  washBays: any[];
}

export default function HomeClient({ branches }: { branches: BranchItem[] }) {
  const { t, formatTime, dir } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <header className="py-6 flex items-center justify-between border-b border-slate-200 gap-2 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-lg shadow-md shadow-blue-500/20">
            CW
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-900 tracking-tight">{t("appName")}</h1>
            <p className="text-xs text-slate-500">{t("appTagline")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="inline" />
          <Link
            href="/my-booking"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            {t("myBooking")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <div className="my-10 text-center space-y-4">
        <div className="inline-flex items-center gap-2 bg-blue-100/80 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">
          <Sparkles className="w-3.5 h-3.5" />
          {t("hero_badge")}
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {t("hero_title_1")} <br className="hidden sm:inline" />
          {t("hero_title_2")}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
          {t("hero_desc")}
        </p>
      </div>

      {/* Customer Branch QR Portals */}
      <div className="space-y-4 my-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
            <QrCode className="w-4 h-4 text-blue-600" />
            {t("branches_title")} ({branches.length} {t("branches_active_count")})
          </div>
          <span className="text-[11px] text-slate-400">{t("branches_dynamic_update")}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {branches.map((branch) => (
            <Link
              key={branch.id}
              href={`/book/${branch.qrIdentifier}`}
              className="group block p-5 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-400 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <span className="inline-block px-2 py-0.5 text-[11px] font-semibold bg-emerald-100 text-emerald-800 rounded-md mb-2">
                    {branch.brand.name} • {t("branch_open_today")}
                  </span>
                  <h3 className="font-bold text-slate-900 text-lg group-hover:text-blue-600 transition-colors">
                    {branch.name}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">{branch.address || t("branch_location")}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors">
                  <ArrowIcon className="w-5 h-5" />
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatTime(branch.openTime)} - {formatTime(branch.closeTime)}
                </span>
                <span className="font-medium text-blue-600">
                  {branch.washBays.length} {t("branch_bays_capacity")}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Staff & Admin Access */}
      <div className="mt-8 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-xl bg-slate-100/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
              <UserCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">{t("staff_portal_title")}</p>
              <p className="text-[11px] text-slate-500">{t("staff_portal_desc")}</p>
            </div>
          </div>
          <Link
            href="/staff/login"
            className="text-xs font-semibold bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
          >
            {t("staff_login_btn")}
          </Link>
        </div>

        <div className="p-4 rounded-xl bg-slate-100/70 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-900">{t("admin_center_title")}</p>
              <p className="text-[11px] text-slate-500">{t("admin_center_desc")}</p>
            </div>
          </div>
          <Link
            href="/admin/login"
            className="text-xs font-semibold bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shrink-0"
          >
            {t("admin_login_btn")}
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="mt-12 text-center text-xs text-slate-400 py-4">
        {t("footer_text")}
      </footer>
    </main>
  );
}
