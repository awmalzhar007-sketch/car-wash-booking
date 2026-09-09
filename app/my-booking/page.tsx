"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Phone,
  Ticket,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { CustomerBookingSummary } from "@/lib/types";
import { isValidEgyptianPhone, normalizeBookingCode } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type ViewState = "LOOKUP_INPUT" | "BOOKING_VIEW" | "CANCELLED_VIEW";

export default function MyBookingPage() {
  const { t, formatTime, formatPrice, tServiceName, dir, language } = useLanguage();
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  const [view, setView] = useState<ViewState>("LOOKUP_INPUT");
  const [bookingCode, setBookingCode] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active booking state
  const [booking, setBooking] = useState<CustomerBookingSummary | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  // Lookup Booking by Booking Code + Phone Number
  const handleLookupBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanCode = normalizeBookingCode(bookingCode);
    if (!cleanCode) {
      setError(
        language === "ar" ? "يرجى إدخال رقم الحجز (مثل CW-1024)" : "Please enter your Booking Code (e.g. CW-1024)"
      );
      return;
    }

    if (!isValidEgyptianPhone(phone)) {
      setError(
        language === "ar"
          ? "يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015"
          : "Please enter a valid Egyptian mobile number (11 digits, starting with 010, 011, 012, or 015)"
      );
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/customer/my-booking/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingCode: cleanCode,
          phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("my_booking_no_active"));
      }

      if (!data.booking) {
        setError(t("my_booking_no_active"));
        return;
      }

      setBooking(data.booking);
      setView("BOOKING_VIEW");
    } catch (err: any) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  // Cancel Booking
  const handleCancelBooking = async () => {
    if (!booking) return;

    try {
      setCancelling(true);
      setError(null);

      const res = await fetch("/api/customer/cancel-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingCode: booking.bookingNumber,
          bookingId: booking.id,
          phone: booking.customerPhone || phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || (language === "ar" ? "تعذر إلغاء الحجز" : "Failed to cancel booking"));
      }

      if (data.data) {
        setBooking(data.data);
      }
      setShowCancelModal(false);
      setView("CANCELLED_VIEW");
    } catch (err: any) {
      setError(err.message || (language === "ar" ? "فشلت عملية الإلغاء" : "Cancellation failed"));
    } finally {
      setCancelling(false);
    }
  };

  const handleResetSearch = () => {
    setBookingCode("");
    setPhone("");
    setBooking(null);
    setError(null);
    setView("LOOKUP_INPUT");
  };

  const getStatusLabel = (status: string) => {
    const key = `status_${status}` as any;
    return t(key, status);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-12">
      {/* Top Header */}
      <header className="w-full max-w-lg bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 gap-2">
        <div className="flex items-center gap-2">
          <Link
            href="/"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
          >
            <BackArrow className="w-4 h-4" />
          </Link>
          <h1 className="font-bold text-sm text-slate-900">{t("myBooking")}</h1>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="inline" />
          <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
            {t("today")}
          </span>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-lg px-4 pt-6">
        {error && (
          <div className="mb-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* STEP 1: LOOKUP INPUT (BOOKING CODE + PHONE) */}
        {view === "LOOKUP_INPUT" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4 animate-fade-in">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Calendar className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900">{t("my_booking_title")}</h2>
              <p className="text-xs text-slate-500 mt-1">
                {t("my_booking_subtitle")}
              </p>
            </div>

            <form onSubmit={handleLookupBooking} className="space-y-4 pt-2">
              {/* Booking Code Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("my_booking_code_label")}
                </label>
                <div className="relative">
                  <Ticket className={`w-4 h-4 text-slate-400 absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`} />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={t("my_booking_code_placeholder")}
                    value={bookingCode}
                    onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
                    className={`w-full py-2.5 text-sm font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                      dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                    }`}
                  />
                </div>
              </div>

              {/* Phone Number Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t("my_booking_enter_phone")}
                </label>
                <div className="relative">
                  <Phone className={`w-4 h-4 text-slate-400 absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`} />
                  <input
                    type="tel"
                    required
                    maxLength={11}
                    placeholder="01023525785"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                    className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                      dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                    }`}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-xs shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : t("my_booking_lookup_btn")}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: BOOKING DETAILS VIEW */}
        {view === "BOOKING_VIEW" && booking && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 animate-fade-in">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[11px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-0.5 rounded-full uppercase">
                  {booking.brandName}
                </span>
                <h2 className="text-xl font-black text-slate-900 mt-1">
                  {booking.bookingNumber}
                </h2>
              </div>
              <span
                className={`text-xs font-bold px-2.5 py-1 rounded-lg ${
                  booking.status === "CONFIRMED"
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : booking.status === "CANCELLED"
                    ? "bg-rose-50 text-rose-700 border border-rose-200"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {getStatusLabel(booking.status)}
              </span>
            </div>

            {/* Booking Details Card */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("fullName")}</span>
                <span className="font-semibold text-slate-900">{booking.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("phone")}</span>
                <span className="font-semibold text-slate-900" dir="ltr">{booking.customerPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_branch")}</span>
                <span className="font-semibold text-slate-900">{booking.branchName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_date")}</span>
                <span className="font-bold text-blue-700">{booking.displayDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_time")}</span>
                <span className="font-bold text-slate-900 text-sm">{formatTime(booking.startTime)}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_duration")}</span>
                <span className="font-semibold text-slate-700">
                  {booking.estimatedDuration} {t("mins")}
                </span>
              </div>
              {booking.services && booking.services.length > 0 && (
                <div className="py-1 border-b border-slate-200/60 space-y-1.5">
                  <span className="text-slate-500 block mb-1">{t("book_summary_services")}</span>
                  {booking.services.map((s) => (
                    <div key={s.id} className="flex justify-between items-center px-1">
                      <span className="text-slate-700">{tServiceName(s.name)}</span>
                      <span className="font-semibold text-slate-900">{formatPrice(s.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-slate-200/60">
                    <span className="font-bold text-slate-700">{t("book_summary_total")}</span>
                    <span className="font-extrabold text-blue-700">
                      {formatPrice(booking.totalPrice)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Cancel Action Button (only if CONFIRMED) */}
            {booking.status === "CONFIRMED" && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="w-full bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold py-3 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {t("my_booking_cancel_reservation")}
                </button>
              </div>
            )}

            {/* Search another booking */}
            <div className="pt-1">
              <button
                type="button"
                onClick={handleResetSearch}
                className="w-full text-center text-xs text-slate-500 hover:text-slate-800 transition-colors flex items-center justify-center gap-1 py-1"
              >
                <RotateCcw className="w-3 h-3" />
                {t("my_booking_back_search")}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CANCELLED CONFIRMATION VIEW */}
        {view === "CANCELLED_VIEW" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center space-y-4 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {t("my_booking_cancelled_success")}
              </h2>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                {language === "ar"
                  ? "تم إلغاء موعدك بنجاح وتحرير محطة الغسيل لتصبح متاحة لعملاء آخرين."
                  : "Your appointment has been cancelled and the slot has been released back to capacity."}
              </p>
            </div>

            {booking && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600">
                <span className="font-mono font-bold text-slate-900">{booking.bookingNumber}</span>
                <span className="mx-2">•</span>
                <span>{booking.branchName}</span>
                <span className="mx-2">•</span>
                <span>{formatTime(booking.startTime)}</span>
              </div>
            )}

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleResetSearch}
                className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 text-xs rounded-xl transition-all"
              >
                {t("my_booking_back_search")}
              </button>
              <Link
                href="/"
                className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 text-xs rounded-xl transition-all text-center"
              >
                {t("home")}
              </Link>
            </div>
          </div>
        )}

        {/* CANCEL CONFIRMATION MODAL */}
        {showCancelModal && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl space-y-4">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="text-center">
                <h3 className="text-base font-bold text-slate-900">
                  {t("my_booking_cancel_confirm_question")}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mt-1">
                  {t("my_booking_cancel_modal_desc")}
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCancelModal(false)}
                  disabled={cancelling}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 text-xs rounded-xl transition-colors"
                >
                  {t("my_booking_keep_btn")}
                </button>
                <button
                  type="button"
                  onClick={handleCancelBooking}
                  disabled={cancelling}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-bold py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  {cancelling ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    t("my_booking_confirm_cancel_btn")
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
