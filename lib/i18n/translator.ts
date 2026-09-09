/**
 * Automotive, Car Wash & Detailing Bidirectional Translator (Arabic <-> English)
 * Translates any newly created or existing services, descriptions, and custom terms dynamically.
 */

export function hasArabic(text: string): boolean {
  return /[\u0600-\u06FF]/.test(text);
}

export function hasEnglish(text: string): boolean {
  return /[a-zA-Z]/.test(text);
}

/**
 * Splits a bilingual combined string like "Headlight Polish | تلميع فوانيس"
 * or "غسيل خارجي / Exterior Wash" into separate language components.
 */
export function splitBilingualString(str: string): { ar: string; en: string } | null {
  if (!str) return null;
  const separators = [" | ", " /// ", " / ", " - "];
  for (const sep of separators) {
    if (str.includes(sep)) {
      const parts = str.split(sep).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        const arPart = parts.find((p) => hasArabic(p));
        const enPart = parts.find((p) => hasEnglish(p));
        if (arPart && enPart) {
          return { ar: arPart, en: enPart };
        }
      }
    }
  }
  return null;
}

// Master phrase glossary (sorted by length descending for longest-match-first)
const PHRASES: [string, string][] = [
  // 4+ words
  ["full package (exterior + interior)", "باقة شاملة (داخلي + خارجي)"],
  ["full package exterior + interior", "باقة شاملة خارجي وداخلي"],
  ["interior vacuum and wipe", "تنظيف داخلي وشفط أتربة"],
  ["interior vacuum & wipe", "تنظيف داخلي وشفط أتربة"],
  ["disinfection and sterilization", "تطهير وتعقيم شامل"],
  ["headlight restoration and polish", "تجديد وتلميع الفوانيس"],
  ["high pressure foam wash", "غسيل بالضغط العالي والرغوة"],

  // 3 words
  ["nano ceramic coating", "طلاء نانو سيراميك"],
  ["paint protection film", "فيلم حماية الطلاء PPF"],
  ["engine bay cleaning", "تنظيف حوض المحرك"],
  ["engine bay steam", "غسيل حوض المحرك بالبخار"],
  ["hot steam wash", "غسيل بالبخار الحار"],
  ["leather seat cleaning", "تنظيف المقاعد الجلدية"],
  ["fabric seat cleaning", "تنظيف المقاعد القماش"],
  ["carpet and mats", "السجاد والدواسات"],
  ["wax and polish", "تشميع وتلميع"],
  ["wax & polish", "تشميع وتلميع"],
  ["scratch and swirl", "إزالة الخدوش والدوائر"],
  ["air conditioning sanitization", "تعقيم فتحات التكييف"],
  ["ac vent cleaning", "تنظيف فتحات التكييف"],

  // 2 words
  ["exterior wash", "غسيل خارجي"],
  ["interior wash", "غسيل داخلي"],
  ["exterior cleaning", "تنظيف خارجي"],
  ["interior cleaning", "تنظيف داخلي"],
  ["full package", "باقة شاملة"],
  ["full wash", "غسيل كامل"],
  ["express wash", "غسيل سريع"],
  ["quick wash", "غسيل سريع"],
  ["fast wash", "غسيل سريع"],
  ["steam wash", "غسيل بالبخار"],
  ["steam cleaning", "تنظيف بالبخار"],
  ["dry cleaning", "تنظيف جاف"],
  ["dry wash", "غسيل جاف"],
  ["waterless wash", "غسيل بدون ماء"],
  ["foam wash", "غسيل بالرغوة"],
  ["snow foam", "رغوة ثلجية"],
  ["engine wash", "غسيل المحرك"],
  ["engine cleaning", "تنظيف المحرك"],
  ["underbody wash", "غسيل أسفل السيارة"],
  ["chassis wash", "غسيل الشاسيه"],
  ["nano ceramic", "نانو سيراميك"],
  ["ceramic coating", "طلاء سيراميك"],
  ["headlight polish", "تلميع فوانيس"],
  ["headlights polish", "تلميع الفوانيس"],
  ["headlight restoration", "تجديد الفوانيس"],
  ["leather cleaning", "تنظيف الجلد"],
  ["leather care", "العناية بالجلد"],
  ["leather treatment", "ترطيب ومعالجة الجلد"],
  ["seat wash", "غسيل الكراسي"],
  ["seats wash", "غسيل المقاعد"],
  ["seats cleaning", "تنظيف الكراسي"],
  ["mats cleaning", "تنظيف الدواسات"],
  ["mats wash", "غسيل الدواسات"],
  ["carpet cleaning", "تنظيف السجاد"],
  ["carpet wash", "غسيل السجاد"],
  ["trunk cleaning", "تنظيف الشنطة"],
  ["trunk wash", "غسيل الشنطة"],
  ["glass polish", "تلميع الزجاج"],
  ["window polish", "تلميع النوافذ"],
  ["windshield cleaning", "تنظيف الزجاج الأمامي"],
  ["windshield polish", "تلميع الزجاج الأمامي"],
  ["tire polish", "تلميع الكاوتش"],
  ["tire shine", "تلميع الإطارات"],
  ["rims polish", "تلميع الجنوط"],
  ["wheel cleaning", "تنظيف الجنوط"],
  ["odor removal", "إزالة الروائح"],
  ["car perfume", "تعطير السيارة"],
  ["car fragrance", "تعطير السيارة"],
  ["air freshener", "معطر جو"],
  ["scratch removal", "إزالة الخدوش"],
  ["paint protection", "حماية الطلاء"],
  ["paint correction", "تصحيح الطلاء"],
  ["thermal tinting", "عازل حراري"],
  ["window tinting", "تظليل الزجاج"],
  ["ac cleaning", "تنظيف التكييف"],
  ["ac sanitization", "تعقيم التكييف"],
  ["oil change", "تغيير زيت"],
  ["filter change", "تغيير فلتر"],
  ["full detailing", "ديتيلينج كامل"],
  ["interior detailing", "ديتيلينج داخلي"],
  ["exterior detailing", "ديتيلينج خارجي"],
  ["vip wash", "غسيل VIP فاخر"],
  ["premium wash", "غسيل بريميوم مميز"],
  ["deluxe wash", "غسيل ديلوكس"],
  ["hand wash", "غسيل يدوي"],
  ["rain repellent", "طارد للمطر"],
  ["dashboard polish", "تلميع التابلوه"],
  ["dashboard wipe", "مسح التابلوه"],
  ["plastic restoration", "تجديد البلاستيك"],
  ["stain removal", "إزالة البقع"],
  ["deep cleaning", "تنظيف عميق"],
  ["body polish", "تلميع البودي"],
];

// Single word dictionary
const WORDS_EN_TO_AR: Record<string, string> = {
  // Actions & Services
  wash: "غسيل",
  washing: "غسيل",
  clean: "تنظيف",
  cleaning: "تنظيف",
  polish: "تلميع",
  polishing: "تلميع",
  wax: "تشميع",
  waxing: "تشميع",
  coating: "طلاء حماية",
  protection: "حماية",
  protect: "حماية",
  steam: "بخار",
  foam: "رغوة",
  rinse: "شطف",
  dry: "جاف",
  drying: "تجفيف",
  vacuum: "شفط",
  wipe: "مسح",
  detailing: "ديتيلينج",
  detail: "عناية فائقة",
  restoration: "تجديد",
  restore: "تجديد",
  sanitization: "تعقيم",
  sanitize: "تعقيم",
  sterilization: "تعقيم",
  disinfection: "تطهير",
  tinting: "تظليل",
  tint: "تظليل",
  removal: "إزالة",
  remove: "إزالة",
  treatment: "معالجة",
  care: "عناية",
  change: "تغيير",
  correction: "تصحيح",
  repair: "إصلاح",
  shine: "لمعان",
  freshener: "معطر",
  perfume: "عطر",
  fragrance: "معطر",

  // Car Parts
  exterior: "خارجي",
  interior: "داخلي",
  engine: "المحرك",
  motor: "الموتور",
  bay: "حوض",
  underbody: "أسفل السيارة",
  chassis: "الشاسيه",
  tires: "إطارات",
  tire: "إطار",
  wheels: "عجلات",
  wheel: "عجلة",
  rims: "جنوط",
  rim: "جنط",
  glass: "زجاج",
  windows: "نوافذ",
  window: "نافذة",
  windshield: "زجاج أمامي",
  headlights: "فوانيس",
  headlight: "فانوس",
  lamps: "مصابيح",
  lamp: "مصباح",
  seats: "مقاعد",
  seat: "مقعد",
  chairs: "كراسي",
  chair: "كرسي",
  leather: "جلد",
  fabric: "قماش",
  upholstery: "فرش",
  mats: "دواسات",
  mat: "دواسة",
  carpet: "سجاد",
  carpets: "سجاد",
  trunk: "شنطة",
  roof: "سقف",
  ceiling: "سقف",
  dashboard: "تابلوه",
  door: "باب",
  doors: "أبواب",
  ac: "تكييف",
  vents: "فتحات",
  body: "بودي",
  paint: "طلاء",
  oil: "زيت",
  filter: "فلتر",
  battery: "بطارية",

  // Qualifiers & Modifiers
  full: "شامل",
  complete: "كامل",
  total: "كلي",
  express: "سريع",
  quick: "سريع",
  fast: "سريع",
  basic: "أساسي",
  standard: "عادي",
  simple: "بسيط",
  premium: "مميز",
  deluxe: "ديلوكس",
  vip: "فاخر",
  super: "سوبر",
  ultra: "فائق",
  deep: "عميق",
  hot: "حار",
  cold: "بارد",
  manual: "يدوي",
  hand: "يدوي",
  automatic: "أوتوماتيك",
  nano: "نانو",
  ceramic: "سيراميك",
  graphene: "جرافين",
  thermal: "حراري",
  waterless: "بدون ماء",
  water: "ماء",
  pressure: "ضغط",
  high: "عالي",
  package: "باقة",
  combo: "كومبو",
  bundle: "عرض",
  service: "خدمة",
  scratch: "خدش",
  scratches: "خدوش",
  stain: "بقعة",
  stains: "بقع",
  odor: "روائح",
  smell: "رائحة",
  and: "و",
  with: "مع",
  plus: "بلس",
  pro: "برو",
};

// Reverse map (Arabic to English)
const WORDS_AR_TO_EN: Record<string, string> = {
  غسيل: "Wash",
  تنظيف: "Cleaning",
  تلميع: "Polish",
  بوليش: "Polish",
  تشميع: "Wax",
  واكس: "Wax",
  شمع: "Wax",
  حماية: "Protection",
  طلاء: "Coating",
  بخار: "Steam",
  رغوة: "Foam",
  فوم: "Foam",
  جاف: "Dry",
  تجفيف: "Drying",
  شفط: "Vacuum",
  كنس: "Vacuum",
  مسح: "Wipe",
  ديتيلينج: "Detailing",
  تجديد: "Restoration",
  تعقيم: "Sanitization",
  تطهير: "Disinfection",
  تظليل: "Tinting",
  إزالة: "Removal",
  معالجة: "Treatment",
  عناية: "Care",
  تغيير: "Change",
  تصحيح: "Correction",
  إصلاح: "Repair",
  معطر: "Freshener",
  تعطير: "Fragrance",
  عطر: "Perfume",

  خارجي: "Exterior",
  داخلي: "Interior",
  المحرك: "Engine",
  محرك: "Engine",
  الموتور: "Motor",
  موتور: "Motor",
  حوض: "Bay",
  شاسيه: "Chassis",
  الشاسيه: "Chassis",
  إطارات: "Tires",
  إطار: "Tire",
  كاوتش: "Tires",
  كوتش: "Tires",
  كفرات: "Tires",
  جنوط: "Rims",
  جنط: "Rim",
  عجلات: "Wheels",
  عجلة: "Wheel",
  زجاج: "Glass",
  نوافذ: "Windows",
  نافذة: "Window",
  فوانيس: "Headlights",
  فانوس: "Headlight",
  كشافات: "Headlights",
  مصابيح: "Headlights",
  مقاعد: "Seats",
  مقعد: "Seat",
  كراسي: "Seats",
  كرسي: "Seat",
  جلد: "Leather",
  قماش: "Fabric",
  فرش: "Upholstery",
  الصالون: "Interior Cabin",
  صالون: "Interior Cabin",
  دواسات: "Mats",
  دواسة: "Mat",
  سجاد: "Carpet",
  شنطة: "Trunk",
  سقف: "Roof",
  تابلوه: "Dashboard",
  أبواب: "Doors",
  باب: "Door",
  تكييف: "AC",
  بودي: "Body",
  زيت: "Oil",
  فلتر: "Filter",
  بطارية: "Battery",

  شامل: "Full",
  كامل: "Full",
  كلي: "Total",
  سريع: "Express",
  أساسي: "Basic",
  عادي: "Standard",
  بسيط: "Simple",
  مميز: "Premium",
  ديلوكس: "Deluxe",
  فاخر: "VIP",
  سوبر: "Super",
  فائق: "Ultra",
  عميق: "Deep",
  حار: "Hot",
  بارد: "Cold",
  يدوي: "Hand",
  أوتوماتيك: "Automatic",
  نانو: "Nano",
  سيراميك: "Ceramic",
  جرافين: "Graphene",
  حراري: "Thermal",
  ماء: "Water",
  ضغط: "Pressure",
  عالي: "High",
  باقة: "Package",
  كومبو: "Combo",
  عرض: "Bundle",
  خدمة: "Service",
  خدوش: "Scratches",
  خدش: "Scratch",
  بقع: "Stains",
  بقعة: "Stain",
  روائح: "Odors",
  رائحة: "Odor",
  بلس: "Plus",
  برو: "Pro",
};

/**
 * Normalizes an Arabic word by stripping common prefixes:
 * "ال" (the), "و" (and), "ب" (with), "ل" (for)
 */
function normalizeArabicToken(token: string): { clean: string; hadAnd: boolean; hadWith: boolean } {
  let clean = token.trim();
  let hadAnd = false;
  let hadWith = false;

  // Check conjunction "و" (and)
  if (clean.length > 2 && clean.startsWith("و")) {
    hadAnd = true;
    clean = clean.slice(1);
  }

  // Check preposition "ب" (with/by, e.g. بالبخار)
  if (clean.length > 3 && clean.startsWith("بال")) {
    hadWith = true;
    clean = clean.slice(3); // e.g. بالبخار -> بخار
  } else if (clean.length > 2 && clean.startsWith("ب") && !clean.startsWith("با")) {
    hadWith = true;
    clean = clean.slice(1);
  }

  // Check definite article "ال"
  if (clean.length > 3 && clean.startsWith("ال")) {
    clean = clean.slice(2);
  }

  return { clean, hadAnd, hadWith };
}

/**
 * Core translation function: Translates any car wash text to the target language.
 */
export function translateCarWashText(text: string, targetLang: "ar" | "en"): string {
  if (!text || typeof text !== "string") return "";
  const trimmed = text.trim();
  if (!trimmed) return "";

  // 1. If bilingual string is provided, extract the target language
  const split = splitBilingualString(trimmed);
  if (split) {
    return split[targetLang];
  }

  // 2. If already in target language and has no other characters, return as is
  if (targetLang === "ar" && hasArabic(trimmed) && !hasEnglish(trimmed)) {
    return trimmed;
  }
  if (targetLang === "en" && hasEnglish(trimmed) && !hasArabic(trimmed)) {
    return trimmed;
  }

  // Normalize lower case for phrase checking
  const lowerInput = trimmed.toLowerCase();

  // 3. Exact Phrase Matching
  for (const [enPhrase, arPhrase] of PHRASES) {
    if (targetLang === "ar") {
      if (lowerInput === enPhrase.toLowerCase()) {
        return arPhrase;
      }
    } else {
      if (trimmed === arPhrase || lowerInput === arPhrase.toLowerCase()) {
        return capitalizeWords(enPhrase);
      }
    }
  }

  // 4. Sub-phrase replacement matching
  let workingText = trimmed;
  const replacements: { placeholder: string; translation: string }[] = [];
  let placeholderIndex = 0;

  for (const [enPhrase, arPhrase] of PHRASES) {
    if (targetLang === "ar") {
      const reg = new RegExp(`\\b${escapeRegExp(enPhrase)}\\b`, "gi");
      if (reg.test(workingText)) {
        const ph = `__PH_${placeholderIndex++}__`;
        workingText = workingText.replace(reg, ph);
        replacements.push({ placeholder: ph, translation: arPhrase });
      }
    } else {
      if (workingText.includes(arPhrase)) {
        const ph = `__PH_${placeholderIndex++}__`;
        workingText = workingText.split(arPhrase).join(ph);
        replacements.push({ placeholder: ph, translation: capitalizeWords(enPhrase) });
      }
    }
  }

  // 5. Token-by-token translation
  if (targetLang === "ar") {
    // English -> Arabic
    const tokens = workingText.split(/(\s+|[+&/(),-])/);
    const translatedTokens: string[] = [];

    for (const token of tokens) {
      if (!token || /^\s+$/.test(token) || /^[+&/(),-]+$/.test(token)) {
        if (token === "&" || token === "+") translatedTokens.push("و");
        else translatedTokens.push(token);
        continue;
      }

      // Check if it's a placeholder
      const foundPh = replacements.find((r) => r.placeholder === token);
      if (foundPh) {
        translatedTokens.push(foundPh.translation);
        continue;
      }

      const cleanWord = token.toLowerCase().replace(/[^a-z0-9]/g, "");
      const arWord = WORDS_EN_TO_AR[cleanWord];
      if (arWord) {
        translatedTokens.push(arWord);
      } else {
        translatedTokens.push(token);
      }
    }

    // Reconstruct string
    let result = translatedTokens.join("");

    // Put placeholders back if any remain
    for (const r of replacements) {
      result = result.split(r.placeholder).join(r.translation);
    }

    return result.trim();
  } else {
    // Arabic -> English
    const tokens = workingText.split(/(\s+|[+&/(),-])/);
    const translatedTokens: string[] = [];

    for (const token of tokens) {
      if (!token || /^\s+$/.test(token) || /^[+&/(),-]+$/.test(token)) {
        if (token === "و") translatedTokens.push(" & ");
        else translatedTokens.push(token);
        continue;
      }

      // Check placeholder
      const foundPh = replacements.find((r) => r.placeholder === token);
      if (foundPh) {
        translatedTokens.push(foundPh.translation);
        continue;
      }

      const { clean, hadAnd, hadWith } = normalizeArabicToken(token);
      let enWord = WORDS_AR_TO_EN[clean] || WORDS_AR_TO_EN[token];

      if (!enWord) {
        // Try singular/plural fallback
        if (clean.endsWith("ات") && clean.length > 3) {
          const singular = clean.slice(0, -2) + "ة";
          enWord = WORDS_AR_TO_EN[singular] || WORDS_AR_TO_EN[clean.slice(0, -2)];
        }
      }

      if (enWord) {
        let prefix = "";
        if (hadAnd) prefix = "& ";
        if (hadWith) prefix = "Steam ";
        translatedTokens.push(prefix + enWord);
      } else {
        translatedTokens.push(token);
      }
    }

    let result = translatedTokens.join("");

    for (const r of replacements) {
      result = result.split(r.placeholder).join(r.translation);
    }

    return capitalizeWords(result.replace(/\s+/g, " ").trim());
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function capitalizeWords(str: string): string {
  return str.replace(/\b\w/g, (char) => char.toUpperCase());
}

/**
 * Auto-translation utility for creating or editing services:
 * Given a name and optional description, generates both Arabic & English versions
 * and produces the combined bilingual string ready for database persistence.
 */
export function autoTranslateService(
  name: string,
  description?: string | null
): {
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  combinedName: string;
  combinedDesc: string;
} {
  const splitName = splitBilingualString(name);
  let nameAr = "";
  let nameEn = "";

  if (splitName) {
    nameAr = splitName.ar;
    nameEn = splitName.en;
  } else if (hasArabic(name)) {
    nameAr = name.trim();
    nameEn = translateCarWashText(name, "en");
  } else {
    nameEn = name.trim();
    nameAr = translateCarWashText(name, "ar");
  }

  let descAr = "";
  let descEn = "";

  if (description && description.trim()) {
    const splitDesc = splitBilingualString(description);
    if (splitDesc) {
      descAr = splitDesc.ar;
      descEn = splitDesc.en;
    } else if (hasArabic(description)) {
      descAr = description.trim();
      descEn = translateCarWashText(description, "en");
    } else {
      descEn = description.trim();
      descAr = translateCarWashText(description, "ar");
    }
  }

  const combinedName = nameEn && nameAr && nameEn !== nameAr ? `${nameEn} | ${nameAr}` : name.trim();
  const combinedDesc = descEn && descAr && descEn !== descAr ? `${descEn} | ${descAr}` : (description || "").trim();

  return {
    nameAr,
    nameEn,
    descAr,
    descEn,
    combinedName,
    combinedDesc,
  };
}
