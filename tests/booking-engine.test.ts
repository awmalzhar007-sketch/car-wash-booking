import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createBookingReservation,
  confirmBookingAfterOTP,
  cancelBooking,
} from "@/lib/services/booking-engine";
import { getTodayDateString } from "@/lib/utils";

describe("Booking Engine", () => {
  const today = getTodayDateString();
  const createdBookingIds: string[] = [];

  afterEach(async () => {
    if (createdBookingIds.length > 0) {
      await prisma.oTPChallenge.deleteMany({
        where: { bookingId: { in: createdBookingIds } },
      });
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
      createdBookingIds.length = 0;
    }
  });

  it("creates a booking directly as CONFIRMED and automatically assigns a free bay without exposing it", async () => {
    // Pick an evening slot: "19:00"
    const result = await createBookingReservation({
      branchIdOrQr: "clean-car-maadi",
      customerName: "Omar Tarek",
      customerPhone: "+201012345678",
      bookingDate: today,
      startTime: "19:00",
    });

    createdBookingIds.push(result.bookingId);

    expect(result.bookingNumber).toMatch(/^CW-\d{4}$/);
    expect(result.brandName).toBe("Clean Car");
    expect(result.branchName).toBe("Maadi Branch");
    expect(result.startTime).toBe("19:00");
    expect(result.endTime).toBe("19:30");
    expect(result.status).toBe("CONFIRMED");
    expect((result as any).otpChallenge).toBeUndefined();

    // Verify customer response DOES NOT contain bay details
    expect((result as any).assignedBayId).toBeUndefined();
    expect((result as any).bayNumber).toBeUndefined();

    // Verify DB record has an assigned bay and status is CONFIRMED immediately
    const dbBooking = await prisma.booking.findUnique({
      where: { id: result.bookingId },
      include: { assignedBay: true },
    });
    expect(dbBooking).not.toBeNull();
    expect(dbBooking?.status).toBe("CONFIRMED");
    expect(dbBooking?.assignedBay).not.toBeNull();
  });

  it("allows cancelling by booking number and releases capacity", async () => {
    const reservation = await createBookingReservation({
      branchIdOrQr: "clean-car-maadi",
      customerName: "Kareem Adel",
      customerPhone: "+201022223333",
      bookingDate: today,
      startTime: "19:30",
    });
    createdBookingIds.push(reservation.bookingId);

    const cancelled = await cancelBooking(reservation.bookingNumber, "+201022223333");
    expect(cancelled.status).toBe("CANCELLED");
    expect(cancelled.bookingNumber).toBe(reservation.bookingNumber);
  });

  it("prevents overbooking when all bays are occupied for that slot", async () => {
    const branch = await prisma.branch.findUnique({
      where: { qrIdentifier: "clean-car-nasr-city" },
      include: { washBays: true },
    });
    // Nasr City has 2 bays
    expect(branch?.washBays.length).toBe(2);

    // Book bay 1
    const b1 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "User One",
      customerPhone: "+201011110001",
      bookingDate: today,
      startTime: "22:00",
    });
    createdBookingIds.push(b1.bookingId);

    // Book bay 2
    const b2 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "User Two",
      customerPhone: "+201011110002",
      bookingDate: today,
      startTime: "22:00",
    });
    createdBookingIds.push(b2.bookingId);

    // Third booking attempt for the same slot must fail!
    await expect(
      createBookingReservation({
        branchIdOrQr: "clean-car-nasr-city",
        customerName: "User Three",
        customerPhone: "+201011110003",
        bookingDate: today,
        startTime: "22:00",
      })
    ).rejects.toThrow("SLOT_FULLY_BOOKED");
  });

  it("cancellation immediately releases capacity for another customer", async () => {
    // Book slot 20:00 in Nasr City (both bays)
    const b1 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "Customer A",
      customerPhone: "+201055550001",
      bookingDate: today,
      startTime: "20:00",
    });
    createdBookingIds.push(b1.bookingId);

    const b2 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "Customer B",
      customerPhone: "+201055550002",
      bookingDate: today,
      startTime: "20:00",
    });
    createdBookingIds.push(b2.bookingId);

    // Cancel Customer A's booking
    await cancelBooking(b1.bookingId);

    // Now a new customer should be able to book 20:00
    const b3 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "Customer C",
      customerPhone: "+201055550003",
      bookingDate: today,
      startTime: "20:00",
    });
    createdBookingIds.push(b3.bookingId);

    expect(b3.bookingNumber).toBeDefined();
  });
});