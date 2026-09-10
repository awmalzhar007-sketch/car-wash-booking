import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const OTP_EXPIRY_MINUTES = 5;
export const OTP_MAX_ATTEMPTS = 3;
export const OTP_COOLDOWN_SECONDS = 60;

export interface GeneratedOTP {
  challengeId: string;
  code: string;
  expiresAt: Date;
  resendCooldownUntil: Date;
}

export async function generateAndSendOTP(
  phone: string,
  purpose: "BOOKING_CONFIRMATION" | "MY_BOOKING",
  bookingId?: string,
  dbClient: any = prisma
): Promise<GeneratedOTP> {
  const now = new Date();

  // Check if there is an active challenge within cooldown
  const existing = await dbClient.oTPChallenge.findFirst({
    where: {
      phone,
      purpose,
      ...(bookingId ? { bookingId } : {}),
      resendCooldownUntil: { gt: now },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing) {
    const remainingCooldownSecs = Math.ceil(
      (existing.resendCooldownUntil.getTime() - now.getTime()) / 1000
    );
    throw new Error(`OTP_COOLDOWN_ACTIVE: Please wait ${remainingCooldownSecs}s before requesting a new code.`);
  }

  // Generate 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const codeHash = await bcrypt.hash(code, 8);

  const expiresAt = new Date(now.getTime() + OTP_EXPIRY_MINUTES * 60 * 1000);
  const resendCooldownUntil = new Date(now.getTime() + OTP_COOLDOWN_SECONDS * 1000);

  const challenge = await dbClient.oTPChallenge.create({
    data: {
      phone,
      bookingId: bookingId || null,
      codeHash,
      purpose,
      expiresAt,
      maxAttempts: OTP_MAX_ATTEMPTS,
      resendCooldownUntil,
    },
  });

  // SMS Gateway / Mock Delivery
  if (process.env.NODE_ENV !== "production" && process.env.ENABLE_MOCK_OTP === "true") {
    console.log(`\n========================================`);
    console.log(`[DEV OTP] Sent to: ${phone}`);
    console.log(`[DEV OTP] Purpose: ${purpose}`);
    console.log(`[DEV OTP] Verification Code: >>> ${code} <<<`);
    console.log(`[DEV OTP] Expires at: ${expiresAt.toISOString()}`);
    console.log(`========================================\n`);
  }

  return {
    challengeId: challenge.id,
    code,
    expiresAt,
    resendCooldownUntil,
  };
}

export interface VerifyOTPResult {
  success: boolean;
  error?: "CHALLENGE_NOT_FOUND" | "EXPIRED" | "MAX_ATTEMPTS_EXCEEDED" | "INVALID_CODE" | "ALREADY_VERIFIED";
  message?: string;
  bookingId?: string | null;
}

export async function verifyOTPChallenge(
  challengeId: string,
  code: string,
  dbClient: any = prisma
): Promise<VerifyOTPResult> {
  const challenge = await dbClient.oTPChallenge.findUnique({
    where: { id: challengeId },
    include: { booking: true },
  });

  if (!challenge) {
    return { success: false, error: "CHALLENGE_NOT_FOUND", message: "OTP challenge not found." };
  }

  if (challenge.isVerified) {
    return { success: false, error: "ALREADY_VERIFIED", message: "This code was already used." };
  }

  const now = new Date();
  if (challenge.expiresAt < now) {
    return { success: false, error: "EXPIRED", message: "The verification code has expired." };
  }

  if (challenge.attempts >= challenge.maxAttempts) {
    return {
      success: false,
      error: "MAX_ATTEMPTS_EXCEEDED",
      message: "Too many failed attempts. Please request a new code.",
    };
  }

  // Increment attempts count
  await dbClient.oTPChallenge.update({
    where: { id: challengeId },
    data: { attempts: { increment: 1 } },
  });

  // Check code
  const isMatch = await bcrypt.compare(code, challenge.codeHash);
  if (!isMatch) {
    const remaining = challenge.maxAttempts - (challenge.attempts + 1);
    return {
      success: false,
      error: "INVALID_CODE",
      message: remaining > 0 ? `Invalid code. ${remaining} attempt(s) remaining.` : "Invalid code. Max attempts exceeded.",
    };
  }

  // Mark as verified
  await dbClient.oTPChallenge.update({
    where: { id: challengeId },
    data: { isVerified: true },
  });

  return {
    success: true,
    bookingId: challenge.bookingId,
  };
}