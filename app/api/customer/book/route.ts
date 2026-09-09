import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createBookingReservation } from "@/lib/services/booking-engine";
import { egyptianPhoneSchema } from "@/lib/utils";

const bookSchema = z.object({
  branchIdOrQr: z.string().min(1, "Branch identifier is required"),
  customerName: z.string().min(2, "Name must be at least 2 characters"),
  customerPhone: egyptianPhoneSchema,
  bookingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:mm)"),
  selectedServiceIds: z.array(z.string()).optional().default([]),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validated = bookSchema.parse(body);

    const reservation = await createBookingReservation(validated);
    return NextResponse.json({
      success: true,
      data: reservation,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }
    const message = error.message || "Failed to create booking reservation";
    const status = message.includes("SLOT_FULLY_BOOKED")
      ? 409
      : message.includes("OUTSIDE_HOURS") || message.includes("PAST_TIME") || message.includes("SAME_DAY_ONLY")
      ? 400
      : 500;

    return NextResponse.json({ error: message }, { status });
  }
}