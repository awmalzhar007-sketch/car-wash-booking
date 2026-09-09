import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sanitizeCustomerBooking } from "@/lib/services/booking-engine";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limit";
import { egyptianPhoneSchema, normalizeBookingCode, normalizePhone } from "@/lib/utils";

const lookupSchema = z.object({
  bookingCode: z.string().min(1, "Booking Code is required"),
  phone: egyptianPhoneSchema,
});

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const body = await request.json();
    const { bookingCode, phone } = lookupSchema.parse(body);

    const cleanPhone = normalizePhone(phone);
    const cleanCode = normalizeBookingCode(bookingCode);

    // Rate limiting: Protect against brute-force guessing of booking numbers
    const rateLimitKey = `lookup:${ip}:${cleanPhone}`;
    const rateLimit = checkRateLimit(rateLimitKey, 10, 10 * 60 * 1000); // 10 attempts per 10 mins

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many lookup attempts. Please try again in ${Math.ceil(
            rateLimit.resetInSeconds / 60
          )} minute(s).`,
          code: "RATE_LIMITED",
        },
        {
          status: 429,
          headers: {
            "Retry-After": rateLimit.resetInSeconds.toString(),
          },
        }
      );
    }

    // Query database for a booking matching BOTH the booking code AND the customer phone
    const booking = await prisma.booking.findFirst({
      where: {
        bookingNumber: cleanCode,
        customerPhone: cleanPhone,
      },
      include: {
        branch: {
          include: { brand: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        {
          error: "No booking found matching this Booking Code and Phone Number.",
          code: "BOOKING_NOT_FOUND",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      booking: sanitizeCustomerBooking(booking),
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to find booking", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
