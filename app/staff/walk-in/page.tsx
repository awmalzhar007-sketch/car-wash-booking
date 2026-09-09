"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Phone,
  User,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Car,
  LayoutGrid,
} from "lucide-react";
import { TimeSlot, StaffBookingDetail, ServiceItem } from "@/lib/types";
import { isValidEgyptianPhone, parseTimeToMinutes, getCairoCurrentMinutes } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";

type WalkInStep = "DETAILS" | "SUMMARY" | "CONFIRMED";

export default function StaffWalkInBookingPage() {
  const router = useRouter();
  const { t, formatPrice, formatTime, dir, language, tServiceName, tServiceDesc } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;
  const BackArrow = dir === "rtl" ? ArrowRight : ArrowLeft;

  // Branch / staff session data
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [branchInfo, setBranchInfo] = useState<any>(null);
  const [bays, setBays] = useState<any[]>([]);

  // Availability data
  const [branchData, setBranchData] = useState<any>(null);

  // Real-time server offset and current Cairo minutes
  const [serverOffsetMs, setServerOffsetMs] = useState<number>(0);
  const [currentCairoMin, setCurrentCairoMin] = useState<number>(() => getCairoCurrentMinutes(new Date()));

  // Form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);
  const [showOtherTimes, setShowOtherTimes] = useState(true);
  const [bayId, setBayId] = useState<string>(""); // "" = auto-assign
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  // Flow state
  const [step, setStep] = useState<WalkInStep>("DETAILS");
  const [submitting, setSubmitting] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<StaffBookingDetail | null>(null);

  // 1-second ticker keeping currentCairoMin precisely aligned with Egypt server time
  useEffect(() => {
    const tick = () => {
      const serverDate = new Date(Date.now() + serverOffsetMs);
      const cairoMin = getCairoCurrentMinutes(serverDate);
      setCurrentCairoMin(cairoMin);
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [serverOffsetMs]);

  const loadAvailability = async (
    qrIdentifier: string,
    serviceIds?: string[],
    targetBayId?: string,
    isInitial = false
  ) => {
    try {
      if (isInitial || !branchData) {
        setLoading(true);
      }
      setError(null);
      const params = new URLSearchParams();
      if (serviceIds && serviceIds.length > 0) {
        params.append("serviceIds", serviceIds.join(","));
      }
      if (targetBayId) {
        params.append("bayId", targetBayId);
      }
      const query = params.toString() ? `?${params.toString()}` : "";
      const res = await fetch(`/api/customer/branch/${qrIdentifier}${query}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || t("somethingWentWrong"));
      }

      setBranchData(data.data);
      if (data.data.serverTimestamp) {
        setServerOffsetMs(data.data.serverTimestamp - Date.now());
      }

      const serverDate = new Date(Date.now() + (data.data.serverTimestamp ? data.data.serverTimestamp - Date.now() : 0));
      const cairoMin = getCairoCurrentMinutes(serverDate);

      setSelectedSlot((prevSlot) => {
        if (prevSlot) {
          const stillThere = data.data.slots?.find(
            (s: TimeSlot) => s.time === prevSlot.time && s.available && !s.isPassed && parseTimeToMinutes(s.time) >= cairoMin
          );
          if (stillThere) return stillThere;
        }
        if (data.data.nearestAvailableSlot && parseTimeToMinutes(data.data.nearestAvailableSlot.time) >= cairoMin) {
          return data.data.nearestAvailableSlot;
        }
        const firstAvailable = data.data.slots?.find(
          (s: TimeSlot) => s.available && !s.isPassed && parseTimeToMinutes(s.time) >= cairoMin
        );
        return firstAvailable || null;
      });
    } catch (err: any) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  const bootstrap = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if qr is provided in query params for instant parallel fetch
      let qrParam: string | null = null;
      if (typeof window !== "undefined") {
        const urlParams = new URLSearchParams(window.location.search);
        qrParam = urlParams.get("qr");
      }

      if (qrParam) {
        // Run both requests concurrently in parallel for 2x faster load
        const [scheduleRes, availRes] = await Promise.all([
          fetch("/api/staff/schedule"),
          fetch(`/api/customer/branch/${qrParam}`),
        ]);

        const scheduleJson = await scheduleRes.json();
        const availJson = await availRes.json();

        if (!scheduleRes.ok) {
          if (scheduleRes.status === 401) {
            router.push("/staff/login");
            return;
          }
          throw new Error(scheduleJson.error || t("somethingWentWrong"));
        }

        setBranchInfo(scheduleJson.branch);
        setBays(scheduleJson.bays || []);

        if (availRes.ok && availJson?.data) {
          setBranchData(availJson.data);
          if (availJson.data.serverTimestamp) {
            setServerOffsetMs(availJson.data.serverTimestamp - Date.now());
          }
          const serverDate = new Date(Date.now() + (availJson.data.serverTimestamp ? availJson.data.serverTimestamp - Date.now() : 0));
          const cairoMin = getCairoCurrentMinutes(serverDate);
          if (availJson.data.nearestAvailableSlot && parseTimeToMinutes(availJson.data.nearestAvailableSlot.time) >= cairoMin) {
            setSelectedSlot(availJson.data.nearestAvailableSlot);
          } else {
            const firstAvailable = availJson.data.slots?.find(
              (s: TimeSlot) => s.available && !s.isPassed && parseTimeToMinutes(s.time) >= cairoMin
            );
            setSelectedSlot(firstAvailable || null);
          }
        }
      } else {
        const res = await fetch("/api/staff/schedule");
        const json = await res.json();

        if (!res.ok) {
          if (res.status === 401) {
            router.push("/staff/login");
            return;
          }
          throw new Error(json.error || t("somethingWentWrong"));
        }

        setBranchInfo(json.branch);
        setBays(json.bays || []);
        await loadAvailability(json.branch.qrIdentifier, undefined, undefined, true);
      }
    } catch (err: any) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isFirstRender = useRef(true);
  useEffect(() => {
    if (!branchInfo?.qrIdentifier) return;
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    // Update availability seamlessly without blocking UI or showing full-screen loader
    loadAvailability(branchInfo.qrIdentifier, selectedServiceIds, bayId || undefined, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedServiceIds, bayId]);

  const toggleService = (serviceId: string) => {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const availableServices: ServiceItem[] = branchData?.services || [];
  const selectedServices = availableServices.filter((s) => selectedServiceIds.includes(s.id));
  const servicesTotalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);
  const selectedBay = bays.find((b) => b.id === bayId);

  const resetForm = () => {
    setName("");
    setPhone("");
    setBayId("");
    setSelectedServiceIds([]);
    setConfirmedBooking(null);
    setError(null);
    setStep("DETAILS");
    if (branchInfo?.qrIdentifier) {
      loadAvailability(branchInfo.qrIdentifier);
    }
  };

  // Proceed to Summary
  const handleProceedToSummary = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      alert(language === "ar" ? "يرجى إدخال اسم كامل صحيح" : "Please enter a valid full name");
      return;
    }
    if (!isValidEgyptianPhone(phone)) {
      alert(
        language === "ar"
          ? "يرجى إدخال رقم موبايل مصري صحيح مكون من 11 رقم ويبدأ بـ 010 أو 011 أو 012 أو 015"
          : "Please enter a valid Egyptian mobile number (11 digits, starting with 010, 011, 012, or 015)"
      );
      return;
    }
    if (!selectedSlot) {
      alert(language === "ar" ? "يرجى اختيار موعد الحجز" : "Please select a time slot");
      return;
    }
    setStep("SUMMARY");
  };

  // Confirm Walk-in Booking
  const handleConfirmWalkIn = async () => {
    try {
      setSubmitting(true);
      setError(null);

      const res = await fetch("/api/staff/walk-in-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          customerPhone: phone,
          selectedServiceIds,
          bayId: bayId || undefined,
          startTime: selectedSlot?.time,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || (language === "ar" ? "فشل إنشاء الحجز المباشر" : "Failed to create walk-in booking"));
      }

      setConfirmedBooking(json.booking);
      setStep("CONFIRMED");
    } catch (err: any) {
      setError(err.message || (language === "ar" ? "فشل إنشاء الحجز المباشر" : "Failed to create walk-in booking"));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !branchData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-600 font-medium text-sm">{t("loading")}</p>
      </div>
    );
  }

  if (error && !branchData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50 text-center">
        <div className="w-14 h-14 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-2">
          {language === "ar" ? "الفرع غير متاح" : "Branch Unavailable"}
        </h2>
        <p className="text-slate-600 text-sm max-w-md mb-6">{error}</p>
        <Link
          href="/staff/dashboard"
          className="bg-slate-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-800 transition-colors"
        >
          {language === "ar" ? "العودة للوحة الموظف" : "Back to Dashboard"}
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center pb-12">
      {/* Mobile Top App Bar */}
      <header className="w-full max-w-lg bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between sticky top-0 z-20 gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
            CW
          </div>
          <div>
            <h1 className="font-bold text-sm text-slate-900 leading-tight flex items-center gap-1.5">
              {branchInfo?.brandName}
              <span className="text-[10px] font-semibold bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded">
                {language === "ar" ? "موظف" : "Staff"}
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">{branchInfo?.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <LanguageSwitcher variant="inline" />
          <Link
            href="/staff/dashboard"
            className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md hover:bg-blue-100 transition-colors flex items-center gap-1 shrink-0"
          >
            <BackArrow className="w-3.5 h-3.5" />
            {language === "ar" ? "اللوحة" : "Dashboard"}
          </Link>
        </div>
      </header>

      {/* Main Form Container */}
      <main className="w-full max-w-lg px-4 pt-4">
        {/* Branch Closed Notice (if applicable) */}
        {branchData?.isClosedNow && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-amber-800 text-xs">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">
                {language === "ar" ? "الفرع مغلق حالياً." : "Branch is currently closed."}
              </span>
              <p className="mt-0.5">
                {t("book_open_hours")} {formatTime(branchData.openTime)} - {formatTime(branchData.closeTime)}.
              </p>
            </div>
          </div>
        )}

        {/* Global Error Banner */}
        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-rose-700 text-xs font-medium">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {/* STEP 1: CUSTOMER INFO & SLOT SELECTION */}
        {step === "DETAILS" && (
          <div className="space-y-5 animate-fade-in">
            {/* Branch Header Card */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-base font-bold text-slate-900">{branchInfo?.name}</h2>
                  <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                    <Car className="w-3.5 h-3.5 text-slate-400" />
                    {t("staff_walkin_desc")}
                  </p>
                </div>
                <span className="inline-flex items-center text-[11px] font-semibold px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-200/60">
                  {t("today")}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-4 text-xs text-slate-600">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  {formatTime(branchData?.openTime)} - {formatTime(branchData?.closeTime)}
                </span>
                <span>•</span>
                <span>
                  {t("book_total_est_time")} ~{branchData?.avgDurationMinutes} {t("mins")}
                </span>
              </div>
            </div>

            <form onSubmit={handleProceedToSummary} className="space-y-5">
              {/* Customer Inputs */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {t("book_step_3")}
                </h3>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("fullName")}
                  </label>
                  <div className="relative">
                    <User className={`w-4 h-4 text-slate-400 absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`} />
                    <input
                      type="text"
                      required
                      minLength={2}
                      placeholder={t("book_input_name_placeholder")}
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                        dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("phone")}
                  </label>
                  <div className="relative">
                    <Phone className={`w-4 h-4 text-slate-400 absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`} />
                    <input
                      type="tel"
                      required
                      maxLength={11}
                      placeholder={t("book_input_phone_placeholder")}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 11))}
                      className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                        dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                      }`}
                    />
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {language === "ar"
                      ? "يتم تأكيد هذا الحجز فورياً ولا يتطلب رمز تحقق (حضور مباشر)."
                      : "This booking is created already confirmed — no OTP is sent for walk-ins."}
                  </p>
                </div>
              </div>

              {/* Time Selection */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {t("book_step_2")}
                </h3>

                {/* NEAREST AVAILABLE CARD */}
                {(() => {
                  const activeNearestSlot =
                    branchData?.slots?.find(
                      (s: TimeSlot) =>
                        s.available && !s.isPassed && parseTimeToMinutes(s.time) >= currentCairoMin
                    ) ||
                    (branchData?.nearestAvailableSlot &&
                    parseTimeToMinutes(branchData.nearestAvailableSlot.time) >= currentCairoMin
                      ? branchData.nearestAvailableSlot
                      : null);

                  if (activeNearestSlot) {
                    const isSelected = selectedSlot?.time === activeNearestSlot.time;
                    return (
                      <div
                        onClick={() => {
                          setSelectedSlot(activeNearestSlot);
                          setError(null);
                        }}
                        className={`cursor-pointer p-4 rounded-xl border-2 transition-all flex items-center justify-between ${
                          isSelected
                            ? "border-blue-600 bg-blue-50/50 shadow-sm"
                            : "border-slate-200 hover:border-blue-300 bg-white"
                        }`}
                      >
                        <div>
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 uppercase tracking-wide bg-blue-100 px-2 py-0.5 rounded-full mb-1">
                            <Sparkles className="w-3 h-3" />
                            {t("book_nearest_slot")}
                          </span>
                          <p className="text-xl font-extrabold text-slate-900 mt-1">
                            {formatTime(activeNearestSlot.time)}
                          </p>
                          <p className="text-xs text-slate-500">
                            {t("today")} • {t("book_select_nearest")}
                          </p>
                        </div>

                        <div
                          className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? "border-blue-600 bg-blue-600 text-white"
                              : "border-slate-300"
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="p-4 bg-slate-100 rounded-xl text-center text-xs text-slate-500">
                      {t("book_no_slots")}
                    </div>
                  );
                })()}

                {/* TOGGLE OTHER TIMES */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOtherTimes(!showOtherTimes)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    {showOtherTimes ? (language === "ar" ? "إخفاء باقي المواعيد" : "Hide other times") : (language === "ar" ? "عرض جميع مواعيد اليوم ←" : "Choose another time today →")}
                  </button>

                  {showOtherTimes && (
                    <div className="mt-3 grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1 border-t border-slate-100 pt-3">
                      {branchData?.slots.map((slot: TimeSlot) => {
                        const slotMin = parseTimeToMinutes(slot.time);
                        const isSlotPassed = slot.isPassed || slotMin < currentCairoMin;
                        const isSlotAvailable = slot.available && !isSlotPassed;
                        const isSelected = selectedSlot?.time === slot.time && isSlotAvailable;

                        return (
                          <button
                            key={slot.time}
                            type="button"
                            disabled={!isSlotAvailable}
                            onClick={() => {
                              if (isSlotAvailable) {
                                setSelectedSlot(slot);
                                setError(null);
                              }
                            }}
                            className={`py-2 px-1.5 rounded-xl text-center transition-all flex flex-col items-center justify-center ${
                              isSlotPassed
                                ? "bg-slate-100/70 border border-slate-200/50 text-slate-400 cursor-not-allowed opacity-60"
                                : !slot.available
                                ? "bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed"
                                : isSelected
                                ? "bg-blue-600 border border-blue-600 text-white font-bold shadow-sm"
                                : "bg-white border border-slate-200 text-slate-700 hover:border-blue-400"
                            }`}
                          >
                            <span className="text-xs font-semibold leading-tight">
                              {formatTime(slot.time)}
                            </span>
                            {isSlotPassed ? (
                              <span className="text-[9px] font-bold text-slate-400 mt-0.5 tracking-tight">
                                {t("slot_closed")}
                              </span>
                            ) : !slot.available ? (
                              <span className="text-[9px] font-bold text-rose-500 mt-0.5 tracking-tight">
                                {t("slot_booked")}
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] mt-0.5 tracking-tight ${
                                  isSelected ? "text-blue-100 font-bold" : "text-emerald-600 font-medium"
                                }`}
                              >
                                {t("slot_available")}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* Bay Assignment */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  {t("staff_select_bay")}
                </h3>
                <div className="relative">
                  <LayoutGrid className={`w-4 h-4 text-slate-400 absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`} />
                  <select
                    value={bayId}
                    onChange={(e) => setBayId(e.target.value)}
                    className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all appearance-none ${
                      dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                    }`}
                  >
                    <option value="">{t("staff_auto_bay")}</option>
                    {bays.map((bay) => (
                      <option key={bay.id} value={bay.id}>
                        {bay.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Service Selection */}
              {availableServices.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        {t("book_step_1")}
                      </h3>
                      <p className="text-[11px] text-slate-400">{t("book_services_desc")}</p>
                    </div>
                    {selectedServiceIds.length > 0 && (
                      <span className="text-[11px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200/60">
                        {formatPrice(servicesTotalPrice)}
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {availableServices.map((service) => {
                      const isSelected = selectedServiceIds.includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => toggleService(service.id)}
                          className={`text-start p-3 rounded-xl border-2 transition-all ${
                            isSelected
                              ? "border-blue-600 bg-blue-50/50 shadow-sm"
                              : "border-slate-200 hover:border-blue-300 bg-white"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-xs font-bold text-slate-900 leading-tight">
                              {tServiceName(service.name)}
                            </span>
                            <div
                              className={`w-4 h-4 shrink-0 rounded-full border flex items-center justify-center mt-0.5 ${
                                isSelected
                                  ? "border-blue-600 bg-blue-600 text-white"
                                  : "border-slate-300"
                              }`}
                            >
                              {isSelected && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                          </div>
                          {service.description && (
                            <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                              {tServiceDesc(service.description, service.name)}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1.5">
                            <p className="text-xs font-extrabold text-blue-700">
                              {formatPrice(service.price)}
                            </p>
                            <span className="text-[10px] font-semibold text-slate-400">
                              ~{service.durationMinutes} {t("mins")}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={!selectedSlot}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm flex items-center justify-center gap-2 transition-all"
              >
                <span>{t("book_proceed_summary")}</span>
                <ArrowIcon className="w-4 h-4" />
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: BOOKING SUMMARY */}
        {step === "SUMMARY" && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("staff_walkin_title")}</h2>
              <p className="text-xs text-slate-500">{t("book_summary_desc")}</p>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-xl text-xs border border-slate-200/80">
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("fullName")}</span>
                <span className="font-semibold text-slate-900">{name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("phone")}</span>
                <span className="font-semibold text-slate-900">{phone}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_branch")}</span>
                <span className="font-semibold text-slate-900">{branchInfo?.name}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_date")}</span>
                <span className="font-bold text-blue-700">{t("today")}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_time")}</span>
                <span className="font-bold text-slate-900 text-sm">{formatTime(selectedSlot?.time || "")}</span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("staff_bay_label")}</span>
                <span className="font-semibold text-slate-900">
                  {selectedBay ? selectedBay.name : t("staff_auto_bay")}
                </span>
              </div>
              {selectedServices.length > 0 && (
                <div className="py-1 border-b border-slate-200/60 space-y-1.5">
                  <span className="text-slate-500 block mb-1">{t("book_summary_services")}</span>
                  {selectedServices.map((s) => (
                    <div key={s.id} className="flex justify-between items-center px-1">
                      <span className="text-slate-700">{tServiceName(s.name)}</span>
                      <span className="font-semibold text-slate-900">{formatPrice(s.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-slate-200/60">
                    <span className="font-bold text-slate-700">{t("book_summary_total")}</span>
                    <span className="font-extrabold text-blue-700">
                      {formatPrice(servicesTotalPrice)}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between items-center py-1">
                <span className="text-slate-500">{t("book_summary_duration")}</span>
                <span className="font-semibold text-slate-700">
                  {branchData?.avgDurationMinutes} {t("mins")}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={handleConfirmWalkIn}
                disabled={submitting}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl shadow-md shadow-blue-500/20 text-sm flex items-center justify-center gap-2 transition-all"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>{t("loading")}</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t("staff_create_walkin")}</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setStep("DETAILS")}
                disabled={submitting}
                className="w-full bg-transparent hover:bg-slate-100 text-slate-600 font-semibold py-2.5 text-xs rounded-xl transition-all"
              >
                {t("back")}
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: BOOKING CONFIRMED */}
        {step === "CONFIRMED" && confirmedBooking && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm text-center space-y-5 animate-fade-in">
            <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-sm">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div>
              <span className="inline-block text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                {t("status_CONFIRMED")}
              </span>
              <h2 className="text-2xl font-black text-slate-900 mt-2">
                {confirmedBooking.bookingNumber}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {language === "ar" ? "يرجى تسليم هذا الرقم للعميل" : "Please give this reference to the customer"}
              </p>
            </div>

            {/* CONFIRMED DETAILS CARD */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-start space-y-2.5">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("fullName")}</span>
                <span className="font-semibold text-slate-900">{confirmedBooking.customerName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("phone")}</span>
                <span className="font-semibold text-slate-900">{confirmedBooking.customerPhone}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_branch")}</span>
                <span className="font-semibold text-slate-900">{branchInfo?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_time")}</span>
                <span className="font-bold text-slate-900 text-sm">
                  {formatTime(confirmedBooking.startTime)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("staff_bay_label")}</span>
                <span className="font-bold text-blue-600">{confirmedBooking.assignedBayName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{t("book_summary_duration")}</span>
                <span className="font-semibold text-slate-700">
                  {confirmedBooking.estimatedDuration} {t("mins")}
                </span>
              </div>
              {confirmedBooking.services && confirmedBooking.services.length > 0 && (
                <div className="py-1 border-b border-slate-200/60 space-y-1.5">
                  <span className="text-slate-500 block mb-1">{t("book_summary_services")}</span>
                  {confirmedBooking.services.map((s) => (
                    <div key={s.id} className="flex justify-between items-center px-1">
                      <span className="text-slate-700">{tServiceName(s.name)}</span>
                      <span className="font-semibold text-slate-900">{formatPrice(s.price)}</span>
                    </div>
                  ))}
                  <div className="flex justify-between items-center pt-1.5 mt-1.5 border-t border-slate-200/60">
                    <span className="font-bold text-slate-700">{t("book_summary_total")}</span>
                    <span className="font-extrabold text-blue-700">
                      {formatPrice(confirmedBooking.totalPrice)}
                    </span>
                  </div>
                </div>
              )}
              <div className="flex justify-between py-1">
                <span className="text-slate-500">{t("my_booking_status_label")}</span>
                <span className="font-bold text-emerald-600">{t("status_CONFIRMED")}</span>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="block w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 text-xs rounded-xl transition-all"
              >
                {language === "ar" ? "تسجيل حجز مباشر آخر" : "Start Another Walk-in"}
              </button>
              <Link
                href="/staff/dashboard"
                className="block w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 text-xs rounded-xl transition-all"
              >
                {language === "ar" ? "العودة للوحة التحكم" : "Back to Dashboard"}
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
