import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { formatDisplayDate, formatDisplayTime } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers);

    const { searchParams } = new URL(request.url);
    const brandId = searchParams.get("brandId");
    const branchId = searchParams.get("branchId");
    const date = searchParams.get("date");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    const where: any = {};

    if (brandId) {
      where.branch = { brandId };
    }
    if (branchId) {
      where.branchId = branchId;
    }
    if (date) {
      where.bookingDate = date;
    }
    if (status && status !== "ALL") {
      where.status = status;
    }
    if (search) {
      where.OR = [
        { bookingNumber: { contains: search } },
        { customerName: { contains: search } },
        { customerPhone: { contains: search } },
      ];
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        branch: {
          include: { brand: true },
        },
        assignedBay: true,
      },
      orderBy: [{ bookingDate: "desc" }, { startTime: "asc" }],
      take: 200,
    });

    const formatted = bookings.map((b) => {
      let services: { id: string; name: string; price: number }[] = [];
      if (b.servicesJson) {
        try {
          services = JSON.parse(b.servicesJson);
        } catch {
          services = [];
        }
      }
      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        brandName: b.branch.brand.name,
        branchName: b.branch.name,
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        bookingDate: b.bookingDate,
        displayDate: formatDisplayDate(b.bookingDate),
        startTime: b.startTime,
        endTime: b.endTime,
        displayTime: `${formatDisplayTime(b.startTime)} - ${formatDisplayTime(b.endTime)}`,
        status: b.status,
        assignedBayName: b.assignedBay.name,
        bayNumber: b.assignedBay.bayNumber,
        createdAt: b.createdAt.toISOString(),
        services,
        totalPrice: b.totalPrice,
      };
    });

    return NextResponse.json({ bookings: formatted });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAdmin(request.headers);

    const body = await request.json();
    const { bookingId, status: targetStatus, assignedBayId } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Booking ID is required" }, { status: 400 });
    }

    if (!targetStatus) {
      return NextResponse.json({ error: "Status is required" }, { status: 400 });
    }

    const validStatuses = [
      "PENDING_VERIFICATION",
      "CONFIRMED",
      "WASHING",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ];

    if (!validStatuses.includes(targetStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Allowed: ${validStatuses.join(", ")}` },
        { status: 400 }
      );
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { branch: true },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const updateData: any = {
      status: targetStatus,
    };

    if (targetStatus === "CANCELLED") {
      updateData.cancelledAt = new Date();
    } else {
      updateData.cancelledAt = null;
    }

    if (assignedBayId) {
      updateData.assignedBayId = assignedBayId;
    }

    const updated = await prisma.booking.update({
      where: { id: bookingId },
      data: updateData,
      include: {
        assignedBay: true,
        branch: { include: { brand: true } },
      },
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: updated.id,
        bookingNumber: updated.bookingNumber,
        status: updated.status,
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

