import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { z } from "zod";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDisplayTime(timeStr: string): string {
  // input: "17:30" or "09:00"
  const [hStr, mStr] = timeStr.split(":");
  let hours = parseInt(hStr, 10);
  const minutes = mStr || "00";
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${ampm}`;
}

export function parseTimeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function formatMinutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
}

export const CAIRO_TIMEZONE = "Africa/Cairo";

/**
 * Returns date string (YYYY-MM-DD) in Egypt (Africa/Cairo) timezone.
 */
export function getCairoDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAIRO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(date);
}

/**
 * Returns current minutes of the day (0 - 1439) in Egypt (Africa/Cairo) timezone.
 */
export function getCairoCurrentMinutes(date: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  let hour = 0;
  let minute = 0;
  for (const p of parts) {
    if (p.type === "hour") hour = parseInt(p.value, 10);
    if (p.type === "minute") minute = parseInt(p.value, 10);
  }
  if (hour === 24) hour = 0;
  return hour * 60 + minute;
}

/**
 * Returns current time string (HH:mm) in Egypt (Africa/Cairo) timezone.
 */
export function getCairoTimeString(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAIRO_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  let hour = "00";
  let minute = "00";
  for (const p of parts) {
    if (p.type === "hour") hour = p.value === "24" ? "00" : p.value.padStart(2, "0");
    if (p.type === "minute") minute = p.value.padStart(2, "0");
  }
  return `${hour}:${minute}`;
}

export function getTodayDateString(): string {
  return getCairoDateString();
}

export function formatDisplayDate(dateStr: string): string {
  const today = getTodayDateString();
  if (dateStr === today) {
    return "Today";
  }
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function normalizePhone(phone: string): string {
  // Strip non-digit characters except leading +
  return phone.replace(/[^0-9+]/g, "");
}

// Egyptian mobile numbers: 11 digits, starting with 010, 011, 012, or 015
// e.g. 01023525785
export const EGYPTIAN_PHONE_REGEX = /^01[0125][0-9]{8}$/;

export function normalizeEgyptianPhone(phone: string): string {
  let digitsOnly = (phone || "").replace(/\D/g, "");
  if (digitsOnly.startsWith("0020")) {
    digitsOnly = digitsOnly.substring(4);
  } else if (digitsOnly.startsWith("20") && digitsOnly.length === 12) {
    digitsOnly = digitsOnly.substring(2);
  }
  if (!digitsOnly.startsWith("0") && digitsOnly.length === 10) {
    digitsOnly = "0" + digitsOnly;
  }
  return digitsOnly;
}

export function isValidEgyptianPhone(phone: string): boolean {
  if (!phone) return false;
  const normalized = normalizeEgyptianPhone(phone);
  return EGYPTIAN_PHONE_REGEX.test(normalized);
}

// Shared zod schema for validating Egyptian phone numbers in API routes
export const egyptianPhoneSchema = z
  .string()
  .refine(isValidEgyptianPhone, {
    message: "Phone number must be a valid Egyptian mobile number (e.g., 010..., 011..., 012..., 015... or +20...)",
  });

import crypto from "crypto";

export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  return `EGP ${rounded.toLocaleString("en-US", {
    minimumFractionDigits: rounded % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function generateBookingNumber(): string {
  const randomNum = crypto.randomInt(1000, 10000);
  return `CW-${randomNum}`;
}

export function normalizeBookingCode(code: string): string {
  return (code || "").trim().toUpperCase();
}