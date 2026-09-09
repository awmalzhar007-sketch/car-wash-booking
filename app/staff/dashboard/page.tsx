"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Settings,
  LogOut,
  RefreshCw,
  Phone,
  CheckCircle2,
  AlertCircle,
  Play,
  Check,
  X,
  UserX,
  Loader2,
  Sliders,
  ChevronRight,
  Plus,
  Wallet,
  Receipt,
  TrendingUp,
  RotateCcw,
  Car,
  LayoutGrid,
} from "lucide-react";
import { BookingStatus, StaffBookingDetail } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { translateCarWashText } from "@/lib/i18n/translator";

export default function StaffDashboardPage() {
  const router = useRouter();
  const { t, formatPrice, formatTime, dir, language, tServiceName, tServiceDesc } = useLanguage();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  // Active view: TIMELINE or LIST or PRICING or DAILY_SUMMARY or SETTINGS
  const [viewTab, setViewTab] = useState<
    "TIMELINE" | "LIST" | "PRICING" | "DAILY_SUMMARY" | "SETTINGS"
  >("TIMELINE");

  // Services & Pricing state — staff own the price AND duration for each
  // service type (the type itself is defined by the Super Admin).
  const [services, setServices] = useState<any[]>([]);
  const [servicesLoading, setServicesLoading] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [priceDrafts, setPriceDrafts] = useState<Record<string, string>>({});
  const [durationDrafts, setDurationDrafts] = useState<Record<string, string>>({});
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);

  // Add new service state for branch staff
  const [showAddService, setShowAddService] = useState(false);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceDesc, setNewServiceDesc] = useState("");
  const [newServicePrice, setNewServicePrice] = useState("");
  const [newServiceDuration, setNewServiceDuration] = useState("30");
  const [addingService, setAddingService] = useState(false);
  const [addServiceError, setAddServiceError] = useState<string | null>(null);

  // Status update modal state
  const [selectedBooking, setSelectedBooking] = useState<StaffBookingDetail | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Settings form state
  const [openTime, setOpenTime] = useState("");
  const [closeTime, setCloseTime] = useState("");
  const [avgDuration, setAvgDuration] = useState(30);
  const [baysCount, setBaysCount] = useState(3);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  // Status filter for LIST view
  const [listFilter, setListFilter] = useState<string>("ALL");

  // Instant Walk-in modal state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [walkInCustomerName, setWalkInCustomerName] = useState("");
  const [walkInCustomerPhone, setWalkInCustomerPhone] = useState("");
  const [walkInSelectedBayId, setWalkInSelectedBayId] = useState("");
  const [walkInSelectedServiceIds, setWalkInSelectedServiceIds] = useState<string[]>([]);
  const [creatingWalkIn, setCreatingWalkIn] = useState(false);
  const [walkInError, setWalkInError] = useState<string | null>(null);
  const [walkInSuccessMsg, setWalkInSuccessMsg] = useState<string | null>(null);

  const toggleWalkInService = (serviceId: string) => {
    setWalkInSelectedServiceIds((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId]
    );
  };

  const handleCreateWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingWalkIn(true);
      setWalkInError(null);

      const customerName = walkInCustomerName.trim() || (language === "ar" ? "حضور مباشر (فوري)" : "Walk-In Customer");
      const customerPhone = walkInCustomerPhone.trim() || "01000000000";

      const res = await fetch("/api/staff/walk-in-booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          selectedServiceIds: walkInSelectedServiceIds,
          bayId: walkInSelectedBayId || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || (language === "ar" ? "فشل إنشاء الحجز المباشر" : "Failed to create walk-in booking"));
      }

      setShowWalkInModal(false);
      setWalkInCustomerName("");
      setWalkInCustomerPhone("");
      setWalkInSelectedBayId("");
      setWalkInSelectedServiceIds([]);
      setWalkInSuccessMsg(language === "ar" ? "تم تسجيل الحجز ودخول السيارة بنجاح!" : "Walk-in booked successfully!");
      setTimeout(() => setWalkInSuccessMsg(null), 4000);
      await loadSchedule(true);
    } catch (err: any) {
      setWalkInError(err.message || (language === "ar" ? "فشل إنشاء الحجز المباشر" : "Failed to create walk-in booking"));
    } finally {
      setCreatingWalkIn(false);
    }
  };

  const loadSchedule = async (isManualRefresh = false) => {
    try {
      if (isManualRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

      const res = await fetch("/api/staff/schedule");
      const json = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/staff/login");
          return;
        }
        throw new Error(json.error || "Failed to load schedule");
      }

      setData(json);
      setOpenTime(json.branch.openTime);
      setCloseTime(json.branch.closeTime);
      setAvgDuration(json.branch.avgDurationMinutes);
      setBaysCount(json.bays.length);
    } catch (err: any) {
      setError(err.message || "Failed to load branch schedule");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchedule();
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      setServicesLoading(true);
      setServicesError(null);
      const res = await fetch("/api/staff/services");
      const json = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/staff/login");
          return;
        }
        throw new Error(json.error || "Failed to load services");
      }
      setServices(json.services || []);
      const priceDraftsMap: Record<string, string> = {};
      const durationDraftsMap: Record<string, string> = {};
      (json.services || []).forEach((s: any) => {
        priceDraftsMap[s.id] = String(s.price);
        durationDraftsMap[s.id] = String(s.durationMinutes);
      });
      setPriceDrafts(priceDraftsMap);
      setDurationDrafts(durationDraftsMap);
    } catch (err: any) {
      setServicesError(err.message || "Failed to load services");
    } finally {
      setServicesLoading(false);
    }
  };

  useEffect(() => {
    if (viewTab === "PRICING" && services.length === 0 && !servicesLoading) {
      loadServices();
    }
  }, [viewTab]);

  const handleSaveService = async (serviceId: string) => {
    const priceDraft = priceDrafts[serviceId];
    const durationDraft = durationDrafts[serviceId];
    const price = Number(priceDraft);
    const durationMinutes = Number(durationDraft);
    if (Number.isNaN(price) || price < 0) {
      alert("Please enter a valid price");
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 180) {
      alert("Please enter a valid duration between 5 and 180 minutes");
      return;
    }
    try {
      setSavingServiceId(serviceId);
      const res = await fetch(`/api/staff/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ price, durationMinutes }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update service");
      }
      setServices((prev) =>
        prev.map((s) => (s.id === serviceId ? { ...s, ...json.service } : s))
      );
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingServiceId(null);
    }
  };

  const handleCreateStaffService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newServiceName.trim()) return;
    try {
      setAddingService(true);
      setAddServiceError(null);
      const res = await fetch("/api/staff/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newServiceName.trim(),
          description: newServiceDesc.trim() || undefined,
          price: Number(newServicePrice) || 0,
          durationMinutes: Number(newServiceDuration) || 30,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to add service");
      }
      setNewServiceName("");
      setNewServiceDesc("");
      setNewServicePrice("");
      setNewServiceDuration("30");
      setShowAddService(false);
      await loadServices();
    } catch (err: any) {
      setAddServiceError(err.message);
    } finally {
      setAddingService(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/staff/login");
  };

  const handleUpdateStatus = async (newStatus: BookingStatus) => {
    if (!selectedBooking) return;
    try {
      setUpdatingStatus(true);
      const res = await fetch("/api/staff/booking-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId: selectedBooking.id,
          status: newStatus,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Status update failed");
      }

      setSelectedBooking(null);
      await loadSchedule(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingSettings(true);
      setSettingsSuccess(null);
      setError(null);

      const res = await fetch("/api/staff/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: data.branch.id,
          openTime,
          closeTime,
          avgDurationMinutes: Number(avgDuration),
          numberOfBays: Number(baysCount),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to save settings");
      }

      setSettingsSuccess("Branch configuration updated successfully!");
      await loadSchedule(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-600">Loading branch operations...</p>
      </div>
    );
  }

  // Daily Summary & Revenue Calculations based on completed bookings
  const completedBookings: StaffBookingDetail[] = (data?.bookings || []).filter(
    (b: StaffBookingDetail) => b.status === "COMPLETED"
  );
  const completedRevenue = completedBookings.reduce(
    (acc: number, b: StaffBookingDetail) => acc + (Number(b.totalPrice) || 0),
    0
  );
  const inProgressRevenue = (data?.bookings || [])
    .filter((b: StaffBookingDetail) => b.status === "WASHING")
    .reduce((acc: number, b: StaffBookingDetail) => acc + (Number(b.totalPrice) || 0), 0);
  const confirmedRevenue = (data?.bookings || [])
    .filter((b: StaffBookingDetail) => b.status === "CONFIRMED")
    .reduce((acc: number, b: StaffBookingDetail) => acc + (Number(b.totalPrice) || 0), 0);
  const projectedRevenue = completedRevenue + inProgressRevenue + confirmedRevenue;
  const avgCompletedRevenue =
    completedBookings.length > 0
      ? Math.round(completedRevenue / completedBookings.length)
      : 0;

  // Breakdown by Service from completed bookings
  const serviceRevenueMap: Record<
    string,
    { id: string; name: string; count: number; totalRevenue: number }
  > = {};

  completedBookings.forEach((b: StaffBookingDetail) => {
    if (b.services && b.services.length > 0) {
      b.services.forEach((s) => {
        if (!serviceRevenueMap[s.id]) {
          serviceRevenueMap[s.id] = {
            id: s.id,
            name: s.name,
            count: 0,
            totalRevenue: 0,
          };
        }
        serviceRevenueMap[s.id].count += 1;
        serviceRevenueMap[s.id].totalRevenue += Number(s.price) || 0;
      });
    }
  });

  const serviceBreakdown = Object.values(serviceRevenueMap).sort(
    (a, b) => b.totalRevenue - a.totalRevenue
  );

  // Breakdown by Bay from completed bookings
  const bayRevenueMap: Record<
    string,
    { bayId: string; bayName: string; bayNumber: number; count: number; totalRevenue: number }
  > = {};

  (data?.bays || []).forEach((bay: any) => {
    bayRevenueMap[bay.id] = {
      bayId: bay.id,
      bayName: bay.name,
      bayNumber: bay.bayNumber,
      count: 0,
      totalRevenue: 0,
    };
  });

  completedBookings.forEach((b: StaffBookingDetail) => {
    if (bayRevenueMap[b.assignedBayId]) {
      bayRevenueMap[b.assignedBayId].count += 1;
      bayRevenueMap[b.assignedBayId].totalRevenue += Number(b.totalPrice) || 0;
    }
  });

  const bayBreakdown = Object.values(bayRevenueMap).sort(
    (a, b) => a.bayNumber - b.bayNumber
  );

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
            CW
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight flex items-center gap-2">
              {data?.branch.name}
              <span className="text-[10px] font-semibold bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                {language === "ar" ? "لوحة الموظف" : "Staff Dashboard"}
              </span>
            </h1>
            <p className="text-xs text-slate-400">
              {data?.branch.brandName} • QR: {data?.branch.qrIdentifier}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <LanguageSwitcher variant="inline" className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 hover:text-white" />
          <button
            type="button"
            onClick={() => {
              setWalkInError(null);
              setShowWalkInModal(true);
              if (services.length === 0) loadServices();
            }}
            className="text-xs bg-blue-600 hover:bg-blue-500 text-white font-bold px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all shadow-sm shrink-0 active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("staff_walkin_btn")}</span>
          </button>
          <button
            onClick={() => loadSchedule(true)}
            disabled={refreshing}
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {t("refresh")}
          </button>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("logout")}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* KPI Counts Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-400">
              {language === "ar" ? "إجمالي اليوم" : "Today's Total"}
            </p>
            <p className="text-2xl font-black text-slate-900 mt-1">{data?.counts.total}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-blue-600">{t("status_CONFIRMED")}</p>
            <p className="text-2xl font-black text-blue-700 mt-1">{data?.counts.confirmed}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-amber-600">{t("status_IN_PROGRESS")}</p>
            <p className="text-2xl font-black text-amber-700 mt-1">{data?.counts.washing}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-emerald-600">{t("status_COMPLETED")}</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{data?.counts.completed}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-rose-500">{t("status_CANCELLED")}</p>
            <p className="text-2xl font-black text-rose-600 mt-1">{data?.counts.cancelled}</p>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{t("status_NO_SHOW")}</p>
            <p className="text-2xl font-black text-slate-700 mt-1">{data?.counts.noShow}</p>
          </div>
          <button
            type="button"
            onClick={() => setViewTab("DAILY_SUMMARY")}
            className={`text-start rounded-2xl p-4 shadow-sm transition-all border ${
              viewTab === "DAILY_SUMMARY"
                ? "bg-emerald-600 text-white border-emerald-600 shadow-md ring-2 ring-emerald-400/40"
                : "bg-emerald-50 hover:bg-emerald-100/80 border-emerald-200 text-emerald-900"
            }`}
          >
            <p className={`text-xs font-bold flex items-center gap-1 ${
              viewTab === "DAILY_SUMMARY" ? "text-emerald-100" : "text-emerald-700"
            }`}>
              <Wallet className="w-3.5 h-3.5" />
              {t("staff_daily_revenue")}
            </p>
            <p className="text-2xl font-black mt-1">
              {formatPrice(completedRevenue)}
            </p>
          </button>
        </div>

        {/* View Tabs Selector */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 flex-wrap gap-2">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setViewTab("TIMELINE")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                viewTab === "TIMELINE"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t("staff_tab_timeline")}
            </button>
            <button
              onClick={() => setViewTab("LIST")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                viewTab === "LIST"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t("staff_tab_list")} ({data?.bookings.length})
            </button>
            <button
              onClick={() => setViewTab("PRICING")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                viewTab === "PRICING"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t("staff_tab_pricing")}
            </button>
            <button
              onClick={() => setViewTab("DAILY_SUMMARY")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                viewTab === "DAILY_SUMMARY"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              {t("staff_tab_daily_summary")}
            </button>
            <button
              onClick={() => setViewTab("SETTINGS")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                viewTab === "SETTINGS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              {t("staff_tab_settings")}
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {data?.date}
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(data?.branch.openTime)} - {formatTime(data?.branch.closeTime)}
            </span>
          </div>
        </div>

        {/* TAB 1: BAY TIMELINE SCHEDULE GRID */}
        {viewTab === "TIMELINE" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  {language === "ar" ? "جدول محطات الغسيل اليوم" : "Today's Wash Bay Timeline"}
                </h2>
                <p className="text-xs text-slate-500">
                  {language === "ar"
                    ? "مرتب بحسب الوقت والمحطة. انقر على أي حجز لتحديث حالته."
                    : "Organized by Time and Assigned Bay. Click any booking to update its status."}
                </p>
              </div>
              <span className="text-xs font-semibold bg-blue-100 text-blue-800 px-2.5 py-1 rounded-md">
                {data?.bays.length} {language === "ar" ? "محطة نشطة" : "Active Bays"}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-start border-collapse min-w-[650px]">
                <thead>
                  <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                    <th className="p-3 w-24">{language === "ar" ? "الوقت" : "Time"}</th>
                    {data?.bays.map((bay: any) => (
                      <th key={bay.id} className="p-3 border-x border-slate-200">
                        {bay.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {data?.timeline.map((row: any) => (
                    <tr
                      key={row.time}
                      className="hover:bg-slate-50/70 transition-colors"
                      // A <td> row-spanning several <tr>s only gets a real,
                      // "specified" height (rather than the browser's auto
                      // content-based height) once its rows have an explicit
                      // height set — otherwise a percentage-height child
                      // (h-full below) can't fill it, leaving blank space
                      // under a booking card that's shorter than the total
                      // height of the rows it spans. 1px is a no-op: rows
                      // still grow to fit their real content (time label,
                      // available slot, etc.); this only unlocks h-full.
                      style={{ height: "1px" }}
                    >
                      <td
                        className="p-3 font-semibold text-slate-700 bg-slate-50/50"
                        style={{ height: "1px" }}
                      >
                        {row.displayTime}
                      </td>
                      {row.baySlots.map((baySlot: any) => {
                        // A booking spans several grid rows once it's longer
                        // than one slot. Every row after its first row is a
                        // "continuation" of that same booking (grouped by
                        // booking ID on the server) — skip rendering a <td>
                        // for those rows entirely. The <td rowSpan=...> cell
                        // emitted on the start row already covers this
                        // table cell for the rows beneath it, so the same
                        // booking still results in exactly one card.
                        if (!baySlot.isBookingStart) {
                          return null;
                        }

                        const booking = baySlot.booking;
                        return (
                          <td
                            key={baySlot.bayId}
                            rowSpan={booking ? baySlot.rowSpan : 1}
                            className="p-2 border-l border-slate-200 align-top"
                            style={{ height: "1px" }}
                          >
                            {booking ? (
                              <div
                                onClick={() => setSelectedBooking(booking)}
                                className={`cursor-pointer p-2.5 rounded-xl border transition-all shadow-xs h-full ${
                                  booking.status === "CONFIRMED"
                                    ? "bg-blue-50 border-blue-200 hover:border-blue-400"
                                    : booking.status === "WASHING"
                                    ? "bg-amber-50 border-amber-300 hover:border-amber-400"
                                    : booking.status === "COMPLETED"
                                    ? "bg-emerald-50 border-emerald-200 hover:border-emerald-300"
                                    : "bg-slate-100 border-slate-200 text-slate-400"
                                }`}
                              >
                                <div className="flex justify-between items-start">
                                  <span className="font-bold text-slate-900 text-xs">
                                    {booking.bookingNumber}
                                  </span>
                                  <span
                                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                      booking.status === "CONFIRMED"
                                        ? "bg-blue-600 text-white"
                                        : booking.status === "WASHING"
                                        ? "bg-amber-500 text-white"
                                        : booking.status === "COMPLETED"
                                        ? "bg-emerald-600 text-white"
                                        : "bg-slate-300 text-slate-700"
                                    }`}
                                  >
                                    {booking.status}
                                  </span>
                                </div>
                                <p className="font-semibold text-slate-800 mt-1 truncate">
                                  {booking.customerName}
                                </p>
                                <p className="text-[11px] text-slate-500 truncate">
                                  {booking.customerPhone}
                                </p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  {booking.startTime}–{booking.endTime} • Est. {booking.estimatedDuration} min
                                </p>
                                {booking.services && booking.services.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1.5">
                                    {booking.services.map((s: any) => (
                                      <span
                                        key={s.id}
                                        className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/70 border border-slate-200 text-slate-600 truncate max-w-full"
                                      >
                                        {tServiceName(s.name)}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="p-2.5 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 font-medium">
                                {t("staff_empty_slot")}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: BOOKINGS LIST VIEW */}
        {viewTab === "LIST" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-sm font-bold text-slate-900">
                {language === "ar" ? "حجوزات اليوم" : "Today's Bookings"}
              </h2>
              <div className="flex gap-1 overflow-x-auto text-xs">
                {["ALL", "CONFIRMED", "WASHING", "COMPLETED", "CANCELLED", "NO_SHOW"].map(
                  (st) => {
                    const label =
                      st === "ALL"
                        ? t("all")
                        : st === "WASHING"
                        ? t("status_IN_PROGRESS")
                        : t(`status_${st}` as any, st);
                    return (
                      <button
                        key={st}
                        onClick={() => setListFilter(st)}
                        className={`px-3 py-1 rounded-lg font-semibold transition-colors whitespace-nowrap ${
                          listFilter === st
                            ? "bg-slate-900 text-white"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  }
                )}
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {data?.bookings
                .filter((b: any) => listFilter === "ALL" || b.status === listFilter)
                .map((b: any) => (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBooking(b)}
                    className="py-3 px-2 hover:bg-slate-50 rounded-xl flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">
                          {b.bookingNumber}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded">
                          {b.assignedBayName}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            b.status === "CONFIRMED"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : b.status === "WASHING"
                              ? "bg-amber-50 text-amber-800 border border-amber-200"
                              : b.status === "COMPLETED"
                              ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {b.status === "WASHING" ? t("status_IN_PROGRESS") : t(`status_${b.status}` as any, b.status)}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                        <span className="font-medium text-slate-700">{b.customerName}</span>
                        <span dir="ltr">{b.customerPhone}</span>
                        <span>{language === "ar" ? "الوقت:" : "Time:"} {formatTime(b.startTime)}</span>
                        <span className="text-slate-400">~{b.estimatedDuration} {t("mins")}</span>
                        {b.totalPrice > 0 && (
                          <span className="font-bold text-emerald-700">
                            {formatPrice(b.totalPrice)}
                          </span>
                        )}
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 text-slate-400 ${dir === "rtl" ? "rotate-180" : ""}`} />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* TAB 3: SERVICES, PRICING & DURATION */}
        {viewTab === "PRICING" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-2xl mx-auto space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {language === "ar" ? "الخدمات والأسعار والمدة" : "Services, Pricing & Duration"}
              </h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "حدد السعر ومدة الغسيل المتوقعة لكل خدمة بالفرع. يتم استخدام هذه المدة تلقائياً في جدول المحطات عند حجز العميل."
                  : "Set the price and expected wash duration for each service at your branch. The duration you set here is used automatically to build the bay schedule whenever a customer books it."}
              </p>
            </div>

            {servicesError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                {servicesError}
              </div>
            )}

            {servicesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
              </div>
            ) : services.length === 0 ? (
              <p className="text-xs text-slate-400 italic text-center py-6">
                {language === "ar" ? "لا توجد خدمات محددة بعد." : "No service types yet. Ask your Super Admin to add some for this branch."}
              </p>
            ) : (
              <div className="space-y-2">
                {services.map((service) => {
                  const isDirty =
                    priceDrafts[service.id] !== String(service.price) ||
                    durationDrafts[service.id] !== String(service.durationMinutes);
                  return (
                    <div
                      key={service.id}
                      className={`border rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 ${
                        service.isActive
                          ? "border-slate-200 bg-white"
                          : "border-slate-100 bg-slate-50 opacity-60"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {tServiceName(service.name)}
                          </p>
                          {!service.isActive && (
                            <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded uppercase">
                              {language === "ar" ? "مخفي" : "Hidden"}
                            </span>
                          )}
                        </div>
                        {service.description && (
                          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {tServiceDesc(service.description, service.name)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            {t("staff_price_label")}
                          </label>
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            value={priceDrafts[service.id] ?? ""}
                            onChange={(e) =>
                              setPriceDrafts({ ...priceDrafts, [service.id]: e.target.value })
                            }
                            placeholder="0.00"
                            className="w-20 px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-bold text-slate-400 uppercase mb-0.5">
                            {t("staff_duration_label")}
                          </label>
                          <input
                            type="number"
                            min={5}
                            max={180}
                            step="1"
                            value={durationDrafts[service.id] ?? ""}
                            onChange={(e) =>
                              setDurationDrafts({ ...durationDrafts, [service.id]: e.target.value })
                            }
                            placeholder="30"
                            className="w-20 px-2.5 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                          />
                        </div>
                        <button
                          onClick={() => handleSaveService(service.id)}
                          disabled={savingServiceId === service.id || !isDirty}
                          className="self-end bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white font-bold py-2 px-3 text-xs rounded-lg transition-colors"
                        >
                          {savingServiceId === service.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            t("save")
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add New Service Form for Staff */}
            <div className="pt-4 border-t border-slate-100">
              {!showAddService ? (
                <button
                  type="button"
                  onClick={() => setShowAddService(true)}
                  className="w-full bg-slate-50 hover:bg-slate-100 text-blue-600 font-bold py-2.5 px-4 rounded-xl text-xs border border-dashed border-slate-300 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  {language === "ar" ? "إضافة خدمة جديدة لهذا الفرع" : "Add New Service to this Branch"}
                </button>
              ) : (
                <form onSubmit={handleCreateStaffService} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 animate-fade-in">
                  <div className="flex justify-between items-center">
                    <h3 className="text-xs font-bold text-slate-900">
                      {language === "ar" ? "إضافة خدمة جديدة للفرع" : "Add New Service to Branch"}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowAddService(false)}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {addServiceError && (
                    <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-lg">
                      {addServiceError}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {language === "ar" ? "اسم الخدمة" : "Service Name"}
                    </label>
                    <input
                      type="text"
                      required
                      value={newServiceName}
                      onChange={(e) => setNewServiceName(e.target.value)}
                      placeholder={language === "ar" ? "مثال: تلميع فوانيس بالبخار أو Headlight Polish" : "e.g. Headlight Polish / تلميع فوانيس"}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                    {newServiceName.trim() && (
                      <div className="mt-1.5 bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs flex items-center justify-between text-emerald-900">
                        <span className="text-slate-500 font-medium">
                          {language === "ar" ? "🌐 الترجمة التلقائية:" : "🌐 Auto Translation:"}
                        </span>
                        <span className="font-bold text-emerald-800">
                          {translateCarWashText(newServiceName, language === "ar" ? "en" : "ar")}
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      {language === "ar" ? "الوصف (اختياري)" : "Description (Optional)"}
                    </label>
                    <input
                      type="text"
                      value={newServiceDesc}
                      onChange={(e) => setNewServiceDesc(e.target.value)}
                      placeholder={language === "ar" ? "وصف مختصر للخدمة" : "Brief description"}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t("staff_price_label")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        required
                        placeholder="100"
                        value={newServicePrice}
                        onChange={(e) => setNewServicePrice(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        {t("staff_duration_label")}
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={180}
                        required
                        placeholder="30"
                        value={newServiceDuration}
                        onChange={(e) => setNewServiceDuration(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={addingService}
                      className="flex-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2 px-3 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      {addingService ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                      {language === "ar" ? "تأكيد إضافة الخدمة" : "Save New Service"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddService(false)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-3 text-xs rounded-xl transition-colors"
                    >
                      {t("cancel")}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TODAY'S DAILY SUMMARY & REVENUE */}
        {viewTab === "DAILY_SUMMARY" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-700">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      <Wallet className="w-4 h-4" />
                    </span>
                    <h2 className="text-base sm:text-lg font-bold">
                      {t("staff_tab_daily_summary")}
                    </h2>
                    <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded">
                      {t("today")} ({data?.date})
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    {t("staff_summary_desc")}
                  </p>
                </div>
                <div className="flex items-center gap-3 bg-slate-800/90 border border-slate-700 rounded-xl p-3 px-4 shrink-0">
                  <div className="text-start sm:text-end">
                    <p className="text-[11px] text-slate-400 font-semibold">{t("staff_completed_revenue")}</p>
                    <p className="text-xl font-black text-emerald-400">{formatPrice(completedRevenue)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Financial & Operational KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Card 1: Completed Revenue */}
              <div className="bg-white border border-emerald-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-emerald-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-700 uppercase tracking-wide">
                    {t("staff_completed_revenue")}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                    <Wallet className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {formatPrice(completedRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  {language === "ar"
                    ? `محصل من ${completedBookings.length} سيارة مكتملة`
                    : `Collected from ${completedBookings.length} completed washes`}
                </p>
              </div>

              {/* Card 2: Completed Washes Count */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-blue-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t("staff_completed_washes")}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {completedBookings.length}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {language === "ar"
                    ? `من أصل ${data?.counts.total || 0} حجز مسجل اليوم (${
                        data?.counts.total > 0
                          ? Math.round((completedBookings.length / data.counts.total) * 100)
                          : 0
                      }%)`
                    : `Out of ${data?.counts.total || 0} total bookings today (${
                        data?.counts.total > 0
                          ? Math.round((completedBookings.length / data.counts.total) * 100)
                          : 0
                      }%)`}
                </p>
              </div>

              {/* Card 3: Average Revenue Per Wash */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-indigo-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t("staff_avg_wash_revenue")}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <Receipt className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {formatPrice(avgCompletedRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {language === "ar"
                    ? "متوسط قيمة الحجز للسيارة المكتملة"
                    : "Average ticket per completed vehicle"}
                </p>
              </div>

              {/* Card 4: Projected Total Today */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 left-0 h-1 bg-amber-500" />
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                    {t("staff_projected_revenue")}
                  </span>
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-3xl font-black text-slate-900 mt-2">
                  {formatPrice(projectedRevenue)}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {language === "ar"
                    ? `قيد الانتظار: ${formatPrice(inProgressRevenue + confirmedRevenue)}`
                    : `Pending: ${formatPrice(inProgressRevenue + confirmedRevenue)}`}
                </p>
              </div>
            </div>

            {/* Performance Analytics: Services Breakdown & Bay Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Breakdown by Service */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("staff_revenue_by_service")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {language === "ar"
                        ? "الدخل والمرات المنفذة لكل نوع خدمة من الحجوزات المكتملة"
                        : "Revenue and count per service from completed bookings"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {serviceBreakdown.length} {language === "ar" ? "خدمة" : "services"}
                  </span>
                </div>

                {serviceBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    {language === "ar"
                      ? "لا توجد خدمات مكتملة حتى الآن اليوم."
                      : "No completed services yet today."}
                  </p>
                ) : (
                  <div className="space-y-3">
                    {serviceBreakdown.map((s) => {
                      const sharePercent =
                        completedRevenue > 0
                          ? Math.round((s.totalRevenue / completedRevenue) * 100)
                          : 0;
                      return (
                        <div key={s.id} className="space-y-1.5">
                          <div className="flex justify-between items-center text-xs">
                            <span className="font-semibold text-slate-800">
                              {tServiceName(s.name)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                                {s.count} {language === "ar" ? "مرة" : "times"}
                              </span>
                              <span className="font-bold text-slate-900">
                                {formatPrice(s.totalRevenue)}
                              </span>
                              <span className="text-[10px] text-slate-400 w-8 text-end">
                                {sharePercent}%
                              </span>
                            </div>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
                              style={{ width: `${Math.max(sharePercent, 4)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Breakdown by Bay */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">
                      {t("staff_revenue_by_bay")}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {language === "ar"
                        ? "الدخل وعدد السيارات المكتملة في كل محطة غسيل"
                        : "Revenue and completed vehicle count per wash bay"}
                    </p>
                  </div>
                  <span className="text-xs font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                    {bayBreakdown.length} {language === "ar" ? "محطات" : "bays"}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {bayBreakdown.map((bay) => (
                    <div
                      key={bay.bayId}
                      className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2"
                    >
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {bay.bayName}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {bay.count} {language === "ar" ? "سيارة مكتملة" : "completed"}
                        </span>
                      </div>
                      <div className="flex justify-between items-end pt-1">
                        <span className="text-[11px] text-slate-500">
                          {t("staff_total_collected")}:
                        </span>
                        <span className="text-base font-black text-slate-900">
                          {formatPrice(bay.totalRevenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Completed Bookings Detailed List */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50 flex-wrap gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {t("staff_completed_bookings_list")}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {language === "ar"
                      ? "قائمة الحجوزات المكتملة اليوم التي تم احتساب الدخل اليومي منها"
                      : "List of today's completed bookings contributing to daily revenue"}
                  </p>
                </div>
                <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {completedBookings.length} {t("status_COMPLETED")}
                </span>
              </div>

              {completedBookings.length === 0 ? (
                <div className="p-12 text-center text-slate-400 space-y-2">
                  <CheckCircle2 className="w-10 h-10 mx-auto text-slate-300 stroke-1" />
                  <p className="text-sm font-semibold text-slate-600">
                    {t("staff_no_completed_today")}
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-start border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 text-[11px] font-bold uppercase tracking-wider text-slate-600 border-b border-slate-200">
                        <th className="p-3 text-start">#</th>
                        <th className="p-3 text-start">{language === "ar" ? "الوقت" : "Time"}</th>
                        <th className="p-3 text-start">{t("fullName")}</th>
                        <th className="p-3 text-start">{t("phone")}</th>
                        <th className="p-3 text-start">{t("staff_bay_label")}</th>
                        <th className="p-3 text-start">{language === "ar" ? "الخدمات" : "Services"}</th>
                        <th className="p-3 text-start">{language === "ar" ? "المبلغ المحصل" : "Collected"}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {completedBookings.map((b: StaffBookingDetail) => (
                        <tr
                          key={b.id}
                          onClick={() => setSelectedBooking(b)}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <td className="p-3 font-mono font-bold text-blue-600">
                            {b.bookingNumber}
                          </td>
                          <td className="p-3 text-slate-600 whitespace-nowrap">
                            {formatTime(b.startTime)} - {formatTime(b.endTime)}
                          </td>
                          <td className="p-3 font-semibold text-slate-900">
                            {b.customerName}
                          </td>
                          <td className="p-3 text-slate-600 font-mono" dir="ltr">
                            {b.customerPhone}
                          </td>
                          <td className="p-3">
                            <span className="text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                              {b.assignedBayName}
                            </span>
                          </td>
                          <td className="p-3 text-slate-600 max-w-xs">
                            {b.services && b.services.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {b.services.map((s) => (
                                  <span
                                    key={s.id}
                                    className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded"
                                  >
                                    {tServiceName(s.name)}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              "—"
                            )}
                          </td>
                          <td className="p-3 font-black text-emerald-700 whitespace-nowrap">
                            {formatPrice(b.totalPrice)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: BRANCH SETTINGS */}
        {viewTab === "SETTINGS" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 max-w-xl mx-auto space-y-5 animate-fade-in">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t("staff_tab_settings")}</h2>
              <p className="text-xs text-slate-500">
                {language === "ar"
                  ? "تحديث مواعيد العمل، وعدد محطات الغسيل، ومتوسط مدة الحجز."
                  : "Update operating hours, wash bays, and average wash duration."}
              </p>
            </div>

            {settingsSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                {language === "ar" ? "تم تحديث إعدادات الفرع بنجاح!" : settingsSuccess}
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("staff_open_time")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="09:00"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("staff_close_time")}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="22:00"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("staff_bays_count")}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    required
                    value={baysCount}
                    onChange={(e) => setBaysCount(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {language === "ar" ? "متوسط مدة الغسيل (بالدقائق)" : "Avg Wash Duration (Mins)"}
                  </label>
                  <input
                    type="number"
                    min={5}
                    max={180}
                    required
                    value={avgDuration}
                    onChange={(e) => setAvgDuration(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={savingSettings}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {savingSettings ? <Loader2 className="w-4 h-4 animate-spin" /> : t("staff_save_changes")}
              </button>
            </form>
          </div>
        )}

        {/* STATUS ACTION MODAL */}
        {selectedBooking && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5">
              <div className="flex justify-between items-start">
                <div>
                  <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase">
                    {language === "ar" ? "المحطة:" : "Assigned:"} {selectedBooking.assignedBayName}
                  </span>
                  <h3 className="text-xl font-black text-slate-900 mt-1">
                    {selectedBooking.bookingNumber}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {formatTime(selectedBooking.startTime)} - {formatTime(selectedBooking.endTime)}
                  </p>
                </div>

                <button
                  onClick={() => setSelectedBooking(null)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Customer summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("fullName")}:</span>
                  <span className="font-semibold text-slate-900">{selectedBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("phone")}:</span>
                  <span className="font-semibold text-slate-900" dir="ltr">{selectedBooking.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("my_booking_status_label")}</span>
                  <span className="font-bold text-blue-600">
                    {selectedBooking.status === "WASHING" ? t("status_IN_PROGRESS") : t(`status_${selectedBooking.status}` as any, selectedBooking.status)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("book_summary_duration")}</span>
                  <span className="font-bold text-slate-900">
                    {selectedBooking.estimatedDuration} {t("mins")}
                  </span>
                </div>
                {selectedBooking.services && selectedBooking.services.length > 0 && (
                  <div className="pt-1.5 mt-1.5 border-t border-slate-200/60 space-y-1">
                    <span className="text-slate-500 block mb-1">{t("book_summary_services")}</span>
                    {selectedBooking.services.map((s) => (
                      <div key={s.id} className="flex justify-between px-1">
                        <span className="text-slate-700">
                          {tServiceName(s.name)}
                          <span className="text-slate-400"> ({s.durationMinutes} {t("mins")})</span>
                        </span>
                        <span className="font-semibold text-slate-900">{formatPrice(s.price)}</span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-1 mt-1 border-t border-slate-200/60">
                      <span className="font-bold text-slate-700">{t("book_summary_total")}</span>
                      <span className="font-extrabold text-blue-600">
                        {formatPrice(selectedBooking.totalPrice)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Status transition action buttons */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  {language === "ar" ? "تحديث حالة الحجز" : "Update Booking Status"}
                </p>

                {selectedBooking.status === "CONFIRMED" && (
                  <>
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus("WASHING")}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5 fill-white" />
                      {t("staff_action_start")}
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus("CANCELLED")}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold py-2 rounded-xl text-xs transition-colors"
                      >
                        {t("staff_action_cancel")}
                      </button>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus("NO_SHOW")}
                        className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-colors"
                      >
                        {t("staff_action_noshow")}
                      </button>
                    </div>
                  </>
                )}

                {selectedBooking.status === "WASHING" && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={updatingStatus}
                      onClick={() => handleUpdateStatus("COMPLETED")}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Check className="w-4 h-4" />
                      {t("staff_action_complete")}
                    </button>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus("CONFIRMED")}
                        className="flex-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 font-semibold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {t("staff_action_undo_wash")}
                      </button>
                      <button
                        type="button"
                        disabled={updatingStatus}
                        onClick={() => handleUpdateStatus("CANCELLED")}
                        className="flex-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-semibold py-2 rounded-xl text-xs transition-colors"
                      >
                        {t("staff_action_cancel")}
                      </button>
                    </div>
                  </div>
                )}

                {["COMPLETED", "CANCELLED", "NO_SHOW"].includes(selectedBooking.status) && (
                  <p className="text-xs text-center text-slate-400 py-2">
                    {language === "ar"
                      ? "هذا الحجز في حالة نهائية ولا يمكن تعديله."
                      : `This booking is in a final status (${selectedBooking.status}) and cannot be modified.`}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* SUCCESS TOAST */}
        {walkInSuccessMsg && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white text-xs font-bold px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-2 animate-fade-in border border-emerald-500">
            <CheckCircle2 className="w-4 h-4" />
            <span>{walkInSuccessMsg}</span>
          </div>
        )}

        {/* WALK-IN QUICK BOOKING MODAL */}
        {showWalkInModal && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-fade-in overflow-y-auto">
            <div className="bg-white rounded-3xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 my-auto border border-slate-100">
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
                    <Car className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      {language === "ar" ? "حجز فوري (حضور مباشر الآن)" : "Quick Walk-In Booking"}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {language === "ar" ? "تسجيل سيارة واصلة للمغسلة حالياً وبدء الغسيل" : "Register an arriving vehicle and assign bay"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowWalkInModal(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {walkInError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{walkInError}</span>
                </div>
              )}

              <form onSubmit={handleCreateWalkIn} className="space-y-4 text-xs">
                {/* 1. Services Selection */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="font-bold text-slate-800 text-xs">
                      {language === "ar" ? "1. اختر نوع الغسلة / الخدمة" : "1. Select Wash Service"}
                    </label>
                    {walkInSelectedServiceIds.length > 0 && (
                      <span className="font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/60 text-xs">
                        {formatPrice(
                          (services || [])
                            .filter((s) => walkInSelectedServiceIds.includes(s.id))
                            .reduce((sum, s) => sum + s.price, 0)
                        )}
                      </span>
                    )}
                  </div>

                  {services.length === 0 ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-slate-500 text-center">
                      <Loader2 className="w-4 h-4 animate-spin mx-auto mb-1 text-blue-600" />
                      <span>{language === "ar" ? "جاري تحميل باقات الغسيل..." : "Loading services..."}</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                      {services.map((service) => {
                        const isSelected = walkInSelectedServiceIds.includes(service.id);
                        return (
                          <button
                            key={service.id}
                            type="button"
                            onClick={() => toggleWalkInService(service.id)}
                            className={`p-3 rounded-xl border-2 text-start transition-all cursor-pointer ${
                              isSelected
                                ? "border-blue-600 bg-blue-50/70 shadow-xs"
                                : "border-slate-200 hover:border-blue-300 bg-white"
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <span className="font-bold text-slate-900 text-xs leading-tight">
                                {tServiceName(service.name)}
                              </span>
                              <div
                                className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                                  isSelected
                                    ? "border-blue-600 bg-blue-600 text-white"
                                    : "border-slate-300"
                                }`}
                              >
                                {isSelected && <Check className="w-2.5 h-2.5" />}
                              </div>
                            </div>
                            <div className="flex justify-between items-center mt-2 text-xs">
                              <span className="font-black text-blue-700">
                                {formatPrice(service.price)}
                              </span>
                              <span className="text-slate-400 text-[10px]">
                                ~{service.durationMinutes} {t("mins")}
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* 2. Bay Selection */}
                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 text-xs">
                    {language === "ar" ? "2. حارة الغسيل (المحطة)" : "2. Wash Bay"}
                  </label>
                  <div className="relative">
                    <LayoutGrid className={`w-4 h-4 text-slate-400 absolute top-2.5 ${dir === "rtl" ? "right-3" : "left-3"}`} />
                    <select
                      value={walkInSelectedBayId}
                      onChange={(e) => setWalkInSelectedBayId(e.target.value)}
                      className={`w-full py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                        dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                      }`}
                    >
                      <option value="">
                        {language === "ar" ? "توزيع تلقائي لأول حارة متاحة الآن" : "Auto-assign first available bay"}
                      </option>
                      {(data?.bays || []).map((bay: any) => (
                        <option key={bay.id} value={bay.id}>
                          {bay.name} {bay.currentBooking ? (language === "ar" ? "(مشغولة حالياً)" : "(Busy)") : (language === "ar" ? "(متاحة الآن)" : "(Available)")}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* 3. Customer Info (Optional & Fast) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "ar" ? "اسم العميل (اختياري)" : "Customer Name"}
                    </label>
                    <input
                      type="text"
                      placeholder={language === "ar" ? "مثال: أحمد محمد (أو اتركه فارغاً)" : "e.g. John Doe"}
                      value={walkInCustomerName}
                      onChange={(e) => setWalkInCustomerName(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-semibold text-slate-700 block mb-1">
                      {language === "ar" ? "رقم الموبايل (اختياري)" : "Customer Phone"}
                    </label>
                    <input
                      type="tel"
                      placeholder="010xxxxxxxx"
                      value={walkInCustomerPhone}
                      onChange={(e) => setWalkInCustomerPhone(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 text-xs font-mono"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 flex gap-2">
                  <button
                    type="submit"
                    disabled={creatingWalkIn}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-2xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 transition-all cursor-pointer active:scale-98"
                  >
                    {creatingWalkIn ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>{language === "ar" ? "جاري تسجيل الحجز..." : "Booking..."}</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>{language === "ar" ? "تأكيد وبدء الغسيل فوراً" : "Confirm & Start Wash"}</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowWalkInModal(false)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors"
                  >
                    {language === "ar" ? "إلغاء" : "Cancel"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
