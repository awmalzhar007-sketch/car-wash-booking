"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  UserCheck,
  Lock,
  Mail,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import FoamLogo from "@/components/FoamLogo";

export default function StaffLoginPage() {
  const router = useRouter();
  const { t, dir, language } = useLanguage();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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

      if (data.user.role !== "BRANCH_STAFF") {
        throw new Error(
          language === "ar"
            ? "هذا الحساب ليس حساب موظف. يرجى استخدام بوابة المسؤول."
            : "This account is not a staff account. Please use the admin portal."
        );
      }

      router.push("/staff/dashboard");
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
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <FoamLogo size="lg" showText={false} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {language === "ar" ? "بوابة طاقم الفرع" : "Staff Sign In"}
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {language === "ar"
                ? "منظومة فوم الذكية لإدارة المغاسل"
                : "FOAM Smart Car Wash System"}
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Email */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {language === "ar" ? "البريد الإلكتروني" : "Email Address"}
            </label>
            <div className="relative">
              <Mail
                className={`w-4 h-4 text-slate-400 absolute top-3 ${
                  dir === "rtl" ? "right-3" : "left-3"
                }`}
              />
              <input
                type="email"
                required
                autoComplete="email"
                placeholder={
                  language === "ar" ? "أدخل بريدك الإلكتروني" : "your@email.com"
                }
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${
                  dir === "rtl" ? "pr-9 pl-3 text-right" : "pl-9 pr-3"
                }`}
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {language === "ar" ? "كلمة المرور" : "Password"}
            </label>
            <div className="relative">
              <Lock
                className={`w-4 h-4 text-slate-400 absolute top-3 ${
                  dir === "rtl" ? "right-3" : "left-3"
                }`}
              />
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`w-full py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900 transition-all ${
                  dir === "rtl" ? "pr-9 pl-10" : "pl-9 pr-10"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                tabIndex={-1}
                className={`absolute top-2.5 ${
                  dir === "rtl" ? "left-3" : "right-3"
                } text-slate-400 hover:text-slate-700 transition-colors`}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl text-sm shadow-md flex items-center justify-center gap-2 transition-all mt-2"
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

        {/* Footer */}
        <div className="text-center pt-2 border-t border-slate-100">
          <Link
            href="/"
            className="text-xs text-slate-500 hover:text-slate-800 transition-colors"
          >
            {language === "ar" ? "→ العودة للصفحة الرئيسية" : "← Return to Home"}
          </Link>
        </div>
      </div>
    </div>
  );
}
