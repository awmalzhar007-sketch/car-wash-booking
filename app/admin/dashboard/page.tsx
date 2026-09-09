"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import {
  ShieldCheck,
  Building2,
  QrCode,
  Calendar,
  Layers,
  LogOut,
  Plus,
  RefreshCw,
  Printer,
  Download,
  Copy,
  Check,
  ExternalLink,
  Edit2,
  X,
  Loader2,
  Search,
  Filter,
  CheckCircle2,
  Users,
  Trash2,
  Mail,
  Lock,
  ChevronRight,
  ArrowRight,
  DollarSign,
  RotateCcw,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { translateCarWashText } from "@/lib/i18n/translator";

export default function AdminDashboardPage() {
  const router = useRouter();
  const { t, formatPrice, formatTime, dir, language, tServiceName, tServiceDesc } = useLanguage();
  const [activeTab, setActiveTab] = useState<"BRANCHES" | "BRANDS" | "STAFF" | "BOOKINGS">("BRANCHES");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Data states
  const [branches, setBranches] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [staffMembers, setStaffMembers] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);

  // QR Modal state
  const [qrModalBranch, setQrModalBranch] = useState<any>(null);
  const [qrData, setQrData] = useState<any>(null);
  const [qrLoading, setQrLoading] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Create Branch Modal state
  const [showCreateBranch, setShowCreateBranch] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranch, setNewBranch] = useState({
    brandId: "",
    name: "",
    slug: "",
    address: "",
    phone: "",
    qrIdentifier: "",
    openTime: "09:00",
    closeTime: "22:00",
    avgDurationMinutes: 30,
    numberOfBays: 3,
  });

  // Create Brand Modal state
  const [showCreateBrand, setShowCreateBrand] = useState(false);
  const [creatingBrand, setCreatingBrand] = useState(false);
  const [newBrand, setNewBrand] = useState({ name: "", slug: "" });

  // Create Staff Modal state
  const [showCreateStaff, setShowCreateStaff] = useState(false);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [newStaff, setNewStaff] = useState({
    name: "",
    email: "",
    password: "",
    branchId: "",
  });

  // Edit Staff Modal state
  const [editStaff, setEditStaff] = useState<any>(null);
  const [updatingStaff, setUpdatingStaff] = useState(false);

  // Edit Branch state
  const [editBranch, setEditBranch] = useState<any>(null);

  // Manage Services Modal state (Super Admin controls the service TYPE only —
  // name & description. Branch staff own pricing from their own dashboard.)
  const [servicesModalBranchId, setServicesModalBranchId] = useState<string | null>(null);
  const [newService, setNewService] = useState({ name: "", description: "" });
  const [creatingService, setCreatingService] = useState(false);
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);
  const [editingServiceDraft, setEditingServiceDraft] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [savingServiceId, setSavingServiceId] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<string | null>(null);

  // Staff Filters
  const [filterStaffBranch, setFilterStaffBranch] = useState("");
  const [staffSearchQuery, setStaffSearchQuery] = useState("");

  // Global Bookings Filters
  const [filterBrand, setFilterBrand] = useState("");
  const [filterBranch, setFilterBranch] = useState("");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Edit Booking Status modal state
  const [editingBooking, setEditingBooking] = useState<any | null>(null);
  const [targetStatusDraft, setTargetStatusDraft] = useState<string>("CONFIRMED");
  const [updatingBookingStatus, setUpdatingBookingStatus] = useState(false);

  const handleUpdateBookingStatus = async (bookingId: string, status: string) => {
    try {
      setUpdatingBookingStatus(true);
      const res = await fetch("/api/admin/bookings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bookingId, status }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to update booking status");
      }
      setEditingBooking(null);
      showToast(t("admin_status_updated"));
      await loadBookings();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingBookingStatus(false);
    }
  };

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load brands, branches, and staff
      const [brandsRes, branchesRes, staffRes] = await Promise.all([
        fetch("/api/admin/brands"),
        fetch("/api/admin/branches"),
        fetch("/api/admin/staff"),
      ]);

      if (!brandsRes.ok || !branchesRes.ok) {
        if (brandsRes.status === 403 || brandsRes.status === 401) {
          router.push("/admin/login");
          return;
        }
        throw new Error("Failed to load admin data");
      }

      const brandsJson = await brandsRes.json();
      const branchesJson = await branchesRes.json();
      const staffJson = staffRes.ok ? await staffRes.json() : { staffMembers: [] };

      setBrands(brandsJson.brands || []);
      setBranches(branchesJson.branches || []);
      setStaffMembers(staffJson.staffMembers || []);

      if (brandsJson.brands?.length > 0 && !newBranch.brandId) {
        setNewBranch((prev) => ({ ...prev, brandId: brandsJson.brands[0].id }));
      }
      if (branchesJson.branches?.length > 0 && !newStaff.branchId) {
        setNewStaff((prev) => ({ ...prev, branchId: branchesJson.branches[0].id }));
      }
    } catch (err: any) {
      setError(err.message || "Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const loadBookings = async () => {
    try {
      const query = new URLSearchParams();
      if (filterBrand) query.append("brandId", filterBrand);
      if (filterBranch) query.append("branchId", filterBranch);
      if (filterStatus) query.append("status", filterStatus);
      if (searchQuery) query.append("search", searchQuery);

      const res = await fetch(`/api/admin/bookings?${query.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setBookings(json.bookings || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "BOOKINGS") {
      loadBookings();
    }
  }, [activeTab, filterBrand, filterBranch, filterStatus, searchQuery]);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
  };

  // Open QR modal
  const handleOpenQR = async (branch: any) => {
    setQrModalBranch(branch);
    setQrLoading(true);
    try {
      const res = await fetch(`/api/admin/qr/${branch.qrIdentifier}`);
      const json = await res.json();
      if (res.ok) {
        setQrData(json);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setQrLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (!qrData?.bookingUrl) return;
    navigator.clipboard.writeText(qrData.bookingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Create Brand
  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingBrand(true);
      const res = await fetch("/api/admin/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBrand),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create brand");
      }
      setShowCreateBrand(false);
      setNewBrand({ name: "", slug: "" });
      showToast("Brand created successfully!");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingBrand(false);
    }
  };

  // Create Branch
  const handleCreateBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingBranch(true);
      const res = await fetch("/api/admin/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newBranch),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create branch");
      }
      setShowCreateBranch(false);
      setNewBranch({
        brandId: brands[0]?.id || "",
        name: "",
        slug: "",
        address: "",
        phone: "",
        qrIdentifier: "",
        openTime: "09:00",
        closeTime: "22:00",
        avgDurationMinutes: 30,
        numberOfBays: 3,
      });
      showToast("Branch created successfully! It is now live for bookings.");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingBranch(false);
    }
  };

  // Create Staff
  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setCreatingStaff(true);
      const res = await fetch("/api/admin/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newStaff),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create staff member");
      }
      setShowCreateStaff(false);
      setNewStaff({
        name: "",
        email: "",
        password: "",
        branchId: branches[0]?.id || "",
      });
      showToast("Staff member created successfully!");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingStaff(false);
    }
  };

  // Update Staff
  const handleUpdateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editStaff) return;
    try {
      setUpdatingStaff(true);
      const res = await fetch(`/api/admin/staff/${editStaff.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editStaff.name,
          email: editStaff.email,
          branchId: editStaff.branchId,
          password: editStaff.password || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update staff member");
      }
      setEditStaff(null);
      showToast("Staff member updated successfully!");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setUpdatingStaff(false);
    }
  };

  // Delete Staff
  const handleDeleteStaff = async (staffId: string, staffName: string) => {
    if (!confirm(`Are you sure you want to delete staff member "${staffName}"?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/staff/${staffId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete staff member");
      }
      showToast(`Staff member "${staffName}" deleted successfully!`);
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Save Edit Branch
  const handleSaveEditBranch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editBranch) return;
    try {
      const res = await fetch(`/api/admin/branches/${editBranch.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editBranch.name,
          address: editBranch.address,
          phone: editBranch.phone,
          openTime: editBranch.openTime,
          closeTime: editBranch.closeTime,
          avgDurationMinutes: Number(editBranch.avgDurationMinutes),
          numberOfBays: Number(editBranch.numberOfBays),
          isActive: editBranch.isActive,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update branch");
      }
      setEditBranch(null);
      showToast("Branch settings updated successfully!");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Filtered staff members
  const filteredStaff = staffMembers.filter((staff) => {
    const matchesBranch = filterStaffBranch ? staff.branchId === filterStaffBranch : true;
    const matchesSearch = staffSearchQuery
      ? staff.name.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
        staff.email.toLowerCase().includes(staffSearchQuery.toLowerCase())
      : true;
    return matchesBranch && matchesSearch;
  });

  // The branch currently open in the "Manage Services" modal (kept in sync with `branches`)
  const servicesModalBranch = servicesModalBranchId
    ? branches.find((b) => b.id === servicesModalBranchId) || null
    : null;

  const openServicesModal = (branchId: string) => {
    setServicesModalBranchId(branchId);
    setNewService({ name: "", description: "" });
    setEditingServiceId(null);
    setEditingServiceDraft(null);
  };

  const closeServicesModal = () => {
    setServicesModalBranchId(null);
    setNewService({ name: "", description: "" });
    setEditingServiceId(null);
    setEditingServiceDraft(null);
  };

  // Create Service (type only — no price; branch staff set the price)
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!servicesModalBranchId) return;
    if (!newService.name.trim()) {
      alert("Please enter a service name");
      return;
    }
    try {
      setCreatingService(true);
      const res = await fetch("/api/admin/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          branchId: servicesModalBranchId,
          name: newService.name.trim(),
          description: newService.description.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create service");
      }
      setNewService({ name: "", description: "" });
      showToast("Service type added! Branch staff will set its price.");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setCreatingService(false);
    }
  };

  // Start inline edit of a service (name/description only)
  const startEditService = (service: any) => {
    setEditingServiceId(service.id);
    setEditingServiceDraft({
      name: service.name,
      description: service.description || "",
    });
  };

  // Save inline edit
  const handleSaveEditService = async (serviceId: string) => {
    if (!editingServiceDraft) return;
    if (!editingServiceDraft.name.trim()) {
      alert("Please enter a service name");
      return;
    }
    try {
      setSavingServiceId(serviceId);
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingServiceDraft.name.trim(),
          description: editingServiceDraft.description.trim() || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update service");
      }
      setEditingServiceId(null);
      setEditingServiceDraft(null);
      showToast("Service updated successfully!");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingServiceId(null);
    }
  };

  // Toggle a service's active status
  const handleToggleServiceActive = async (service: any) => {
    try {
      setSavingServiceId(service.id);
      const res = await fetch(`/api/admin/services/${service.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update service");
      }
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSavingServiceId(null);
    }
  };

  // Delete a service
  const handleDeleteService = async (serviceId: string) => {
    if (!confirm("Delete this service? This cannot be undone.")) return;
    try {
      setDeletingServiceId(serviceId);
      const res = await fetch(`/api/admin/services/${serviceId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete service");
      }
      showToast("Service deleted.");
      await loadData();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setDeletingServiceId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 bg-emerald-600 text-white text-xs font-bold px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2 animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          {successToast}
        </div>
      )}

      {/* Top Navbar */}
      <header className="bg-slate-900 text-white border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white font-bold flex items-center justify-center text-sm">
            CW
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-tight flex items-center gap-2">
              {t("admin_login_title")}
              <span className="text-[10px] font-semibold bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded">
                {language === "ar" ? "مدير النظام" : "Super Admin"}
              </span>
            </h1>
            <p className="text-xs text-slate-400">{t("admin_login_subtitle")}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <LanguageSwitcher variant="inline" className="bg-slate-800 text-white border-slate-700 hover:bg-slate-700 hover:text-white" />
          <Link
            href="/"
            className="text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {t("home")}
          </Link>
          <button
            onClick={handleLogout}
            className="text-xs bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("logout")}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6">
        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            <button
              onClick={() => setActiveTab("BRANCHES")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === "BRANCHES"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              {t("admin_tab_branches")} ({branches.length})
            </button>
            <button
              onClick={() => setActiveTab("BRANDS")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === "BRANDS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              {t("admin_tab_brands")} ({brands.length})
            </button>
            <button
              onClick={() => setActiveTab("STAFF")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === "STAFF"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              {t("admin_tab_staff")} ({staffMembers.length})
            </button>
            <button
              onClick={() => setActiveTab("BOOKINGS")}
              className={`text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-2 ${
                activeTab === "BOOKINGS"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-600 hover:bg-slate-200"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              {t("admin_tab_bookings")} ({bookings.length})
            </button>
          </div>
        </div>

        {/* TAB 1: BRANCHES & QR CODES */}
        {activeTab === "BRANCHES" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Registered Branches</h2>
                <p className="text-xs text-slate-500">
                  Each branch has one unique QR identifier and dedicated staff. Total: {branches.length}
                </p>
              </div>
              <button
                onClick={() => {
                  const initialBrandId = brands[0]?.id || "";
                  setNewBranch({
                    brandId: initialBrandId,
                    name: "",
                    slug: "",
                    address: "",
                    phone: "",
                    qrIdentifier: "",
                    openTime: "09:00",
                    closeTime: "22:00",
                    avgDurationMinutes: 30,
                    numberOfBays: 3,
                  });
                  setShowCreateBranch(true);
                }}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Branch
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {branches.map((branch) => (
                <div
                  key={branch.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded">
                        {branch.brand?.name || "Clean Car"}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 mt-1">{branch.name}</h3>
                      <p className="text-xs text-slate-500">{branch.address || "Branch location"}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        branch.isActive
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {branch.isActive ? "ACTIVE" : "INACTIVE"}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 bg-slate-50 rounded-xl p-3 text-xs border border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Hours</span>
                      <span className="font-semibold text-slate-700">
                        {branch.openTime} - {branch.closeTime}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Bays</span>
                      <span className="font-semibold text-slate-700">
                        {branch.washBays?.length || 0} Bays
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Avg Duration</span>
                      <span className="font-semibold text-slate-700">
                        {branch.avgDurationMinutes} mins
                      </span>
                    </div>
                  </div>

                  {/* Dedicated Staff for this Branch */}
                  <div className="bg-slate-50/90 rounded-xl p-3 text-xs border border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5 text-blue-600" />
                        Dedicated Staff ({branch.users?.length || 0})
                      </span>
                      <button
                        onClick={() => {
                          setNewStaff({
                            name: "",
                            email: "",
                            password: "",
                            branchId: branch.id,
                          });
                          setShowCreateStaff(true);
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 bg-blue-100/60 hover:bg-blue-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        Assign Staff
                      </button>
                    </div>

                    {branch.users && branch.users.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {branch.users.map((staff: any) => (
                          <div
                            key={staff.id}
                            className="bg-white border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] flex items-center gap-1.5 shadow-2xs"
                          >
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                            <span className="font-semibold text-slate-800">{staff.name}</span>
                            <span className="text-[10px] text-slate-400 font-mono">({staff.email})</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">
                        No staff assigned yet. Click &quot;Assign Staff&quot; to add.
                      </p>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                    <button
                      onClick={() => handleOpenQR(branch)}
                      className="flex-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      View & Print QR
                    </button>

                    <a
                      href={`/book/${branch.qrIdentifier}`}
                      target="_blank"
                      rel="noreferrer"
                      className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      title="Open Customer Booking Page"
                    >
                      <span>Test Booking</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>

                    <button
                      onClick={() => openServicesModal(branch.id)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                      title="Manage Services & Pricing"
                    >
                      <DollarSign className="w-3.5 h-3.5" />
                      Services
                    </button>

                    <button
                      onClick={() =>
                        setEditBranch({
                          ...branch,
                          numberOfBays: branch.washBays?.length || 3,
                        })
                      }
                      className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold p-2 rounded-xl text-xs flex items-center justify-center transition-colors"
                      title="Edit Branch Settings"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 2: BRANDS */}
        {activeTab === "BRANDS" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Car Wash Brands</h2>
                <p className="text-xs text-slate-500">Manage brands and explore branches under each brand.</p>
              </div>
              <button
                onClick={() => setShowCreateBrand(true)}
                className="text-xs bg-slate-900 hover:bg-slate-800 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Brand
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {brands.map((brand) => (
                <div
                  key={brand.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-3 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex justify-between items-start">
                      <h3 className="text-base font-bold text-slate-900">{brand.name}</h3>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        ACTIVE
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1">Slug: {brand.slug}</p>
                    <div className="mt-3 pt-2 border-t border-slate-100 flex justify-between text-xs text-slate-600">
                      <span>Total Branches:</span>
                      <span className="font-bold text-slate-900">
                        {brand._count?.branches || 0}
                      </span>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex gap-2">
                    <Link
                      href={`/brand/${brand.slug}`}
                      target="_blank"
                      className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold py-2 px-3 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <span>Public Brand Page</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: STAFF MEMBERS */}
        {activeTab === "STAFF" && (
          <div className="space-y-4 animate-fade-in">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Branch Staff Members</h2>
                <p className="text-xs text-slate-500">
                  Each staff member is assigned to a specific branch to manage bays, schedule, and mark bookings.
                </p>
              </div>
              <button
                onClick={() => {
                  setNewStaff({
                    name: "",
                    email: "",
                    password: "",
                    branchId: branches[0]?.id || "",
                  });
                  setShowCreateStaff(true);
                }}
                className="text-xs bg-blue-600 hover:bg-blue-700 text-white font-bold px-3.5 py-2 rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add New Staff Member
              </button>
            </div>

            {/* Staff Filters */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Search name, email..."
                      value={staffSearchQuery}
                      onChange={(e) => setStaffSearchQuery(e.target.value)}
                      className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={filterStaffBranch}
                    onChange={(e) => setFilterStaffBranch(e.target.value)}
                    className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.brand?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <span className="text-xs text-slate-400">
                  Showing {filteredStaff.length} of {staffMembers.length} Staff
                </span>
              </div>

              {/* Staff Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                      <th className="p-3">Staff Name</th>
                      <th className="p-3">Email Address</th>
                      <th className="p-3">Assigned Branch</th>
                      <th className="p-3">Brand</th>
                      <th className="p-3">Role</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStaff.map((staff) => (
                      <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                            {staff.name.charAt(0).toUpperCase()}
                          </div>
                          <span>{staff.name}</span>
                        </td>
                        <td className="p-3 text-slate-600 font-mono">
                          {staff.email}
                        </td>
                        <td className="p-3">
                          {staff.branch ? (
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                              {staff.branch.name}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>
                        <td className="p-3 text-slate-600">
                          {staff.branch?.brand?.name || "—"}
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                            BRANCH_STAFF
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() =>
                                setEditStaff({
                                  id: staff.id,
                                  name: staff.name,
                                  email: staff.email,
                                  branchId: staff.branchId || "",
                                  password: "",
                                })
                              }
                              className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-1.5 rounded-lg transition-colors"
                              title="Edit Staff Member"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteStaff(staff.id, staff.name)}
                              className="bg-rose-50 hover:bg-rose-100 text-rose-600 p-1.5 rounded-lg transition-colors"
                              title="Delete Staff Member"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredStaff.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-slate-400">
                          No staff members found matching criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: GLOBAL BOOKINGS */}
        {activeTab === "BOOKINGS" && (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-4 animate-fade-in">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-900">Global Bookings Directory</h2>
                <p className="text-xs text-slate-500">
                  Real-time monitor of appointments across all brands & branches.
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search name, phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                <select
                  value={filterBranch}
                  onChange={(e) => setFilterBranch(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="CONFIRMED">CONFIRMED</option>
                  <option value="WASHING">WASHING</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="CANCELLED">CANCELLED</option>
                  <option value="NO_SHOW">NO_SHOW</option>
                </select>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase tracking-wider text-[10px] font-bold border-b border-slate-200">
                    <th className="p-3">Booking #</th>
                    <th className="p-3">Branch</th>
                    <th className="p-3">Assigned Bay</th>
                    <th className="p-3">Customer</th>
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Status</th>
                    <th className="p-3 text-right">{t("admin_actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3 font-bold text-slate-900">{b.bookingNumber}</td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{b.branchName}</span>
                        <span className="block text-[10px] text-slate-400">{b.brandName}</span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                          {b.assignedBayName}
                        </span>
                      </td>
                      <td className="p-3">
                        <span className="font-semibold text-slate-800">{b.customerName}</span>
                        <span className="block text-[10px] text-slate-400">{b.customerPhone}</span>
                      </td>
                      <td className="p-3 text-slate-700">
                        {b.displayDate} • {b.displayTime}
                      </td>
                      <td className="p-3">
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
                          {b.status}
                        </span>
                      </td>
                      <td className="p-3 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingBooking(b);
                            setTargetStatusDraft(b.status);
                          }}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>{t("admin_action_edit_status")}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-400">
                        No bookings found matching filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* EDIT BOOKING STATUS MODAL */}
        {editingBooking && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <Edit2 className="w-4 h-4 text-blue-600" />
                    {t("admin_edit_status_title")}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingBooking.bookingNumber} • {editingBooking.branchName}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingBooking(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Booking Summary */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("fullName")}:</span>
                  <span className="font-semibold text-slate-900">{editingBooking.customerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("phone")}:</span>
                  <span className="font-semibold text-slate-900 font-mono">{editingBooking.customerPhone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">{t("book_summary_time")}:</span>
                  <span className="font-semibold text-slate-900">{editingBooking.displayTime}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">{t("my_booking_status_label")}</span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      editingBooking.status === "CONFIRMED"
                        ? "bg-blue-50 text-blue-700 border border-blue-200"
                        : editingBooking.status === "WASHING"
                        ? "bg-amber-50 text-amber-800 border border-amber-200"
                        : editingBooking.status === "COMPLETED"
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {editingBooking.status}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-[11px] text-blue-900">
                {t("admin_revert_completed_hint")}
              </div>

              {/* Status Selection Form */}
              <div className="space-y-3 pt-1">
                <div>
                  <label className="font-semibold text-xs text-slate-700 block mb-1">
                    {t("admin_change_status_to")}
                  </label>
                  <select
                    value={targetStatusDraft}
                    onChange={(e) => setTargetStatusDraft(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="CONFIRMED">CONFIRMED (مؤكد)</option>
                    <option value="WASHING">WASHING (قيد التنفيذ)</option>
                    <option value="COMPLETED">COMPLETED (مكتمل)</option>
                    <option value="CANCELLED">CANCELLED (ملغي)</option>
                    <option value="NO_SHOW">NO_SHOW (لم يحضر)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={updatingBookingStatus}
                    onClick={() => handleUpdateBookingStatus(editingBooking.id, "CONFIRMED")}
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>{language === "ar" ? "إعادة إلى مؤكد" : "Reopen / Confirmed"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={updatingBookingStatus}
                    onClick={() => handleUpdateBookingStatus(editingBooking.id, "CANCELLED")}
                    className="bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold py-2 px-2.5 rounded-xl text-xs flex items-center justify-center gap-1 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>{t("staff_action_cancel")}</span>
                  </button>
                </div>

                <button
                  type="button"
                  disabled={updatingBookingStatus}
                  onClick={() => handleUpdateBookingStatus(editingBooking.id, targetStatusDraft)}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 transition-colors mt-2"
                >
                  {updatingBookingStatus ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{t("staff_save_changes")}</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* QR MODAL */}
        {qrModalBranch && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-sm text-slate-900">Branch QR Code</h3>
                <button
                  onClick={() => setQrModalBranch(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h4 className="text-lg font-black text-slate-900">{qrModalBranch.name}</h4>
                <p className="text-xs text-slate-500">{qrModalBranch.brand?.name || "Clean Car"}</p>
              </div>

              {qrLoading ? (
                <div className="py-12 flex justify-center">
                  <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : qrData ? (
                <div className="space-y-4">
                  <div className="p-3 bg-white border border-slate-200 rounded-2xl shadow-inner inline-block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={qrData.qrDataUrl}
                      alt="Branch QR Code"
                      className="w-56 h-56 mx-auto rounded-lg"
                    />
                  </div>

                  <p className="text-[11px] text-slate-400 font-mono break-all px-2">
                    {qrData.bookingUrl}
                  </p>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopyLink}
                      className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                    >
                      {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      {copiedLink ? "Copied!" : "Copy Link"}
                    </button>

                    <a
                      href={qrData.qrDataUrl}
                      download={`QR-${qrModalBranch.qrIdentifier}.png`}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Save PNG
                    </a>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        )}

        {/* CREATE STAFF MODAL */}
        {showCreateStaff && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  Add New Staff Member
                </h3>
                <button
                  onClick={() => setShowCreateStaff(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateStaff} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Assigned Branch</label>
                  <select
                    required
                    value={newStaff.branchId}
                    onChange={(e) => setNewStaff({ ...newStaff, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.brand?.name})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    This staff member will be dedicated exclusively to this branch.
                  </p>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Staff Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Mostafa Mahmoud"
                    value={newStaff.name}
                    onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    placeholder="e.g. staff.maadi@cleancar.com"
                    value={newStaff.email}
                    onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Password (Min. 6 chars)</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="••••••••"
                    value={newStaff.password}
                    onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={creatingStaff}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl mt-2 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingStaff ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating Staff...
                    </>
                  ) : (
                    "Create Staff Account"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* EDIT STAFF MODAL */}
        {editStaff && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-blue-600" />
                  Edit Staff Member
                </h3>
                <button
                  onClick={() => setEditStaff(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateStaff} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Assigned Branch</label>
                  <select
                    required
                    value={editStaff.branchId}
                    onChange={(e) => setEditStaff({ ...editStaff, branchId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.brand?.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Staff Full Name</label>
                  <input
                    type="text"
                    required
                    value={editStaff.name}
                    onChange={(e) => setEditStaff({ ...editStaff, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editStaff.email}
                    onChange={(e) => setEditStaff({ ...editStaff, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">
                    New Password (leave blank to keep current)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    placeholder="Leave blank to keep unchanged"
                    value={editStaff.password || ""}
                    onChange={(e) => setEditStaff({ ...editStaff, password: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                </div>

                <button
                  type="submit"
                  disabled={updatingStaff}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl mt-2 transition-colors flex items-center justify-center gap-2"
                >
                  {updatingStaff ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving Changes...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CREATE BRANCH MODAL */}
        {showCreateBranch && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900">Add New Branch</h3>
                <button
                  onClick={() => setShowCreateBranch(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBranch} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Brand</label>
                  <select
                    required
                    value={newBranch.brandId}
                    onChange={(e) => setNewBranch({ ...newBranch, brandId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Branch Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Heliopolis Branch"
                    value={newBranch.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cleanSlug = val.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-");
                      const randomSuffix = Math.floor(100 + Math.random() * 900);
                      setNewBranch({
                        ...newBranch,
                        name: val,
                        slug: cleanSlug || "branch",
                        qrIdentifier: cleanSlug ? `${cleanSlug}-${randomSuffix}` : `branch-${randomSuffix}`,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="font-semibold block mb-1">Unique QR Identifier</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. heliopolis-branch"
                    value={newBranch.qrIdentifier}
                    onChange={(e) => setNewBranch({ ...newBranch, qrIdentifier: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl font-mono"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Will be used in the booking URL: /book/{newBranch.qrIdentifier || "identifier"}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Open Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      placeholder="09:00"
                      value={newBranch.openTime}
                      onChange={(e) => setNewBranch({ ...newBranch, openTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Close Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      placeholder="22:00"
                      value={newBranch.closeTime}
                      onChange={(e) => setNewBranch({ ...newBranch, closeTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Number of Bays</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={newBranch.numberOfBays}
                      onChange={(e) =>
                        setNewBranch({ ...newBranch, numberOfBays: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Avg Duration (Mins)</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      required
                      value={newBranch.avgDurationMinutes}
                      onChange={(e) =>
                        setNewBranch({ ...newBranch, avgDurationMinutes: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={creatingBranch}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl mt-2 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingBranch ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Branch & Generate QR"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* CREATE BRAND MODAL */}
        {showCreateBrand && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900">Add New Brand</h3>
                <button
                  onClick={() => setShowCreateBrand(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateBrand} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Brand Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Royal Wash"
                    value={newBrand.name}
                    onChange={(e) =>
                      setNewBrand({
                        name: e.target.value,
                        slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Brand Slug</label>
                  <input
                    type="text"
                    required
                    placeholder="royal-wash"
                    value={newBrand.slug}
                    onChange={(e) => setNewBrand({ ...newBrand, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>
                <button
                  type="submit"
                  disabled={creatingBrand}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl mt-2 transition-colors flex items-center justify-center gap-2"
                >
                  {creatingBrand ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Brand"
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* EDIT BRANCH MODAL */}
        {editBranch && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-base text-slate-900">Edit Branch Settings</h3>
                <button
                  onClick={() => setEditBranch(null)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveEditBranch} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Branch Name</label>
                  <input
                    type="text"
                    required
                    value={editBranch.name}
                    onChange={(e) => setEditBranch({ ...editBranch, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Open Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      value={editBranch.openTime}
                      onChange={(e) => setEditBranch({ ...editBranch, openTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Close Time (HH:mm)</label>
                    <input
                      type="text"
                      required
                      value={editBranch.closeTime}
                      onChange={(e) => setEditBranch({ ...editBranch, closeTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="font-semibold block mb-1">Number of Bays</label>
                    <input
                      type="number"
                      min={1}
                      max={20}
                      required
                      value={editBranch.numberOfBays}
                      onChange={(e) =>
                        setEditBranch({ ...editBranch, numberOfBays: Number(e.target.value) })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Avg Duration (Mins)</label>
                    <input
                      type="number"
                      min={5}
                      max={180}
                      required
                      value={editBranch.avgDurationMinutes}
                      onChange={(e) =>
                        setEditBranch({
                          ...editBranch,
                          avgDurationMinutes: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="isActiveCheck"
                    checked={editBranch.isActive}
                    onChange={(e) => setEditBranch({ ...editBranch, isActive: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  <label htmlFor="isActiveCheck" className="font-semibold text-slate-700">
                    Branch is Active for Bookings
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 rounded-xl mt-2 transition-colors"
                >
                  Save Changes
                </button>
              </form>
            </div>
          </div>
        )}

        {/* MANAGE SERVICES MODAL */}
        {servicesModalBranch && (
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-emerald-600" />
                    Service Types
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{servicesModalBranch.name}</p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    You control which services exist. Branch staff set and update each service&apos;s price and wash duration from their own dashboard.
                  </p>
                </div>
                <button
                  onClick={closeServicesModal}
                  className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Existing services list */}
              <div className="space-y-2">
                {(servicesModalBranch.services || []).length === 0 && (
                  <p className="text-xs text-slate-400 italic text-center py-4">
                    No services yet. Add the first one below.
                  </p>
                )}

                {(servicesModalBranch.services || []).map((service: any) => (
                  <div
                    key={service.id}
                    className={`border rounded-xl p-3 ${
                      service.isActive
                        ? "border-slate-200 bg-white"
                        : "border-slate-100 bg-slate-50 opacity-60"
                    }`}
                  >
                    {editingServiceId === service.id && editingServiceDraft ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingServiceDraft.name}
                          onChange={(e) =>
                            setEditingServiceDraft({ ...editingServiceDraft, name: e.target.value })
                          }
                          placeholder="Service name (e.g. تلميع فوانيس / Headlight Polish)"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                        />
                        {editingServiceDraft.name.trim() && (
                          <div className="bg-blue-50 border border-blue-100 rounded-lg px-2.5 py-1.5 text-[11px] flex items-center justify-between text-blue-900">
                            <span className="text-slate-500">
                              {language === "ar" ? "الترجمة التلقائية:" : "Auto Translation:"}
                            </span>
                            <span className="font-bold">
                              {translateCarWashText(
                                editingServiceDraft.name,
                                language === "ar" ? "en" : "ar"
                              )}
                            </span>
                          </div>
                        )}
                        <input
                          type="text"
                          value={editingServiceDraft.description}
                          onChange={(e) =>
                            setEditingServiceDraft({
                              ...editingServiceDraft,
                              description: e.target.value,
                            })
                          }
                          placeholder="Description (optional)"
                          className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleSaveEditService(service.id)}
                            disabled={savingServiceId === service.id}
                            className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold py-2 text-xs rounded-lg transition-colors"
                          >
                            {savingServiceId === service.id ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingServiceId(null);
                              setEditingServiceDraft(null);
                            }}
                            className="bg-slate-100 hover:bg-slate-200 text-slate-600 font-semibold py-2 px-3 text-xs rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {tServiceName(service.name)}
                            </p>
                            <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              {tServiceName(service.name) !== service.name
                                ? service.name
                                : translateCarWashText(service.name, language === "ar" ? "en" : "ar")}
                            </span>
                            {!service.isActive && (
                              <span className="text-[9px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.5 rounded uppercase">
                                Hidden
                              </span>
                            )}
                          </div>
                          {service.description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">
                              {tServiceDesc(service.description, service.name)}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <p className="text-xs font-extrabold text-emerald-700">
                              {formatCurrency(service.price)}
                            </p>
                            <span className="text-[10px] font-semibold text-slate-500">
                              • {service.durationMinutes} min
                            </span>
                          </div>
                          <p className="text-[9px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">
                            price & duration set by branch staff
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleToggleServiceActive(service)}
                            disabled={savingServiceId === service.id}
                            title={service.isActive ? "Hide from customers" : "Show to customers"}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 disabled:opacity-50"
                          >
                            {service.isActive ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <RefreshCw className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => startEditService(service)}
                            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            disabled={deletingServiceId === service.id}
                            className="w-7 h-7 rounded-lg bg-rose-50 hover:bg-rose-100 flex items-center justify-center text-rose-600 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Add new service form */}
              <form
                onSubmit={handleCreateService}
                className="border-t border-slate-100 pt-4 space-y-2.5"
              >
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Add New Service Type
                </p>
                <input
                  type="text"
                  required
                  value={newService.name}
                  onChange={(e) => setNewService({ ...newService, name: e.target.value })}
                  placeholder="Service Name (e.g. تلميع فوانيس / Headlight Polish)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                {newService.name.trim() && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 text-xs flex items-center justify-between text-emerald-950">
                    <span className="text-slate-500 font-medium">
                      {language === "ar" ? "🌐 الترجمة التلقائية:" : "🌐 Auto Translation:"}
                    </span>
                    <span className="font-bold text-emerald-800">
                      {translateCarWashText(newService.name, language === "ar" ? "en" : "ar")}
                    </span>
                  </div>
                )}
                <input
                  type="text"
                  value={newService.description}
                  onChange={(e) => setNewService({ ...newService, description: e.target.value })}
                  placeholder="Description (optional)"
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg"
                />
                <button
                  type="submit"
                  disabled={creatingService}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-2.5 text-xs rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                >
                  {creatingService ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Plus className="w-3.5 h-3.5" />
                  )}
                  Add Service Type
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  New services will automatically be translated and available to customers in both Arabic & English!
                </p>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
