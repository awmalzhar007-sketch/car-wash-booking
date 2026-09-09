import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { formatDisplayDate, getCairoDateString } from "@/lib/utils";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request.headers);
    const { searchParams } = new URL(request.url);

    // Resolve month: defaults to current month (YYYY-MM) in Egypt timezone
    const todayCairo = getCairoDateString();
    const currentMonth = todayCairo.slice(0, 7);
    const requestedMonth = searchParams.get("month");
    const targetMonth =
      requestedMonth && /^\d{4}-\d{2}$/.test(requestedMonth)
        ? requestedMonth
        : currentMonth;

    // Resolve branch: branch staff are strictly isolated to their own branch
    let branchId = searchParams.get("branchId");
    if (session.role === "BRANCH_STAFF") {
      branchId = session.branchId || null;
      if (!branchId) {
        return NextResponse.json(
          { error: "Forbidden: Staff member not assigned to any branch" },
          { status: 403 }
        );
      }
    }

    const where: any = {
      bookingDate: { startsWith: targetMonth },
      status: "COMPLETED",
    };
    if (branchId) {
      where.branchId = branchId;
    }

    // Query COMPLETED bookings only - cancelled and other statuses are strictly excluded
    const completedBookings = await prisma.booking.findMany({
      where,
      select: {
        id: true,
        bookingNumber: true,
        bookingDate: true,
        startTime: true,
        endTime: true,
        totalPrice: true,
        servicesJson: true,
        customerName: true,
        customerPhone: true,
        branchId: true,
        assignedBay: {
          select: { id: true, name: true, bayNumber: true },
        },
      },
      orderBy: [{ bookingDate: "asc" }, { startTime: "asc" }],
    });

    // Count cancelled bookings to explicitly show they are not counted towards revenue
    const cancelledCount = await prisma.booking.count({
      where: {
        bookingDate: { startsWith: targetMonth },
        status: "CANCELLED",
        ...(branchId ? { branchId } : {}),
      },
    });

    // Total monthly revenue (completed bookings only)
    const totalRevenue = completedBookings.reduce(
      (sum, b) => sum + (Number(b.totalPrice) || 0),
      0
    );
    const completedCount = completedBookings.length;
    const averageRevenuePerBooking =
      completedCount > 0
        ? Math.round((totalRevenue / completedCount) * 100) / 100
        : 0;

    // Breakdown by Service Type from completed bookings
    const serviceMap: Record<
      string,
      { id: string; name: string; count: number; totalRevenue: number }
    > = {};

    completedBookings.forEach((b) => {
      if (b.servicesJson) {
        try {
          const services = JSON.parse(b.servicesJson);
          if (Array.isArray(services)) {
            services.forEach((s: any) => {
              const key = s.id || s.name;
              if (!serviceMap[key]) {
                serviceMap[key] = {
                  id: s.id || key,
                  name: s.name || "Service",
                  count: 0,
                  totalRevenue: 0,
                };
              }
              serviceMap[key].count += 1;
              serviceMap[key].totalRevenue += Number(s.price) || 0;
            });
          }
        } catch {}
      }
    });

    const revenueByService = Object.values(serviceMap)
      .map((s) => ({
        ...s,
        percentage:
          totalRevenue > 0
            ? Math.round((s.totalRevenue / totalRevenue) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);

    // Breakdown by Day from completed bookings
    const dayMap: Record<
      string,
      { date: string; displayDate: string; revenue: number; count: number }
    > = {};

    completedBookings.forEach((b) => {
      const date = b.bookingDate;
      if (!dayMap[date]) {
        dayMap[date] = {
          date,
          displayDate: formatDisplayDate(date),
          revenue: 0,
          count: 0,
        };
      }
      dayMap[date].revenue += Number(b.totalPrice) || 0;
      dayMap[date].count += 1;
    });

    const revenueByDay = Object.values(dayMap)
      .map((d) => ({
        ...d,
        percentage:
          totalRevenue > 0
            ? Math.round((d.revenue / totalRevenue) * 1000) / 10
            : 0,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));

    // Identify Peak Day
    let bestDay: { date: string; displayDate: string; revenue: number; count: number } | null = null;
    revenueByDay.forEach((d) => {
      if (!bestDay || d.revenue > bestDay.revenue) {
        bestDay = d;
      }
    });

    // Available months list (look back 12 months for picker)
    const availableMonths: { value: string; label: string }[] = [];
    const [yearStr, monthStr] = currentMonth.split("-");
    let curY = parseInt(yearStr, 10);
    let curM = parseInt(monthStr, 10);

    for (let i = 0; i < 12; i++) {
      const ym = `${curY}-${curM.toString().padStart(2, "0")}`;
      const d = new Date(curY, curM - 1, 1);
      const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      availableMonths.push({ value: ym, label });
      curM -= 1;
      if (curM === 0) {
        curM = 12;
        curY -= 1;
      }
    }

    return NextResponse.json({
      month: targetMonth,
      branchId,
      totalRevenue,
      completedCount,
      cancelledCount,
      averageRevenuePerBooking,
      bestDay,
      revenueByService,
      revenueByDay,
      availableMonths,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to load revenue data" },
      { status: 500 }
    );
  }
}
