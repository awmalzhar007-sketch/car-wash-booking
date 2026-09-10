import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import {
  formatDisplayTime,
  formatDisplayDate,
  formatMinutesToTime,
  getTodayDateString,
  parseTimeToMinutes,
} from "@/lib/utils";
import { BookingStatus, ServiceItem, StaffBookingDetail } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request.headers);

    const { searchParams } = new URL(request.url);
    const requestedBranchId = searchParams.get("branchId");

    let branchId = session.branchId;
    if (session.role === "ADMIN" && requestedBranchId) {
      branchId = requestedBranchId;
    }

    if (!branchId) {
      return NextResponse.json(
        { error: "No branch assigned to this account or branchId not provided." },
        { status: 400 }
      );
    }

    // Branch isolation check: non-admin cannot access other branches
    if (session.role !== "ADMIN" && session.branchId !== branchId) {
      return NextResponse.json({ error: "Access denied to this branch." }, { status: 403 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        brand: true,
        washBays: {
          where: { isActive: true },
          orderBy: { bayNumber: "asc" },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const today = getTodayDateString();
    const dateParam = searchParams.get("date");
    const activeDate = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam) ? dateParam : today;

    const bookings = await prisma.booking.findMany({
      where: {
        branchId: branch.id,
        bookingDate: activeDate,
      },
      include: {
        assignedBay: true,
      },
      orderBy: { startTime: "asc" },
    });

    // Compute status counts for the selected date
    const counts = {
      total: bookings.length,
      confirmed: bookings.filter((b) => b.status === "CONFIRMED").length,
      washing: bookings.filter((b) => b.status === "WASHING").length,
      completed: bookings.filter((b) => b.status === "COMPLETED").length,
      cancelled: bookings.filter((b) => b.status === "CANCELLED").length,
      noShow: bookings.filter((b) => b.status === "NO_SHOW").length,
    };

    // Compute financial summary for the selected date based on completed bookings
    const completedBookings = bookings.filter((b) => b.status === "COMPLETED");
    const completedRevenue = completedBookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const washingRevenue = bookings
      .filter((b) => b.status === "WASHING")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const confirmedRevenue = bookings
      .filter((b) => b.status === "CONFIRMED")
      .reduce((sum, b) => sum + (b.totalPrice || 0), 0);
    const potentialRevenue = completedRevenue + washingRevenue + confirmedRevenue;

    // Monthly calculation (for the active month YYYY-MM)
    const currentMonthPrefix = activeDate.slice(0, 7);
    const monthlyCompletedBookings = await prisma.booking.findMany({
      where: {
        branchId: branch.id,
        bookingDate: { startsWith: currentMonthPrefix },
        status: "COMPLETED",
      },
      select: {
        bookingDate: true,
        totalPrice: true,
      },
      orderBy: { bookingDate: "asc" },
    });
    const monthlyRevenue = monthlyCompletedBookings.reduce(
      (sum, b) => sum + (b.totalPrice || 0),
      0
    );
    const monthlyCompletedCount = monthlyCompletedBookings.length;

    // Group completed bookings by day in the month
    const dayMap: Record<string, { date: string; revenue: number; count: number }> = {};
    monthlyCompletedBookings.forEach((b) => {
      if (!dayMap[b.bookingDate]) {
        dayMap[b.bookingDate] = { date: b.bookingDate, revenue: 0, count: 0 };
      }
      dayMap[b.bookingDate].revenue += b.totalPrice || 0;
      dayMap[b.bookingDate].count += 1;
    });

    // Find the best day in the month (highest revenue)
    const dayList = Object.values(dayMap).sort((a, b) => a.date.localeCompare(b.date));
    let bestDay: { date: string; revenue: number; count: number } | null = null;
    dayList.forEach((d) => {
      if (!bestDay || d.revenue > (bestDay as any).revenue || (d.revenue === (bestDay as any).revenue && d.count > (bestDay as any).count)) {
        bestDay = d;
      }
    });

    const financials = {
      completedRevenue,
      washingRevenue,
      confirmedRevenue,
      potentialRevenue,
      completedCount: completedBookings.length,
      averageTicket:
        completedBookings.length > 0
          ? Math.round(completedRevenue / completedBookings.length)
          : 0,
      monthlyRevenue,
      monthlyCompletedCount,
      bestDay: bestDay
        ? {
            date: (bestDay as any).date,
            revenue: (bestDay as any).revenue,
            count: (bestDay as any).count,
            displayDate: formatDisplayDate((bestDay as any).date),
          }
        : null,
      monthlyDays: dayList.map((d) => ({
        ...d,
        displayDate: formatDisplayDate(d.date),
        isBestDay: bestDay ? d.date === (bestDay as any).date : false,
      })),
    };

    // Format staff booking details
    const formattedBookings: StaffBookingDetail[] = bookings.map((b) => {
      let services: ServiceItem[] = [];
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
        customerName: b.customerName,
        customerPhone: b.customerPhone,
        bookingDate: b.bookingDate,
        startTime: b.startTime,
        endTime: b.endTime,
        displayTime: formatDisplayTime(b.startTime),
        // Derived from the actual booked start/end time — which was computed
        // from the selected services' durations at booking time — so this
        // always reflects the real wash time for what the customer picked.
        estimatedDuration: parseTimeToMinutes(b.endTime) - parseTimeToMinutes(b.startTime),
        status: b.status as BookingStatus,
        assignedBayId: b.assignedBayId,
        assignedBayName: b.assignedBay.name,
        bayNumber: b.assignedBay.bayNumber,
        createdAt: b.createdAt.toISOString(),
        services,
        totalPrice: b.totalPrice,
      };
    });

    // Build timeline grid by Time Slot and Bay
    const openMin = parseTimeToMinutes(branch.openTime);
    const closeMin = parseTimeToMinutes(branch.closeTime);
    const duration = branch.avgDurationMinutes;

    const timeline: {
      time: string;
      displayTime: string;
      baySlots: {
        bayId: string;
        bayNumber: number;
        bayName: string;
        booking?: StaffBookingDetail;
        // Whether this is the first grid row that this booking occupies in
        // this bay's column. Only "start" slots should be rendered by the
        // client — the rows a booking continues into are covered via
        // rowSpan from the start row, so the same booking is never rendered
        // more than once even though it spans multiple time slots.
        isBookingStart: boolean;
        // Number of consecutive grid rows this booking spans in this bay's
        // column, derived from the booking's actual start/end time (i.e.
        // its real duration), not just a single slot. Always 1 for empty
        // ("Available") slots.
        rowSpan: number;
      }[];
    }[] = [];

    let currentMin = openMin;
    while (currentMin + duration <= closeMin) {
      const slotStart = currentMin;
      const slotEnd = currentMin + duration;
      const timeStr = formatMinutesToTime(slotStart);

      const baySlots = branch.washBays.map((bay) => {
        // Find booking on this bay overlapping this slot
        const bookingOnBay = formattedBookings.find((b) => {
          if (b.assignedBayId !== bay.id) return false;
          if (b.status === "CANCELLED") return false; // Cancelled frees up the bay
          const bStart = parseTimeToMinutes(b.startTime);
          const bEnd = parseTimeToMinutes(b.endTime);
          return Math.max(bStart, slotStart) < Math.min(bEnd, slotEnd);
        });

        return {
          bayId: bay.id,
          bayNumber: bay.bayNumber,
          bayName: bay.name,
          booking: bookingOnBay,
          // Filled in below once the full grid exists, by grouping
          // consecutive rows in each bay column that belong to the same
          // booking ID.
          isBookingStart: true,
          rowSpan: 1,
        };
      });

      timeline.push({
        time: timeStr,
        displayTime: formatDisplayTime(timeStr),
        baySlots,
      });

      currentMin += duration;
    }

    // Collapse repeated per-slot occurrences of the same booking into a
    // single "start" row with a rowSpan covering every row it occupies.
    // This is where "one booking = one card" is enforced: bookings are
    // grouped by their unique booking ID (not customer name), so a customer
    // with two separate bookings later in the day is never merged into one,
    // while a single long booking that touches many 5-minute-ish grid rows
    // collapses into exactly one entry.
    branch.washBays.forEach((_bay: unknown, bayIndex: number) => {
      let rowIdx = 0;
      while (rowIdx < timeline.length) {
        const slot = timeline[rowIdx].baySlots[bayIndex];
        if (!slot.booking) {
          rowIdx += 1;
          continue;
        }
        const bookingId = slot.booking.id;
        let span = 1;
        let nextRowIdx = rowIdx + 1;
        while (
          nextRowIdx < timeline.length &&
          timeline[nextRowIdx].baySlots[bayIndex].booking?.id === bookingId
        ) {
          const continuationSlot = timeline[nextRowIdx].baySlots[bayIndex];
          continuationSlot.isBookingStart = false;
          continuationSlot.rowSpan = 0;
          span += 1;
          nextRowIdx += 1;
        }
        slot.isBookingStart = true;
        slot.rowSpan = span;
        rowIdx = nextRowIdx;
      }
    });

    return NextResponse.json({
      branch: {
        id: branch.id,
        name: branch.name,
        brandName: branch.brand.name,
        openTime: branch.openTime,
        closeTime: branch.closeTime,
        avgDurationMinutes: branch.avgDurationMinutes,
        qrIdentifier: branch.qrIdentifier,
      },
      bays: branch.washBays.map((b) => ({
        id: b.id,
        bayNumber: b.bayNumber,
        name: b.name,
      })),
      date: activeDate,
      today,
      counts,
      financials,
      timeline,
      bookings: formattedBookings,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to load schedule" },
      { status: 500 }
    );
  }
}
