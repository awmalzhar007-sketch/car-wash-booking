"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { translations, Language, TranslationKey, serviceTranslations } from "./translations";
import { splitBilingualString, translateCarWashText } from "./translator";

interface LanguageContextType {
  language: Language;
  dir: "rtl" | "ltr";
  toggleLanguage: () => void;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey | string, fallback?: string) => string;
  tServiceName: (name: string) => string;
  tServiceDesc: (desc?: string | null, serviceName?: string) => string;
  formatPrice: (amount: number) => string;
  formatTime: (timeStr: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_KEY = "carwash_app_language";

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  // Default to Arabic ('ar') as requested by user
  const [language, setLanguageState] = useState<Language>("ar");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      const savedLang = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (savedLang === "ar" || savedLang === "en") {
        setLanguageState(savedLang);
      }
    } catch {
      // localStorage may not be accessible in some environments
    }
    setMounted(true);
  }, []);

  const dir: "rtl" | "ltr" = language === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = language;
      document.documentElement.dir = dir;
      if (language === "ar") {
        document.documentElement.classList.add("rtl");
        document.documentElement.classList.remove("ltr");
      } else {
        document.documentElement.classList.add("ltr");
        document.documentElement.classList.remove("rtl");
      }
    }
  }, [language, dir]);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  const toggleLanguage = () => {
    const nextLang: Language = language === "ar" ? "en" : "ar";
    setLanguage(nextLang);
  };

  const t = (key: TranslationKey | string, fallback?: string): string => {
    const currentDict = translations[language] as Record<string, string>;
    if (key in currentDict) {
      return currentDict[key];
    }
    const fallbackDict = translations[language === "ar" ? "en" : "ar"] as Record<string, string>;
    if (key in fallbackDict) {
      return fallbackDict[key];
    }
    return fallback ?? String(key);
  };

  const normalizeKey = (str: string) => str.trim().toLowerCase();

  const tServiceName = (name: string): string => {
    if (!name) return "";

    // 1. Check if name has bilingual representation ("English | العربية")
    const split = splitBilingualString(name);
    if (split) {
      return split[language];
    }

    // 2. Check static curated dictionary
    const key = normalizeKey(name);
    const found = serviceTranslations[key];
    if (found && found[language]) {
      return found[language].name;
    }

    // 3. Dynamic bidirectional translator for any newly added/custom service!
    return translateCarWashText(name, language);
  };

  const tServiceDesc = (desc?: string | null, serviceName?: string): string => {
    if (serviceName) {
      const splitName = splitBilingualString(serviceName);
      const key = normalizeKey(splitName ? splitName.en : serviceName);
      const found = serviceTranslations[key];
      if (found && found[language]?.description) {
        return found[language].description!;
      }
    }
    if (!desc) return "";

    // 1. Check if description has bilingual representation
    const split = splitBilingualString(desc);
    if (split) {
      return split[language];
    }

    // 2. Check static curated dictionary
    const descKey = normalizeKey(desc);
    for (const item of Object.values(serviceTranslations)) {
      if (
        (item.en.description && normalizeKey(item.en.description) === descKey) ||
        (item.ar.description && normalizeKey(item.ar.description) === descKey)
      ) {
        return item[language].description || desc;
      }
    }

    // 3. Dynamic bidirectional translator for custom descriptions
    return translateCarWashText(desc, language);
  };

  const formatPrice = (amount: number): string => {
    const rounded = Math.round(amount * 100) / 100;
    const formattedNum = rounded.toLocaleString(language === "ar" ? "ar-EG" : "en-US", {
      minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    });
    if (language === "ar") {
      return `${formattedNum} ج.م`;
    }
    return `EGP ${formattedNum}`;
  };

  const formatTime = (timeStr: string): string => {
    if (!timeStr) return "";
    const [hStr, mStr] = timeStr.split(":");
    let hours = parseInt(hStr, 10);
    const minutes = mStr || "00";
    if (language === "ar") {
      const isPM = hours >= 12;
      hours = hours % 12;
      if (hours === 0) hours = 12;
      return `${hours}:${minutes} ${isPM ? "م" : "ص"}`;
    }
    const isPM = hours >= 12;
    hours = hours % 12;
    if (hours === 0) hours = 12;
    return `${hours}:${minutes} ${isPM ? "PM" : "AM"}`;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        dir,
        toggleLanguage,
        setLanguage,
        t,
        tServiceName,
        tServiceDesc,
        formatPrice,
        formatTime,
      }}
    >
      <div dir={dir} className={dir === "rtl" ? "font-arabic" : ""}>
        {children}
      </div>
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
