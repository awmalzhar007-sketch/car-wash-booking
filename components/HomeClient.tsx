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
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between">
      <div className="max-w-5xl w-full mx-auto px-4 sm:px-8 py-6 flex-1 flex flex-col justify-between">
        {/* Navigation Bar */}
        <header className="py-4 flex items-center justify-between border-b border-slate-200 gap-3 flex-wrap">
          <FoamLogo size="md" showTagline={true} href="/" />

          <div className="flex items-center gap-2 sm:gap-3">
            <LanguageSwitcher variant="inline" />
            <Link
              href="/my-booking"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "تتبع حجزي" : "My Booking"}</span>
            </Link>
            <Link
              href="/staff/login"
              className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>{language === "ar" ? "دخول الموظفين" : "Staff"}</span>
            </Link>
          </div>
        </header>

        {/* Hero Section */}
        <section className="my-10 sm:my-14 text-center space-y-5 max-w-3xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold px-4 py-1.5 rounded-full shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            <span>
              {language === "ar"
                ? "منظومة فوم الذكية لحجوزات وإدارة مغاسل السيارات"
                : "FOAM Smart Car Wash Management Platform"}
            </span>
          </div>

          {/* Main Title */}
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
            {language === "ar" ? (
              <>
                ودّع طوابير الانتظار... <br />
                <span className="text-blue-600">
                  حوّل مغسلتك لنظام حجز ذكي مع FOAM
                </span>
              </>
            ) : (
              <>
                Say Goodbye to Waiting Lines... <br />
                <span className="text-blue-600">
                  Upgrade to Smart Car Wash Booking
                </span>
              </>
            )}
          </h1>

          {/* Subtitle */}
          <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
            {language === "ar"
              ? "حل سحابي متكامل يتيح للعملاء حجز دورهم بدقة عبر مسح رمز الـ QR مباشرة، مع تنظيم فوري لخطوط ومحطات الغسيل للموظفين بتوقيت القاهرة اللحظي."
              : "An all-in-one cloud platform enabling customers to book wash slots via QR codes in seconds, with real-time staff schedules and bay slot automation."}
          </p>

          {/* Value Stats Pills */}
          <div className="py-2 flex items-center justify-center gap-3 sm:gap-6 flex-wrap text-xs text-slate-600 font-semibold">
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              <span>{language === "ar" ? "حجز فوري في 30 ثانية" : "30s Instant Booking"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>{language === "ar" ? "0% تضارب في المواعيد" : "Zero Slot Conflicts"}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-sm">
              <Lock className="w-3.5 h-3.5 text-indigo-600" />
              <span>{language === "ar" ? "خصوصية وعزل كامل" : "100% Isolated Tenancy"}</span>
            </div>
          </div>

          {/* Hero CTAs */}
          <div className="pt-3 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/my-booking"
              className="px-6 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-lg shadow-blue-500/25 flex items-center gap-2 transition-all transform hover:-translate-y-0.5"
            >
              <Calendar className="w-4 h-4" />
              <span>{language === "ar" ? "تتبع موعد غسيلك (كود الحجز)" : "Lookup Booking (By Code)"}</span>
              <ArrowIcon className="w-4 h-4" />
            </Link>

            <Link
              href="/staff/login"
              className="px-6 py-3.5 bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 shadow-sm transition-all flex items-center gap-2"
            >
              <UserCheck className="w-4 h-4 text-slate-600" />
              <span>{language === "ar" ? "بوابة طاقم العمل" : "Staff Sign In"}</span>
            </Link>
          </div>
        </section>

        {/* Feature Cards Grid */}
        <section className="my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 hover:border-blue-400 transition-all">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === "ar" ? "حجز فوري بالـ QR" : "Instant QR Booking"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === "ar"
                ? "رمز QR مخصص لكل مغسلة وفرع، العميل يمسحه ويختار موعده في 30 ثانية بدون تحميل تطبيق."
                : "Print-ready QR codes for counters. Customers scan and book in 30 seconds without installing an app."}
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 hover:border-blue-400 transition-all">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === "ar" ? "إغلاق المواعيد آلياً" : "Real-time Slot Locks"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === "ar"
                ? "حساب دقيق بتوقيت القاهرة يغلق المواعيد الفائتة فوراً ويمنع حجز نفس المحطة مرتين."
                : "Synchronized server time that automatically closes passed slots and serializes bookings to prevent overlaps."}
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 hover:border-blue-400 transition-all">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Smartphone className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === "ar" ? "لوحة تحكم للموظفين" : "Staff Command Center"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === "ar"
                ? "متابعة خط الغسيل لحظياً، وإمكانية تسجيل العملاء الواصلين بدون حجز (Walk-in) بسهولة."
                : "Track incoming cars live on an intuitive timeline, update statuses, and log walk-ins effortlessly."}
            </p>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3 hover:border-blue-400 transition-all">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Lock className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {language === "ar" ? "عزل وخصوصية كاملة" : "Complete Privacy"}
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              {language === "ar"
                ? "كل مغسلة وفرع يعمل بحساب ونظام مستقل ومحمي تماماً، دون إظهار أي بيانات للعامة."
                : "Isolated data tenancy per branch. No public directory leaks customer or business information."}
            </p>
          </div>
        </section>

        {/* Quick Portals Navigation */}
        <section className="mt-8 pt-8 border-t border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Customer Portal */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between gap-4 shadow-sm hover:border-blue-300 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {language === "ar" ? "بوابة العملاء" : "Customer Portal"}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {language === "ar"
                    ? "معاك كود حجز؟ استعلم عن موعدك أو ألغِ الحجز في أي وقت."
                    : "Have a booking code? Lookup or cancel your appointment easily."}
                </p>
              </div>
            </div>
            <Link
              href="/my-booking"
              className="w-full text-center py-2.5 px-3 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5"
            >
              <span>{language === "ar" ? "الاستعلام عن حجز" : "Track My Booking"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Staff Portal */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between gap-4 shadow-sm hover:border-slate-400 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {language === "ar" ? "بوابة طاقم الفرع" : "Branch Staff Portal"}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {language === "ar"
                    ? "تسجيل دخول موظفي المغاسل لإدارة المحطات وتحديث الحالات."
                    : "Staff login to manage wash bays, timelines, and customer check-ins."}
                </p>
              </div>
            </div>
            <Link
              href="/staff/login"
              className="w-full text-center py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{language === "ar" ? "تسجيل دخول الموظف" : "Staff Sign In"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>

          {/* Admin Portal */}
          <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between gap-4 shadow-sm hover:border-blue-400 transition-all">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {language === "ar" ? "لوحة تحكم المسؤول" : "Admin Dashboard"}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  {language === "ar"
                    ? "إدارة العلامات التجارية، الفروع، المحطات، وتوليد رموز الـ QR."
                    : "System management for brands, branches, bays, and QR configurations."}
                </p>
              </div>
            </div>
            <Link
              href="/admin/login"
              className="w-full text-center py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>{language === "ar" ? "دخول الإدارة" : "Admin Sign In"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 py-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <FoamLogo size="sm" showText={true} />
            <span className="text-slate-300">|</span>
            <span>{language === "ar" ? "جميع الحقوق محفوظة © 2026" : "All rights reserved © 2026"}</span>
          </div>
          <p className="text-[11px] text-slate-400">
            {language === "ar"
              ? "منظومة سحابية متطورة لإدارة وحجوزات مغاسل السيارات"
              : "Smart Cloud Platform for Car Wash Bookings"}
          </p>
        </footer>
      </div>
    </div>
  );
}


