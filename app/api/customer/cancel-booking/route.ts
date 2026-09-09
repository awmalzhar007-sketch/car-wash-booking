import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { cancelBooking } from "@/lib/services/booking-engine";
import { checkRateLimit, getClientIp } from "@/lib/services/rate-limit";
import { normalizePhone, normalizeBookingCode, egyptianPhoneSchema } from "@/lib/utils";

const schema = z
  .object({
    bookingCode: z.string().optional(),
    bookingId: z.string().optional(),
    phone: egyptianPhoneSchema,
  })
  .refine((data) => data.bookingCode || data.bookingId, {
    message: "Either Booking Code or Booking ID is required",
  });

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const body = await request.json();
    const { bookingCode, bookingId, phone } = schema.parse(body);
    const cleanPhone = normalizePhone(phone);
    const targetCode = bookingCode ? normalizeBookingCode(bookingCode) : undefined;

    // Rate limiting: Protect against repeated cancellation attempts
    const rateLimitKey = `cancel:${ip}:${cleanPhone}`;
    const rateLimit = checkRateLimit(rateLimitKey, 5, 10 * 60 * 1000); // 5 attempts per 10 mins

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: `Too many cancellation attempts. Please try again in ${Math.ceil(
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

    // Verify booking matches both the code/ID and phone number
    const booking = await prisma.booking.findFirst({
      where: {
        customerPhone: cleanPhone,
        OR: [
          ...(targetCode ? [{ bookingNumber: targetCode }] : []),
          ...(bookingId ? [{ id: bookingId }] : []),
        ],
      },
      include: {
        branch: {
          include: { brand: true },
        },
      },
    });

    if (!booking) {
      return NextResponse.json(
        { error: "Booking not found or phone number does not match.", code: "BOOKING_NOT_FOUND" },
        { status: 404 }
      );
    }

    if (booking.status === "CANCELLED") {
      return NextResponse.json({
        success: true,
        data: cancelBooking(booking.id, cleanPhone),
        message: "Booking cancelled successfully.",
      });
    }

    if (booking.status === "COMPLETED") {
      return NextResponse.json(
        { error: "Cannot cancel booking: Wash is already completed.", code: "CANNOT_CANCEL" },
        { status: 400 }
      );
    }

    const cancelledSummary = await cancelBooking(booking.id, cleanPhone);

    return NextResponse.json({
      success: true,
      data: cancelledSummary,
      message: "Booking cancelled successfully.",
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message, code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to cancel booking", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

