import { prisma } from "@/lib/prisma";
import {
  formatDisplayTime,
  formatMinutesToTime,
  getCairoCurrentMinutes,
  getCairoDateString,
  getCairoTimeString,
  getTodayDateString,
  parseTimeToMinutes,
} from "@/lib/utils";
import { ServiceItem, TimeSlot } from "@/lib/types";

export interface BranchAvailabilityResult {
  branchId: string;
  brandName: string;
  branchName: string;
  address?: string | null;
  openTime: string;
  closeTime: string;
  avgDurationMinutes: number;
  isClosedNow: boolean;
  date: string;
  serverTime: string;
  serverDate: string;
  serverCurrentMinutes: number;
  serverTimestamp: number;
  nearestAvailableSlot: TimeSlot | null;
  slots: TimeSlot[];
  services: ServiceItem[];
}

/**
 * Calculates same-day availability for a given branch
 */
export async function getBranchAvailability(
  branchIdOrQr: string,
  targetDate?: string,
  simulatedCurrentMinutes?: number, // For testing determinism
  selectedServiceIds?: string[], // Recompute slot duration around these services
  bayId?: string // Optional: specific bay availability (e.g. walk-in)
): Promise<BranchAvailabilityResult> {
  const branch = await prisma.branch.findFirst({
    where: {
      OR: [
        { id: branchIdOrQr },
        { qrIdentifier: branchIdOrQr },
        { slug: branchIdOrQr },
      ],
      isActive: true,
    },
    include: {
      brand: true,
      washBays: {
        where: { isActive: true },
      },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!branch) {
    throw new Error("BRANCH_NOT_FOUND");
  }

  const services: ServiceItem[] = branch.services.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    price: s.price,
    durationMinutes: s.durationMinutes,
  }));

  const today = getTodayDateString();
  const date = targetDate || today;

  // Strict Rule: Same-day only
  if (date !== today) {
    throw new Error("SAME_DAY_ONLY: Bookings are strictly restricted to today.");
  }

  const now = new Date();
  const currentMinutes =
    simulatedCurrentMinutes !== undefined
      ? simulatedCurrentMinutes
      : getCairoCurrentMinutes(now);

  const openMinutes = parseTimeToMinutes(branch.openTime);
  const closeMinutes = parseTimeToMinutes(branch.closeTime);

  // The slot grid is built around the actual wash duration for whatever
  // services are currently selected (each service's duration is set by
  // branch staff). With nothing selected yet, fall back to the branch's
  // average duration as a reasonable estimate.
  const selectedServices =
    selectedServiceIds && selectedServiceIds.length > 0
      ? branch.services.filter((s) => selectedServiceIds.includes(s.id))
      : [];
  const duration =
    selectedServices.length > 0
      ? selectedServices.reduce((sum, s) => sum + s.durationMinutes, 0)
      : branch.avgDurationMinutes;

  const relevantBays = bayId
    ? branch.washBays.filter((b) => b.id === bayId)
    : branch.washBays;
  const totalBays = relevantBays.length;

  const isClosedNow =
    currentMinutes >= closeMinutes || currentMinutes < openMinutes;

  if (totalBays === 0) {
    return {
      branchId: branch.id,
      brandName: branch.brand.name,
      branchName: branch.name,
      address: branch.address,
      openTime: branch.openTime,
      closeTime: branch.closeTime,
      avgDurationMinutes: duration,
      isClosedNow,
      date,
      serverTime: getCairoTimeString(now),
      serverDate: getCairoDateString(now),
      serverCurrentMinutes: currentMinutes,
      serverTimestamp: now.getTime(),
      nearestAvailableSlot: null,
      slots: [],
      services,
    };
  }

  // Fetch active bookings for today (excluding cancelled and no-show)
  // For PENDING_VERIFICATION, only count if not expired
  // Include COMPLETED so completed washes do not reopen used slots today
  const activeBookings = await prisma.booking.findMany({
    where: {
      branchId: branch.id,
      bookingDate: date,
      OR: [
        { status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] } },
        {
          status: "PENDING_VERIFICATION",
          expiresAt: { gt: now },
        },
      ],
    },
    select: {
      id: true,
      assignedBayId: true,
      startTime: true,
      endTime: true,
      status: true,
    },
  });

  // Generate candidate slots from openTime up to closeTime - duration
  const slots: TimeSlot[] = [];
  let candidateMinutes = openMinutes;

  while (candidateMinutes + duration <= closeMinutes) {
    const slotStartMin = candidateMinutes;
    const slotEndMin = candidateMinutes + duration;
    const timeStr = formatMinutesToTime(slotStartMin);

    // Rule: Must not be in the past
    // If current time is e.g. 14:31, slots starting at or before 14:30 (e.g. 14:00, 14:30) have passed.
    const isPast = slotStartMin < currentMinutes;

    if (isPast) {
      // Past slots are marked unavailable, passed, and closed
      slots.push({
        time: timeStr,
        displayTime: formatDisplayTime(timeStr),
        available: false,
        isPassed: true,
        isFull: false,
        status: "PASSED",
      });
      candidateMinutes += duration;
      continue;
    }

    // Check occupied bays during this slot
    // A booking overlaps if max(bStart, slotStart) < min(bEnd, slotEnd)
    const occupiedBayIds = new Set<string>();

    for (const booking of activeBookings) {
      if (bayId && booking.assignedBayId !== bayId) {
        continue;
      }
      const bStart = parseTimeToMinutes(booking.startTime);
      const bEnd = parseTimeToMinutes(booking.endTime);

      if (Math.max(bStart, slotStartMin) < Math.min(bEnd, slotEndMin)) {
        occupiedBayIds.add(booking.assignedBayId);
      }
    }

    const availableBaysCount = totalBays - occupiedBayIds.size;
    const isAvailable = availableBaysCount > 0;

    slots.push({
      time: timeStr,
      displayTime: formatDisplayTime(timeStr),
      available: isAvailable,
      isPassed: false,
      isFull: !isAvailable,
      status: isAvailable ? "AVAILABLE" : "BOOKED",
    });

    candidateMinutes += duration;
  }

  // Calculate Nearest Available: first available slot starting at or after current server time
  const nearestAvailableSlot =
    slots.find(
      (s) => s.available && !s.isPassed && parseTimeToMinutes(s.time) >= currentMinutes
    ) || null;

  return {
    branchId: branch.id,
    brandName: branch.brand.name,
    branchName: branch.name,
    address: branch.address,
    openTime: branch.openTime,
    closeTime: branch.closeTime,
    avgDurationMinutes: duration,
    isClosedNow,
    date,
    serverTime: getCairoTimeString(now),
    serverDate: getCairoDateString(now),
    serverCurrentMinutes: currentMinutes,
    serverTimestamp: now.getTime(),
    nearestAvailableSlot,
    slots,
    services,
  };
}