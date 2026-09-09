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
  Zap,
  CheckCircle2,
  Lock,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function HomeClient() {
  const { t, dir, language } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <main className="min-h-screen flex flex-col justify-between p-4 sm:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <header className="py-5 flex items-center justify-between border-b border-slate-200/80 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-md shadow-blue-500/20">
            CW
          </div>
          <div>
            <h1 className="font-extrabold text-base sm:text-lg text-slate-900 tracking-tight">
              {language === "ar" ? "منصة كلين كار ووش" : "Clean Car Wash Platform"}
            </h1>
            <p className="text-xs text-slate-500">
              {language === "ar"
                ? "المنظومة الذكية لحجوزات وإدارة مغاسل السيارات"
                : "Smart Car Wash Booking & Fleet System"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <LanguageSwitcher variant="inline" />
          <Link
            href="/my-booking"
            className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>{t("myBooking")}</span>
          </Link>
          <Link
            href="/staff/login"
            className="text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 px-3.5 py-2 rounded-xl transition-colors flex items-center gap-1.5 shadow-sm"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{language === "ar" ? "دخول الموظفين" : "Staff"}</span>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="my-10 sm:my-14 text-center space-y-5 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200/60 text-blue-700 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>
            {language === "ar"
              ? "نظام الحجز الفوري بدون انتظار لمغاسل السيارات"
              : "Next-Gen Instant Car Wash Booking System"}
          </span>
        </div>

        <h2 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          {language === "ar" ? (
            <>
              ودّع طوابير الانتظار... <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                حوّل مغسلتك لنظام حجز ذكي
              </span>
            </>
          ) : (
            <>
              Say Goodbye to Queues... <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Upgrade to Smart QR Booking
              </span>
            </>
          )}
        </h2>

        <p className="text-slate-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
          {language === "ar"
            ? "حل رقمي متكامل يتيح للعملاء حجز دورهم بدقة عبر مسح رمز الـ QR مباشرة، مع لوحة تحكم فورية للموظفين لمنع التكدس وتنظيم المواعيد بالدقيقة."
            : "An all-in-one cloud platform enabling customers to book wash slots via QR codes in seconds, with real-time staff schedules and slot automation."}
        </p>

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
            className="px-6 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs sm:text-sm rounded-2xl border border-slate-200 transition-all flex items-center gap-2"
          >
            <UserCheck className="w-4 h-4 text-slate-600" />
            <span>{language === "ar" ? "بوابة طاقم العمل" : "Staff Sign In"}</span>
          </Link>
        </div>
      </section>

      {/* Feature Grid */}
      <section className="my-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Feature 1 */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">
            {language === "ar" ? "حجز فوري بالـ QR" : "Instant QR Booking"}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === "ar"
              ? "العميل يمسح الكود بكاميرا الهاتف ويختار موعده في 30 ثانية بدون الحاجة لتثبيت أي تطبيق."
              : "Customers simply scan the branch QR code and reserve their slot in 30 seconds with no app install."}
          </p>
        </div>

        {/* Feature 2 */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <h3 className="font-bold text-slate-900 text-sm">
            {language === "ar" ? "إغلاق المواعيد آلياً" : "Real-time Slot Locks"}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {language === "ar"
              ? "حساب دقيق بتوقيت القاهرة يغلق المواعيد التي انتهى وقتها فوراً ويمنع حجز نفس المحطة مرتين."
              : "Synchronized server time that automatically closes passed slots and serializes bookings to prevent overlaps."}
          </p>
        </div>

        {/* Feature 3 */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
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

        {/* Feature 4 */}
        <div className="p-5 bg-white border border-slate-200/90 rounded-2xl shadow-sm space-y-3">
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
        <div className="p-5 rounded-2xl bg-white border border-slate-200 flex flex-col justify-between gap-4 shadow-sm hover:border-indigo-300 transition-all">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
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
            className="w-full text-center py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span>{language === "ar" ? "دخول الإدارة" : "Admin Sign In"}</span>
            <ArrowIcon className="w-3.5 h-3.5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-14 text-center text-xs text-slate-400 py-6 border-t border-slate-100 space-y-1">
        <p className="font-medium text-slate-500">
          {language === "ar"
            ? "منصة كلين كار ووش السحابية © 2026. جميع الحقوق محفوظة."
            : "Clean Car Wash Cloud Platform © 2026. All rights reserved."}
        </p>
        <p className="text-[11px] text-slate-400">
          {language === "ar"
            ? "نظام حجز إلكتروني آمن ومشفر لإدارة مغاسل السيارات"
            : "Encrypted, real-time car wash management & appointment software"}
        </p>
      </footer>
    </main>
  );
}

