import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { verifyOTPChallenge } from "@/lib/services/otp";
import { sanitizeCustomerBooking } from "@/lib/services/booking-engine";
import { getTodayDateString, normalizePhone } from "@/lib/utils";

const schema = z.object({
  challengeId: z.string().min(1, "Challenge ID is required"),
  code: z.string().length(6, "Code must be 6 digits"),
  phone: z.string().min(8, "Phone is required"),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeId, code, phone } = schema.parse(body);

    const verification = await verifyOTPChallenge(challengeId, code);
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.message || "Invalid verification code", code: verification.error },
        { status: 400 }
      );
    }

    const cleanPhone = normalizePhone(phone);
    const today = getTodayDateString();

    const activeBooking = await prisma.booking.findFirst({
      where: {
        customerPhone: cleanPhone,
        bookingDate: today,
        status: { in: ["CONFIRMED", "WASHING"] },
      },
      include: {
        branch: {
          include: { brand: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!activeBooking) {
      return NextResponse.json({
        success: true,
        booking: null,
        message: "No active booking found.",
      });
    }

    return NextResponse.json({
      success: true,
      booking: sanitizeCustomerBooking(activeBooking),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to verify OTP" },
      { status: 500 }
    );
  }
}
