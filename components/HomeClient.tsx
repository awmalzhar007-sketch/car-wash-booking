"use client";

import Link from "next/link";
import {
  Calendar,
  Clock,
  ShieldCheck,
  UserCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  QrCode,
  Smartphone,
  Lock,
  MessageCircle,
  TrendingUp,
  CheckCircle2,
  Zap,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FoamLogo from "@/components/FoamLogo";

export default function HomeClient() {
  const { t, dir, language } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between relative overflow-hidden">
      {/* Ambient background glow effects */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-cyan-500/15 via-blue-600/10 to-transparent blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute bottom-1/3 -right-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 -left-48 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none -z-10"></div>

      <div className="max-w-6xl w-full mx-auto px-4 sm:px-8 py-6 flex-1 flex flex-col justify-between">
        {/* Navigation Bar */}
        <header className="py-4 flex items-center justify-between border-b border-slate-800/80 gap-3 flex-wrap">
          <FoamLogo size="md" showTagline={true} href="/" />

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="inline" />
            <Link
              href="/my-booking"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/50 hover:bg-cyan-900/50 border border-cyan-800/60 px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 backdrop-blur-sm"
            >
              <Calendar className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === "ar" ? "تتبع حجزي" : "My Booking"}</span>
            </Link>
            <Link
              href="/staff/login"
              className="text-xs font-bold text-slate-900 bg-white hover:bg-slate-100 px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-md shadow-white/5"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "دخول الموظفين" : "Staff Login"}</span>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="my-12 sm:my-16 text-center space-y-6 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-900/90 border border-cyan-500/30 text-cyan-400 text-xs font-bold px-4 py-1.5 rounded-full shadow-lg shadow-cyan-500/10 backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>
              {language === "ar"
                ? "المنظومة الذكية لحجوزات وإدارة مغاسل السيارات"
                : "Next-Gen Smart Car Wash Management Platform"}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-6xl font-black tracking-tight leading-[1.15]">
            {language === "ar" ? (
              <>
                ودّع طوابير الانتظار... <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  حوّل مغسلتك لنظام حجز ذكي
                </span>
              </>
            ) : (
              <>
                Say Goodbye to Waiting Lines... <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
                  Automate Your Wash with FOAM
                </span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-slate-400 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {language === "ar"
              ? "منصة سحابية متطورة تُمكن عملاءك من حجز دورهم في ثوانٍ عبر مسح كود الـ QR، مع تنظيم دقيق لخطوط ومحطات الغسيل بتوقيت القاهرة اللحظي."
              : "An all-in-one platform allowing customers to reserve slots via QR code in seconds, with automated real-time slot scheduling and multi-bay coordination."}
          </p>

          {/* Value Stats Pills */}
          <div className="py-2 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs text-slate-300 font-semibold">
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              <span>{language === "ar" ? "حجز فوري في 30 ثانية" : "30s Instant Booking"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === "ar" ? "0% تضارب في المواعيد" : "Zero Slot Conflicts"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              <span>{language === "ar" ? "خصوصية وعزل كامل" : "100% Isolated Tenancy"}</span>
            </div>
          </div>

          {/* Hero Actions */}
          <div className="pt-4 flex items-center justify-center gap-3.5 flex-wrap">
            <Link
              href="/my-booking"
              className="px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-2xl shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Calendar className="w-4 h-4 text-slate-950" />
              <span>{language === "ar" ? "تتبع موعدك بكود الحجز" : "Track My Booking"}</span>
              <ArrowIcon className="w-4 h-4 text-slate-950" />
            </Link>

            <Link
              href="/staff/login"
              className="px-6 py-3.5 bg-slate-900 hover:bg-slate-850 text-white font-bold text-xs sm:text-sm rounded-2xl border border-slate-800 hover:border-slate-700 transition-all flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>{language === "ar" ? "دخول موظفي الفروع" : "Staff Portal"}</span>
            </Link>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="my-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl backdrop-blur-sm space-y-2.5 hover:border-cyan-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-800/50 text-cyan-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">
              {language === "ar" ? "كود QR خاص لكل مغسلة" : "Dedicated Branch QR"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === "ar"
                ? "رمز QR جاهز للطباعة والاستخدام، العميل يمسحه ويحجز دور موعده في ثوانٍ بدون تطبيق."
                : "Print-ready QR codes for counters. Customers scan and book instantly without installing an app."}
            </p>
          </div>

          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl backdrop-blur-sm space-y-2.5 hover:border-blue-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-950/60 border border-blue-800/50 text-blue-400 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">
              {language === "ar" ? "إغلاق المواعيد المنتهية فوراً" : "Real-time Slot Engine"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === "ar"
                ? "محرك زمني ذكي بتوقيت مصر يغلق المواعيد الفائتة لحظة بلحظة ويمنع حجز نفس المحطة مرتين."
                : "Strict server-time tracking that automatically closes passed slots and prevents concurrent race conditions."}
            </p>
          </div>

          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl backdrop-blur-sm space-y-2.5 hover:border-emerald-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-800/50 text-emerald-400 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">
              {language === "ar" ? "لوحة تحكم مرنة للموظف" : "Staff Walk-in & Schedule"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === "ar"
                ? "متابعة أرتال السيارات خطوة بخطوة، مع إمكانية إدخال سيارات الـ Walk-in والتحكم في الخدمات."
                : "Live timeline of washing bays with rapid one-click walk-in entry and on-the-fly pricing edits."}
            </p>
          </div>

          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl backdrop-blur-sm space-y-2.5 hover:border-purple-500/30 transition-all">
            <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-800/50 text-purple-400 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-white text-sm">
              {language === "ar" ? "خصوصية وعزل كامل" : "Isolated Multi-Tenancy"}
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              {language === "ar"
                ? "كل مغسلة تعمل في مساحة منعزلة ومحمية تماماً، دون إظهار أي بيانات تجارية للعامة."
                : "Each client car wash is isolated behind encrypted access without public directory leaks."}
            </p>
          </div>
        </section>

        {/* Portals Access Section */}
        <section className="mt-8 pt-8 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Portal */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between gap-4 hover:border-cyan-500/40 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/50 text-cyan-400 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {language === "ar" ? "بوابة العملاء" : "Customer Portal"}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {language === "ar"
                    ? "معاك كود حجز؟ استعلم عن موعدك أو ألغِ الحجز في أي وقت."
                    : "Lookup your reservation or cancel your spot anytime with your code."}
                </p>
              </div>
            </div>
            <Link
              href="/my-booking"
              className="w-full text-center py-2.5 px-3 rounded-xl bg-cyan-950/80 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{language === "ar" ? "الاستعلام عن حجز" : "Track Booking"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Staff Portal */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between gap-4 hover:border-slate-600 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {language === "ar" ? "بوابة طاقم الفرع" : "Branch Staff Portal"}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {language === "ar"
                    ? "تسجيل دخول موظفي المغاسل لإدارة المحطات وتحديث الحالات."
                    : "Staff entry to monitor washing queues and update car statuses."}
                </p>
              </div>
            </div>
            <Link
              href="/staff/login"
              className="w-full text-center py-2.5 px-3 rounded-xl bg-white hover:bg-slate-200 text-slate-950 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-white/5"
            >
              <span>{language === "ar" ? "دخول موظفي الفروع" : "Staff Sign In"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Admin Portal */}
          <div className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 flex flex-col justify-between gap-4 hover:border-blue-500/40 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-950/80 border border-blue-800/50 text-blue-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">
                  {language === "ar" ? "لوحة تحكم الإدارة" : "Super Admin Center"}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  {language === "ar"
                    ? "إدارة المغاسل، الفروع، المحطات، وتوليد رموز الـ QR."
                    : "System administration for brands, branches, bays, and QR setups."}
                </p>
              </div>
            </div>
            <Link
              href="/admin/login"
              className="w-full text-center py-2.5 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
            >
              <span>{language === "ar" ? "دخول المسؤول" : "Admin Sign In"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 pt-6 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <FoamLogo size="sm" showText={true} />
            <span className="text-slate-600">|</span>
            <span>{language === "ar" ? "جميع الحقوق محفوظة © 2026" : "All rights reserved © 2026"}</span>
          </div>

          <p className="text-[11px] text-slate-600">
            {language === "ar"
              ? "منظومة سحابية متطورة لحجوزات وإدارة مغاسل السيارات"
              : "Cloud-native car wash booking & queue management"}
          </p>
        </footer>
      </div>
    </div>
  );
}

