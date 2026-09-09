import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { validateStatusTransition } from "@/lib/services/status-transitions";
import { BookingStatus } from "@/lib/types";

const statusSchema = z.object({
  bookingId: z.string().min(1, "Booking ID is required"),
  status: z.enum(["CONFIRMED", "WASHING", "COMPLETED", "CANCELLED", "NO_SHOW"] as const),
});

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request.headers);
    const body = await request.json();
    const { bookingId, status: targetStatus } = statusSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { branch: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Branch isolation check: staff can only update their branch
    if (session.role !== "ADMIN" && session.branchId !== booking.branchId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot modify bookings of another branch" },
        { status: 403 }
      );
    }

    // Validate state machine transition (Admins bypass)
    validateStatusTransition(
      booking.status as BookingStatus,
      targetStatus as BookingStatus,
      session.role === "ADMIN"
    );

    const updateData: any = {
      status: targetStatus,
    };
    if (targetStatus === "CANCELLED") {
      updateData.cancelledAt = new Date();
    } else {
      updateData.cancelledAt = null;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: { assignedBay: true },
    });

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update booking status" },
      { status: 400 }
    );
  }
}
