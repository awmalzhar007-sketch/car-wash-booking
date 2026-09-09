import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { generateAndSendOTP } from "@/lib/services/otp";
import { getTodayDateString, normalizePhone, egyptianPhoneSchema } from "@/lib/utils";

const schema = z.object({
  phone: egyptianPhoneSchema,
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { phone } = schema.parse(body);
    const cleanPhone = normalizePhone(phone);
    const today = getTodayDateString();

    // Check if an active booking exists today
    const activeBooking = await prisma.booking.findFirst({
      where: {
        customerPhone: cleanPhone,
        bookingDate: today,
        status: { in: ["CONFIRMED", "WASHING", "PENDING_VERIFICATION"] },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeBooking) {
      return NextResponse.json({
        hasBooking: false,
        message: "No active booking found for this phone number today.",
      });
    }

    const otp = await generateAndSendOTP(cleanPhone, "MY_BOOKING", activeBooking.id);

    return NextResponse.json({
      hasBooking: true,
      challengeId: otp.challengeId,
      expiresAt: otp.expiresAt,
      resendCooldownUntil: otp.resendCooldownUntil,
      devCode: process.env.ENABLE_MOCK_OTP === "true" ? otp.code : undefined,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to request OTP" },
      { status: 400 }
    );
  }
}
