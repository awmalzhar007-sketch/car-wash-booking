import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { verifyOTPChallenge } from "@/lib/services/otp";
import { confirmBookingAfterOTP } from "@/lib/services/booking-engine";

const verifySchema = z.object({
  challengeId: z.string().min(1, "Challenge ID is required"),
  code: z.string().length(6, "Verification code must be 6 digits"),
  bookingId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { challengeId, code, bookingId } = verifySchema.parse(body);

    const verification = await verifyOTPChallenge(challengeId, code);
    if (!verification.success) {
      return NextResponse.json(
        { error: verification.message || "Invalid verification code", code: verification.error },
        { status: 400 }
      );
    }

    const targetBookingId = bookingId || verification.bookingId;
    if (!targetBookingId) {
      return NextResponse.json({ success: true, message: "OTP verified successfully" });
    }

    // Confirm booking and transition to CONFIRMED
    const bookingSummary = await confirmBookingAfterOTP(targetBookingId);

    return NextResponse.json({
      success: true,
      data: bookingSummary,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}