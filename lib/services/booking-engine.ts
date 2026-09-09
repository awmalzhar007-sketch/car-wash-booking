import { prisma } from "@/lib/prisma";
import {
  formatDisplayDate,
  formatDisplayTime,
  formatMinutesToTime,
  generateBookingNumber,
  getCairoCurrentMinutes,
  getTodayDateString,
  normalizePhone,
  parseTimeToMinutes,
} from "@/lib/utils";
import { CustomerBookingSummary, ServiceItem, StaffBookingDetail } from "@/lib/types";

export interface CreateBookingReservationInput {
  branchIdOrQr: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string; // "HH:mm"
  selectedServiceIds?: string[];
  simulatedCurrentMinutes?: number; // Optional simulated time for testing determinism
}

export interface BookingReservationResult {
  id: string;
  bookingId: string;
  bookingNumber: string;
  brandName: string;
  branchName: string;
  bookingDate: string;
  displayDate: string;
  startTime: string;
  endTime: string;
  displayTime: string;
  estimatedDuration: number;
  status: "CONFIRMED";
  customerName: string;
  customerPhone: string;
  services: ServiceItem[];
  totalPrice: number;
}

export async function createBookingReservation(
  input: CreateBookingReservationInput
): Promise<BookingReservationResult> {
  const {
    branchIdOrQr,
    customerName,
    customerPhone,
    bookingDate,
    startTime,
    selectedServiceIds,
  } = input;

  if (!customerName || customerName.trim().length < 2) {
    throw new Error("INVALID_NAME: Please enter a valid name (at least 2 characters).");
  }

  const cleanPhone = normalizePhone(customerPhone);
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new Error("INVALID_PHONE: Please enter a valid phone number.");
  }

  const today = getTodayDateString();
  if (bookingDate !== today) {
    throw new Error("SAME_DAY_ONLY: You can only book for today.");
  }

  const startMin = parseTimeToMinutes(startTime);

  // Execute in an atomic transaction to guarantee bay assignment & prevent race conditions
  return await prisma.$transaction(async (tx) => {
    // 1. Fetch branch with active wash bays
    const branch = await tx.branch.findFirst({
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
          orderBy: { bayNumber: "asc" },
        },
      },
    });

    if (!branch) {
      throw new Error("BRANCH_NOT_FOUND: Branch does not exist or is inactive.");
    }

    // Acquire write lock on branch to serialize concurrent booking reservations
    // and prevent race conditions on bay assignment
    await tx.branch.update({
      where: { id: branch.id },
      data: { updatedAt: new Date() },
    });

    // Resolve selected services (must belong to this branch and be active)
    const uniqueServiceIds = Array.from(new Set(selectedServiceIds || []));
    const resolvedServices =
      uniqueServiceIds.length > 0
        ? await tx.service.findMany({
            where: {
              id: { in: uniqueServiceIds },
              branchId: branch.id,
              isActive: true,
            },
          })
        : [];

    const services: ServiceItem[] = resolvedServices.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMinutes: s.durationMinutes,
    }));
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    const openMin = parseTimeToMinutes(branch.openTime);
    const closeMin = parseTimeToMinutes(branch.closeTime);
    // The wash duration is driven by the selected services (each service's
    // duration is set by branch staff). With no services selected, fall back
    // to the branch's average duration. This is what makes the bay schedule
    // automatically reflect the real time a booking will take.
    const duration =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.durationMinutes, 0)
        : branch.avgDurationMinutes;
    const endMin = startMin + duration;

    // Validate operating hours
    if (startMin < openMin || endMin > closeMin) {
      throw new Error("OUTSIDE_HOURS: Selected slot is outside branch operating hours.");
    }

    // Validate slot is not in the past
    // Egypt (Africa/Cairo) server time is the source of truth
    const now = new Date();
    const currentMin =
      input.simulatedCurrentMinutes !== undefined
        ? input.simulatedCurrentMinutes
        : getCairoCurrentMinutes(now);

    if (startMin < currentMin) {
      throw new Error("PAST_TIME: Selected time has already passed.");
    }

    const endTime = formatMinutesToTime(endMin);

    // 2. Query active overlapping bookings for this branch
    const activeBookings = await tx.booking.findMany({
      where: {
        branchId: branch.id,
        bookingDate,
        OR: [
          { status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] } },
          {
            status: "PENDING_VERIFICATION",
            expiresAt: { gt: now },
          },
        ],
      },
    });

    // Check which bays are occupied
    const occupiedBayIds = new Set<string>();
    for (const b of activeBookings) {
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      if (Math.max(bStart, startMin) < Math.min(bEnd, endMin)) {
        occupiedBayIds.add(b.assignedBayId);
      }
    }

    // 3. Find first available bay
    const availableBay = branch.washBays.find((bay) => !occupiedBayIds.has(bay.id));

    if (!availableBay) {
      throw new Error("SLOT_FULLY_BOOKED: This time slot was just booked by another customer. Please select another time.");
    }

    // Concurrency guarantee: double-check that this specific bay was not booked by another committed transaction
    const conflictingBooking = await tx.booking.findFirst({
      where: {
        assignedBayId: availableBay.id,
        bookingDate,
        status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] },
        AND: [
          { startTime: { lt: endTime } },
          { endTime: { gt: startTime } },
        ],
      },
    });

    if (conflictingBooking) {
      throw new Error("SLOT_FULLY_BOOKED: This time slot was just booked by another customer. Please select another time.");
    }

    // 4. Generate unique booking number
    let bookingNumber = generateBookingNumber();
    let collisionCheck = await tx.booking.findUnique({ where: { bookingNumber } });
    while (collisionCheck) {
      bookingNumber = generateBookingNumber();
      collisionCheck = await tx.booking.findUnique({ where: { bookingNumber } });
    }

    // 5. Create booking directly as CONFIRMED (no OTP required)
    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        branchId: branch.id,
        assignedBayId: availableBay.id,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        bookingDate,
        startTime,
        endTime,
        status: "CONFIRMED",
        expiresAt: null,
        servicesJson: services.length > 0 ? JSON.stringify(services) : null,
        totalPrice,
      },
    });

    return {
      id: booking.id,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      brandName: branch.brand.name,
      branchName: branch.name,
      bookingDate: booking.bookingDate,
      displayDate: formatDisplayDate(booking.bookingDate),
      startTime: booking.startTime,
      endTime: booking.endTime,
      displayTime: formatDisplayTime(booking.startTime),
      estimatedDuration: duration,
      status: "CONFIRMED",
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      services,
      totalPrice,
    };
  });
}

export interface CreateWalkInBookingInput {
  branchId: string;
  customerName: string;
  customerPhone: string;
  selectedServiceIds?: string[];
  // Staff can pin the car to a specific bay (e.g. "put it in Bay 2"); if
  // omitted, the first free bay is auto-assigned, same as the online flow.
  bayId?: string;
  // "HH:mm". Defaults to right now — a walk-in has already arrived, so
  // unlike the online flow there's no reason to require a future time.
  startTime?: string;
}

/**
 * Staff-created booking for a customer who showed up without booking
 * online first. Skips OTP verification entirely (the customer and car are
 * physically present, so there's nothing to verify) and lands the booking
 * straight in CONFIRMED status, ready for staff to start the wash from the
 * existing status controls.
 */
export async function createStaffWalkInBooking(
  input: CreateWalkInBookingInput
): Promise<StaffBookingDetail> {
  const { branchId, customerName, customerPhone, selectedServiceIds, bayId } = input;

  if (!customerName || customerName.trim().length < 2) {
    throw new Error("INVALID_NAME: Please enter a valid name (at least 2 characters).");
  }

  const cleanPhone = normalizePhone(customerPhone);
  if (!cleanPhone || cleanPhone.length < 8) {
    throw new Error("INVALID_PHONE: Please enter a valid phone number.");
  }

  return await prisma.$transaction(async (tx) => {
    const branch = await tx.branch.findFirst({
      where: { id: branchId, isActive: true },
      include: {
        washBays: {
          where: { isActive: true },
          orderBy: { bayNumber: "asc" },
        },
      },
    });

    if (!branch) {
      throw new Error("BRANCH_NOT_FOUND: Branch does not exist or is inactive.");
    }

    const uniqueServiceIds = Array.from(new Set(selectedServiceIds || []));
    const resolvedServices =
      uniqueServiceIds.length > 0
        ? await tx.service.findMany({
            where: {
              id: { in: uniqueServiceIds },
              branchId: branch.id,
              isActive: true,
            },
          })
        : [];

    const services: ServiceItem[] = resolvedServices.map((s) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      price: s.price,
      durationMinutes: s.durationMinutes,
    }));
    const totalPrice = services.reduce((sum, s) => sum + s.price, 0);

    const openMin = parseTimeToMinutes(branch.openTime);
    const closeMin = parseTimeToMinutes(branch.closeTime);
    const duration =
      services.length > 0
        ? services.reduce((sum, s) => sum + s.durationMinutes, 0)
        : branch.avgDurationMinutes;

    const now = new Date();
    // Round down to the nearest 5 minutes in Egypt (Africa/Cairo) timezone
    const nowCairoMin = getCairoCurrentMinutes(now);
    const nowMin = Math.floor(nowCairoMin / 5) * 5;
    const startMin = input.startTime ? parseTimeToMinutes(input.startTime) : nowMin;
    const endMin = startMin + duration;

    if (startMin < openMin || endMin > closeMin) {
      throw new Error("OUTSIDE_HOURS: Selected time is outside branch operating hours.");
    }

    const startTime = formatMinutesToTime(startMin);
    const endTime = formatMinutesToTime(endMin);
    const bookingDate = getTodayDateString();

    // Same active-booking overlap check as the online flow, so a walk-in
    // can never double-book a bay that's already occupied or reserved.
    const activeBookings = await tx.booking.findMany({
      where: {
        branchId: branch.id,
        bookingDate,
        OR: [
          { status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] } },
          { status: "PENDING_VERIFICATION", expiresAt: { gt: now } },
        ],
      },
    });

    const occupiedBayIds = new Set<string>();
    for (const b of activeBookings) {
      const bStart = parseTimeToMinutes(b.startTime);
      const bEnd = parseTimeToMinutes(b.endTime);
      if (Math.max(bStart, startMin) < Math.min(bEnd, endMin)) {
        occupiedBayIds.add(b.assignedBayId);
      }
    }

    let assignedBay;
    if (bayId) {
      assignedBay = branch.washBays.find((bay) => bay.id === bayId);
      if (!assignedBay) {
        throw new Error("BAY_NOT_FOUND: Selected bay does not exist or is inactive.");
      }
      if (occupiedBayIds.has(assignedBay.id)) {
        throw new Error("BAY_OCCUPIED: The selected bay is already booked for that time.");
      }
    } else {
      assignedBay = branch.washBays.find((bay) => !occupiedBayIds.has(bay.id));
      if (!assignedBay) {
        throw new Error("SLOT_FULLY_BOOKED: No bay is free at that time. Try a later time or a different bay.");
      }
    }

    let bookingNumber = generateBookingNumber();
    let collisionCheck = await tx.booking.findUnique({ where: { bookingNumber } });
    while (collisionCheck) {
      bookingNumber = generateBookingNumber();
      collisionCheck = await tx.booking.findUnique({ where: { bookingNumber } });
    }

    const booking = await tx.booking.create({
      data: {
        bookingNumber,
        branchId: branch.id,
        assignedBayId: assignedBay.id,
        customerName: customerName.trim(),
        customerPhone: cleanPhone,
        bookingDate,
        startTime,
        endTime,
        status: "CONFIRMED",
        servicesJson: services.length > 0 ? JSON.stringify(services) : null,
        totalPrice,
      },
    });

    return {
      id: booking.id,
      bookingNumber: booking.bookingNumber,
      customerName: booking.customerName,
      customerPhone: booking.customerPhone,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      displayTime: formatDisplayTime(booking.startTime),
      estimatedDuration: duration,
      status: "CONFIRMED",
      assignedBayId: assignedBay.id,
      assignedBayName: assignedBay.name,
      bayNumber: assignedBay.bayNumber,
      createdAt: booking.createdAt.toISOString(),
      services,
      totalPrice,
    };
  });
}

/**
 * Confirms a booking after successful OTP verification
 */
export async function confirmBookingAfterOTP(
  bookingId: string
): Promise<CustomerBookingSummary> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      branch: {
        include: { brand: true },
      },
    },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  if (booking.status === "CONFIRMED") {
    return sanitizeCustomerBooking(booking);
  }

  if (booking.status !== "PENDING_VERIFICATION") {
    throw new Error(`INVALID_STATUS_TRANSITION: Booking is already ${booking.status}`);
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: "CONFIRMED",
      expiresAt: null,
    },
    include: {
      branch: {
        include: { brand: true },
      },
    },
  });

  return sanitizeCustomerBooking(updatedBooking);
}

/**
 * Cancels a booking and immediately releases capacity.
 * Supports cancelling by either booking ID or booking number,
 * with optional phone number verification.
 */
export async function cancelBooking(
  bookingIdOrNumber: string,
  verifiedPhone?: string
): Promise<CustomerBookingSummary> {
  const cleanCode = bookingIdOrNumber.trim().toUpperCase();
  const booking = await prisma.booking.findFirst({
    where: {
      OR: [
        { id: bookingIdOrNumber },
        { bookingNumber: cleanCode },
        { bookingNumber: bookingIdOrNumber.trim() },
      ],
    },
    include: {
      branch: {
        include: { brand: true },
      },
    },
  });

  if (!booking) {
    throw new Error("BOOKING_NOT_FOUND");
  }

  if (verifiedPhone) {
    const cleanPhone = normalizePhone(verifiedPhone);
    if (normalizePhone(booking.customerPhone) !== cleanPhone) {
      throw new Error("PHONE_MISMATCH: Phone number does not match this booking.");
    }
  }

  if (booking.status === "CANCELLED") {
    return sanitizeCustomerBooking(booking);
  }

  if (booking.status === "COMPLETED") {
    throw new Error("CANNOT_CANCEL: Wash is already completed.");
  }

  const updatedBooking = await prisma.booking.update({
    where: { id: booking.id },
    data: {
      status: "CANCELLED",
      cancelledAt: new Date(),
      expiresAt: null,
    },
    include: {
      branch: {
        include: { brand: true },
      },
    },
  });

  return sanitizeCustomerBooking(updatedBooking);
}

/**
 * Customer sanitized booking summary - STRICT PRIVACY: NEVER EXPOSES BAY!
 */
export function sanitizeCustomerBooking(booking: any): CustomerBookingSummary {
  let services: ServiceItem[] = [];
  if (booking.servicesJson) {
    try {
      services = JSON.parse(booking.servicesJson);
    } catch {
      services = [];
    }
  }

  // Derive the actual duration from the booked start/end time (which was
  // computed from the selected services' durations at booking time) rather
  // than the branch's current average, so this always reflects reality even
  // if service durations change later.
  const estimatedDuration =
    parseTimeToMinutes(booking.endTime) - parseTimeToMinutes(booking.startTime);

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    brandName: booking.branch.brand.name,
    branchName: booking.branch.name,
    bookingDate: booking.bookingDate,
    displayDate: formatDisplayDate(booking.bookingDate),
    startTime: booking.startTime,
    endTime: booking.endTime,
    displayTime: formatDisplayTime(booking.startTime),
    estimatedDuration,
    status: booking.status,
    customerName: booking.customerName,
    customerPhone: booking.customerPhone,
    services,
    totalPrice: booking.totalPrice ?? 0,
  };
}