import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getBranchAvailability } from "@/lib/services/availability";
import { createBookingReservation } from "@/lib/services/booking-engine";
import {
  getCairoCurrentMinutes,
  getCairoDateString,
  getCairoTimeString,
  getTodayDateString,
  parseTimeToMinutes,
} from "@/lib/utils";

describe("Real-Time Booking System", () => {
  const today = getTodayDateString();
  const createdBookingIds: string[] = [];

  afterEach(async () => {
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
      createdBookingIds.length = 0;
    }
  });

  it("calculates slots based on server Cairo time and includes server metadata", async () => {
    // Simulated Cairo time: 10:00 AM (600 minutes)
    const availability = await getBranchAvailability("clean-car-maadi", today, 10 * 60);

    expect(availability.serverTime).toBeDefined();
    expect(availability.serverDate).toBe(today);
    expect(availability.serverCurrentMinutes).toBe(600);
    expect(availability.serverTimestamp).toBeGreaterThan(0);
  });

  it("marks future slot as available when bays are free", async () => {
    // Simulated time: 13:00 (1:00 PM)
    const availability = await getBranchAvailability("clean-car-maadi", today, 13 * 60);

    // Slot 14:00 (2:00 PM) is in the future
    const slot1400 = availability.slots.find((s) => s.time === "14:00");
    expect(slot1400).toBeDefined();
    expect(slot1400?.available).toBe(true);
    expect(slot1400?.isPassed).toBe(false);
    expect(slot1400?.status).toBe("AVAILABLE");
  });

  it("marks current slot as bookable according to existing booking rules", async () => {
    // At exactly 14:30 (2:30 PM), slot 14:30 start time has not passed
    const currentMin = 14 * 60 + 30; // 870 min
    const availability = await getBranchAvailability("clean-car-maadi", today, currentMin);

    const slot1430 = availability.slots.find((s) => s.time === "14:30");
    expect(slot1430).toBeDefined();
    expect(slot1430?.isPassed).toBe(false);
    expect(slot1430?.available).toBe(true);
    expect(slot1430?.status).toBe("AVAILABLE");

    // Backend also allows booking the current slot
    const booking = await createBookingReservation({
      branchIdOrQr: "clean-car-maadi",
      customerName: "Current Slot Customer",
      customerPhone: "+201011223344",
      bookingDate: today,
      startTime: "14:30",
      simulatedCurrentMinutes: currentMin,
    });
    createdBookingIds.push(booking.bookingId);

    expect(booking.status).toBe("CONFIRMED");
    expect(booking.startTime).toBe("14:30");
  });

  it("automatically marks passed slots as closed when current time passes", async () => {
    // At 14:31 (2:31 PM), slots 14:00 and 14:30 must be closed/passed
    const currentMin = 14 * 60 + 31; // 871 min
    const availability = await getBranchAvailability("clean-car-maadi", today, currentMin);

    const slot1400 = availability.slots.find((s) => s.time === "14:00");
    const slot1430 = availability.slots.find((s) => s.time === "14:30");
    const slot1500 = availability.slots.find((s) => s.time === "15:00");

    // 14:00 must be closed / passed
    expect(slot1400?.available).toBe(false);
    expect(slot1400?.isPassed).toBe(true);
    expect(slot1400?.status).toBe("PASSED");

    // 14:30 must be closed / passed
    expect(slot1430?.available).toBe(false);
    expect(slot1430?.isPassed).toBe(true);
    expect(slot1430?.status).toBe("PASSED");

    // 15:00 is future, so it should be available
    expect(slot1500?.available).toBe(true);
    expect(slot1500?.isPassed).toBe(false);
    expect(slot1500?.status).toBe("AVAILABLE");

    // Nearest available slot must NOT be 14:00 or 14:30
    expect(availability.nearestAvailableSlot?.time).toBe("15:00");
  });

  it("backend rejects booking attempt for a passed slot", async () => {
    // Current time: 15:00 (3:00 PM = 900 min)
    // Customer attempts to book 14:30 (start time already passed)
    await expect(
      createBookingReservation({
        branchIdOrQr: "clean-car-maadi",
        customerName: "Late Customer",
        customerPhone: "+201099881122",
        bookingDate: today,
        startTime: "14:30",
        simulatedCurrentMinutes: 15 * 60,
      })
    ).rejects.toThrow("PAST_TIME: Selected time has already passed.");
  });

  it("prevents race conditions and guarantees slot capacity is never exceeded", async () => {
    // Branch "clean-car-nasr-city" has exactly 2 wash bays
    const branch = await prisma.branch.findUnique({
      where: { qrIdentifier: "clean-car-nasr-city" },
      include: { washBays: true },
    });
    expect(branch?.washBays.length).toBe(2);

    // Simulated time before the slot: 17:00 (slot is 18:00)
    const simulatedTime = 17 * 60;
    const targetSlot = "18:00";

    // 5 concurrent customers attempt to book the exact same slot simultaneously
    const attempts = [1, 2, 3, 4, 5].map((i) =>
      createBookingReservation({
        branchIdOrQr: "clean-car-nasr-city",
        customerName: `Concurrent Customer ${i}`,
        customerPhone: `+20101111220${i}`,
        bookingDate: today,
        startTime: targetSlot,
        simulatedCurrentMinutes: simulatedTime,
      })
        .then((res) => {
          createdBookingIds.push(res.bookingId);
          return { success: true, booking: res };
        })
        .catch((err) => ({ success: false, error: err.message }))
    );

    const results = await Promise.all(attempts);

    const successes = results.filter((r) => r.success);
    const failures = results.filter((r) => !r.success);

    // Exactly 2 must succeed (the bay capacity)
    expect(successes.length).toBe(2);

    // Exactly 3 must fail with SLOT_FULLY_BOOKED
    expect(failures.length).toBe(3);
    for (const f of failures) {
      expect((f as any).error).toContain("SLOT_FULLY_BOOKED");
    }

    // Verify database integrity: exactly 2 bookings exist for that slot, assigned to distinct bays
    const dbBookings = await prisma.booking.findMany({
      where: {
        branchId: branch!.id,
        bookingDate: today,
        startTime: targetSlot,
        status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] },
      },
    });

    expect(dbBookings.length).toBe(2);
    const assignedBayIds = new Set(dbBookings.map((b) => b.assignedBayId));
    expect(assignedBayIds.size).toBe(2); // No bay is double-booked!
  });

  it("handles Cairo timezone conversions consistently", () => {
    // Create a known UTC date: 2026-09-09 12:00:00 UTC (which is 15:00 in Cairo, UTC+3)
    const dateUtc = new Date("2026-09-09T12:00:00Z");
    const cairoDate = getCairoDateString(dateUtc);
    const cairoTime = getCairoTimeString(dateUtc);
    const cairoMin = getCairoCurrentMinutes(dateUtc);

    expect(cairoDate).toBe("2026-09-09");
    expect(cairoTime).toBe("15:00");
    expect(cairoMin).toBe(15 * 60);
  });
});
