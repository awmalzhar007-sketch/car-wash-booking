import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";
import { createStaffWalkInBooking } from "@/lib/services/booking-engine";
import { egyptianPhoneSchema } from "@/lib/utils";

const walkInSchema = z.object({
  branchId: z.string().optional(), // only honored for ADMIN sessions
  customerName: z.string().min(2, "Please enter the customer's name"),
  customerPhone: egyptianPhoneSchema,
  selectedServiceIds: z.array(z.string()).optional(),
  bayId: z.string().optional(),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, "Time must be in HH:mm format")
    .optional(),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request.headers);
    const body = await request.json();
    const parsed = walkInSchema.parse(body);

    // Staff can only create walk-ins for their own branch; only an admin
    // session may target another branch explicitly.
    let branchId = session.branchId;
    if (session.role === "ADMIN" && parsed.branchId) {
      branchId = parsed.branchId;
    }

    if (!branchId) {
      return NextResponse.json(
        { error: "No branch assigned to this account or branchId not provided." },
        { status: 400 }
      );
    }

    if (session.role !== "ADMIN" && session.branchId !== branchId) {
      return NextResponse.json({ error: "Access denied to this branch." }, { status: 403 });
    }

    const booking = await createStaffWalkInBooking({
      branchId,
      customerName: parsed.customerName,
      customerPhone: parsed.customerPhone,
      selectedServiceIds: parsed.selectedServiceIds,
      bayId: parsed.bayId,
      startTime: parsed.startTime,
    });

    return NextResponse.json({ success: true, booking });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    // Errors from the booking engine come as "CODE: human message" —
    // strip the code prefix for a clean, staff-facing message.
    const message =
      typeof error.message === "string" && error.message.includes(": ")
        ? error.message.split(": ").slice(1).join(": ")
        : error.message;
    return NextResponse.json(
      { error: message || "Failed to create walk-in booking" },
      { status: 400 }
    );
  }
}
