import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { validateStatusTransition } from "@/lib/services/status-transitions";
import { BookingStatus, ServiceItem } from "@/lib/types";
import {
  formatDisplayDate,
  formatDisplayTime,
  formatMinutesToTime,
  isValidEgyptianPhone,
  normalizeEgyptianPhone,
  normalizePhone,
  parseTimeToMinutes,
} from "@/lib/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request.headers);
    const bookingId = params.id;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        branch: {
          include: {
            brand: true,
            washBays: { where: { isActive: true }, orderBy: { bayNumber: "asc" } },
            services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
          },
        },
        assignedBay: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (session.role !== "ADMIN" && session.branchId !== booking.branchId) {
      return NextResponse.json(
        { error: "Forbidden: You cannot access bookings of another branch" },
        { status: 403 }
      );
    }

    let services: ServiceItem[] = [];
    if (booking.servicesJson) {
      try {
        services = JSON.parse(booking.servicesJson);
      } catch {
        services = [];
      }
    }

    return NextResponse.json({
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        branchId: booking.branchId,
        branchName: booking.branch.name,
        brandName: booking.branch.brand.name,
        customerName: booking.customerName,
        customerPhone: booking.customerPhone,
        bookingDate: booking.bookingDate,
        displayDate: formatDisplayDate(booking.bookingDate),
        startTime: booking.startTime,
        endTime: booking.endTime,
        displayTime: `${formatDisplayTime(booking.startTime)} - ${formatDisplayTime(booking.endTime)}`,
        estimatedDuration:
          parseTimeToMinutes(booking.endTime) - parseTimeToMinutes(booking.startTime),
        status: booking.status,
        assignedBayId: booking.assignedBayId,
        assignedBayName: booking.assignedBay.name,
        bayNumber: booking.assignedBay.bayNumber,
        totalPrice: booking.totalPrice,
        services,
        createdAt: booking.createdAt.toISOString(),
      },
      branchServices: booking.branch.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        durationMinutes: s.durationMinutes,
      })),
      washBays: booking.branch.washBays.map((b) => ({
        id: b.id,
        name: b.name,
        bayNumber: b.bayNumber,
      })),
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message || "Failed to fetch booking" }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request.headers);
    const bookingId = params.id;
    const body = await request.json();

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        branch: {
          include: {
            washBays: { where: { isActive: true }, orderBy: { bayNumber: "asc" } },
          },
        },
        assignedBay: true,
      },
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

    const {
      customerName,
      customerPhone,
      bookingDate,
      startTime,
      selectedServiceIds,
      assignedBayId,
      status: targetStatus,
    } = body;

    // 1. Validate Customer Name
    const targetName = customerName !== undefined ? customerName.trim() : booking.customerName;
    if (!targetName || targetName.length < 2) {
      return NextResponse.json(
        { error: "Customer name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // 2. Validate Customer Phone
    let targetPhone = booking.customerPhone;
    if (customerPhone !== undefined) {
      const trimmed = customerPhone.trim();
      if (!trimmed || trimmed.length < 8) {
        return NextResponse.json(
          { error: "Please enter a valid phone number" },
          { status: 400 }
        );
      }
      if (isValidEgyptianPhone(trimmed)) {
        targetPhone = normalizeEgyptianPhone(trimmed);
      } else {
        const cleanPhone = normalizePhone(trimmed);
        if (cleanPhone.length < 8) {
          return NextResponse.json(
            { error: "Invalid phone number format" },
            { status: 400 }
          );
        }
        targetPhone = cleanPhone;
      }
    }

    // 3. Validate Status Transition if status is provided
    if (targetStatus && targetStatus !== booking.status) {
      validateStatusTransition(
        booking.status as BookingStatus,
        targetStatus as BookingStatus,
        session.role === "ADMIN"
      );
    }

    // 4. Resolve Date, Start Time & Duration
    const targetDate = bookingDate || booking.bookingDate;
    const targetStartTime = startTime || booking.startTime;
    const branch = booking.branch;

    // Resolve services
    let services: ServiceItem[] = [];
    let totalPrice = booking.totalPrice;
    let totalDuration =
      parseTimeToMinutes(booking.endTime) - parseTimeToMinutes(booking.startTime);

    if (selectedServiceIds !== undefined) {
      const uniqueIds: string[] = Array.from(new Set(selectedServiceIds));
      if (uniqueIds.length > 0) {
        const dbServices = await prisma.service.findMany({
          where: {
            id: { in: uniqueIds },
            branchId: branch.id,
            isActive: true,
          },
        });
        services = dbServices.map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description,
          price: s.price,
          durationMinutes: s.durationMinutes,
        }));
        totalPrice = services.reduce((sum, s) => sum + s.price, 0);
        totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);
      } else {
        services = [];
        totalPrice = 0;
        totalDuration = branch.avgDurationMinutes || 30;
      }
    } else if (booking.servicesJson) {
      try {
        services = JSON.parse(booking.servicesJson);
      } catch {
        services = [];
      }
    }

    // Calculate start & end minutes
    const startMin = parseTimeToMinutes(targetStartTime);
    const endMin = startMin + (totalDuration > 0 ? totalDuration : 30);
    const targetEndTime = formatMinutesToTime(endMin);

    // Validate operating hours
    const openMin = parseTimeToMinutes(branch.openTime);
    const closeMin = parseTimeToMinutes(branch.closeTime);
    if (startMin < openMin || endMin > closeMin) {
      return NextResponse.json(
        {
          error: `Booking time (${targetStartTime} - ${targetEndTime}) must be within operating hours (${branch.openTime} - ${branch.closeTime})`,
        },
        { status: 400 }
      );
    }

    // 5. Bay Assignment and Conflict Detection
    let finalBayId = assignedBayId || booking.assignedBayId;
    const selectedBay = branch.washBays.find((b) => b.id === finalBayId);
    if (!selectedBay) {
      return NextResponse.json({ error: "Selected wash bay not found or inactive" }, { status: 400 });
    }

    // Only perform conflict detection if the booking is active (not cancelled / no-show)
    const activeStatuses = ["CONFIRMED", "WASHING", "COMPLETED", "PENDING_VERIFICATION"];
    const effectiveStatus = targetStatus || booking.status;

    if (activeStatuses.includes(effectiveStatus)) {
      // Check if current target bay has conflicts with other bookings
      const bayConflict = await prisma.booking.findFirst({
        where: {
          id: { not: booking.id }, // exclude this booking
          assignedBayId: finalBayId,
          bookingDate: targetDate,
          status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] },
          AND: [
            { startTime: { lt: targetEndTime } },
            { endTime: { gt: targetStartTime } },
          ],
        },
      });

      if (bayConflict) {
        // If staff explicitly passed assignedBayId, do not auto-reassign; alert them
        if (assignedBayId && assignedBayId !== booking.assignedBayId) {
          return NextResponse.json(
            {
              error: `Bay "${selectedBay.name}" is already booked from ${bayConflict.startTime} to ${bayConflict.endTime}. Please select another bay or time.`,
            },
            { status: 409 }
          );
        }

        // Try to auto-reassign to another free bay in the branch
        const otherBays = branch.washBays.filter((b) => b.id !== finalBayId);
        let foundAlternative = false;

        for (const altBay of otherBays) {
          const altConflict = await prisma.booking.findFirst({
            where: {
              id: { not: booking.id },
              assignedBayId: altBay.id,
              bookingDate: targetDate,
              status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] },
              AND: [
                { startTime: { lt: targetEndTime } },
                { endTime: { gt: targetStartTime } },
              ],
            },
          });

          if (!altConflict) {
            finalBayId = altBay.id;
            foundAlternative = true;
            break;
          }
        }

        if (!foundAlternative) {
          return NextResponse.json(
            {
              error: `Time slot conflict: All wash bays are occupied between ${targetStartTime} and ${targetEndTime}. Please choose a different time.`,
            },
            { status: 409 }
          );
        }
      }
    }

    // 6. Perform Database Update
    const updateData: any = {
      customerName: targetName,
      customerPhone: targetPhone,
      bookingDate: targetDate,
      startTime: targetStartTime,
      endTime: targetEndTime,
      assignedBayId: finalBayId,
      totalPrice,
      servicesJson: services.length > 0 ? JSON.stringify(services) : null,
    };

    if (targetStatus) {
      updateData.status = targetStatus;
      if (targetStatus === "CANCELLED") {
        updateData.cancelledAt = new Date();
      } else {
        updateData.cancelledAt = null;
      }
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
        customerName: updated.customerName,
        customerPhone: updated.customerPhone,
        bookingDate: updated.bookingDate,
        displayDate: formatDisplayDate(updated.bookingDate),
        startTime: updated.startTime,
        endTime: updated.endTime,
        displayTime: `${formatDisplayTime(updated.startTime)} - ${formatDisplayTime(updated.endTime)}`,
        estimatedDuration:
          parseTimeToMinutes(updated.endTime) - parseTimeToMinutes(updated.startTime),
        status: updated.status,
        assignedBayId: updated.assignedBayId,
        assignedBayName: updated.assignedBay.name,
        bayNumber: updated.assignedBay.bayNumber,
        services,
        totalPrice: updated.totalPrice,
        createdAt: updated.createdAt.toISOString(),
      },
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to update booking" },
      { status: 400 }
    );
  }
}
