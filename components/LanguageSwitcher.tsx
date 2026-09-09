"use client";

import React from "react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import { Globe, Languages } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "inline" | "floating" | "compact";
  className?: string;
}

export default function LanguageSwitcher({
  variant = "inline",
  className = "",
}: LanguageSwitcherProps) {
  const { language, toggleLanguage, dir } = useLanguage();

  const isArabic = language === "ar";
  // The label displays what language you will switch TO:
  const nextLangLabel = isArabic ? "English" : "العربية";
  const flag = isArabic ? "🇬🇧" : "🇪🇬";

  if (variant === "floating") {
    return (
      <div
        className="fixed bottom-5 z-50 transition-all duration-300 pointer-events-auto"
        style={{
          [dir === "rtl" ? "left" : "right"]: "1.25rem",
        }}
      >
        <button
          type="button"
          onClick={toggleLanguage}
          title={isArabic ? "Switch to English" : "التحويل للغة العربية"}
          className={`flex items-center gap-2 px-4 py-2.5 bg-white/95 hover:bg-white text-slate-800 hover:text-blue-600 rounded-full shadow-lg hover:shadow-xl border border-slate-200/80 backdrop-blur-md text-xs font-bold transition-all transform hover:-translate-y-0.5 active:translate-y-0 group ${className}`}
        >
          <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Languages className="w-3.5 h-3.5" />
          </span>
          <span className="tracking-wide">{nextLangLabel}</span>
          <span className="text-sm leading-none">{flag}</span>
        </button>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggleLanguage}
        title={isArabic ? "Switch to English" : "التحويل للغة العربية"}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors ${className}`}
      >
        <Globe className="w-3.5 h-3.5 text-slate-500" />
        <span>{nextLangLabel}</span>
        <span className="text-xs">{flag}</span>
      </button>
    );
  }

  // Default: inline
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      title={isArabic ? "Switch to English" : "التحويل للغة العربية"}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold bg-white/90 hover:bg-white text-slate-700 hover:text-blue-600 border border-slate-200 shadow-sm hover:shadow transition-all ${className}`}
    >
      <Globe className="w-3.5 h-3.5 text-blue-600" />
      <span>{nextLangLabel}</span>
      <span className="text-sm leading-none">{flag}</span>
    </button>
  );
}
