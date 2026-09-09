"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, AlertCircle, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FoamLogo from "@/components/FoamLogo";

export default function AdminLoginPage() {
  const router = useRouter();
  const { t, dir, language } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("somethingWentWrong"));
      }

      if (data.user.role !== "ADMIN") {
        throw new Error(
          language === "ar"
            ? "غير مسموح بالدخول: يلزم استخدام حساب مسؤول النظام (Admin)."
            : "Access denied: Admin credentials required."
        );
      }

      router.push("/admin/dashboard");
    } catch (err: any) {
      setError(err.message || t("somethingWentWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-sm flex justify-end mb-3">
        <LanguageSwitcher variant="inline" />
      </div>

      <div className="max-w-sm w-full bg-white border border-slate-200 rounded-3xl p-7 shadow-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <FoamLogo size="lg" showText={false} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {language === "ar" ? "لوحة تحكم المسؤول" : "Super Admin Center"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === "ar"
                ? "منظومة فوم - التحكم المركزي"
                : "FOAM Central Administration"}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              {t("admin_login_email")}
            </label>
            <div className="relative">
              <Mail className={`w-4 h-4 text-slate-400 absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`} />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={language === "ar" ? "أدخل بريدك الإلكتروني" : "admin@example.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                  dir === "rtl" ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                }`}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {language === "ar" ? "كلمة المرور" : "Password"}
            </label>
            <div className="relative">
              <Lock className={`w-4 h-4 text-slate-400 absolute top-3 ${dir === "rtl" ? "right-3" : "left-3"}`} />
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all ${
                  dir === "rtl" ? "pr-9 pl-3" : "pl-9 pr-3"
                }`}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all mt-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>{language === "ar" ? "تسجيل الدخول" : "Sign In"}</span>
                <ArrowIcon className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-2 border-t border-slate-100">
          <Link href="/" className="text-xs text-slate-500 hover:text-slate-800 transition-colors">
            {language === "ar" ? "→ العودة للصفحة الرئيسية" : "← Return to Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
