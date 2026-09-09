import { describe, it, expect, afterEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  createBookingReservation,
  cancelBooking,
} from "@/lib/services/booking-engine";
import { checkRateLimit, resetRateLimit } from "@/lib/services/rate-limit";
import { getTodayDateString, normalizeBookingCode, normalizePhone } from "@/lib/utils";

describe("Customer Booking & Cancellation Flow (No OTP)", () => {
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

  it("creates a customer booking directly in CONFIRMED status without OTP challenge", async () => {
    const booking = await createBookingReservation({
      branchIdOrQr: "clean-car-maadi",
      customerName: "Sara Ahmed",
      customerPhone: "+201012347777",
      bookingDate: today,
      startTime: "18:00",
    });

    createdBookingIds.push(booking.bookingId);

    // Direct confirmation check
    expect(booking.status).toBe("CONFIRMED");
    expect(booking.bookingNumber).toMatch(/^CW-\d{4}$/);
    expect((booking as any).otpChallenge).toBeUndefined();

    // Verify DB record
    const dbRecord = await prisma.booking.findUnique({
      where: { id: booking.bookingId },
    });
    expect(dbRecord).not.toBeNull();
    expect(dbRecord?.status).toBe("CONFIRMED");
    expect(dbRecord?.expiresAt).toBeNull();
  });

  it("validates that Booking Code and Phone Number must match the same booking", async () => {
    const booking = await createBookingReservation({
      branchIdOrQr: "clean-car-maadi",
      customerName: "Mahmoud Aly",
      customerPhone: "+201099991111",
      bookingDate: today,
      startTime: "18:30",
    });
    createdBookingIds.push(booking.bookingId);

    const cleanCode = normalizeBookingCode(booking.bookingNumber);
    const validPhone = normalizePhone("+201099991111");
    const wrongPhone = normalizePhone("+201099992222");

    // 1. Correct match query
    const match = await prisma.booking.findFirst({
      where: {
        bookingNumber: cleanCode,
        customerPhone: validPhone,
      },
    });
    expect(match).not.toBeNull();
    expect(match?.id).toBe(booking.bookingId);

    // 2. Mismatched phone query
    const mismatch = await prisma.booking.findFirst({
      where: {
        bookingNumber: cleanCode,
        customerPhone: wrongPhone,
      },
    });
    expect(mismatch).toBeNull();

    // 3. Non-existent booking code query
    const nonExistent = await prisma.booking.findFirst({
      where: {
        bookingNumber: "CW-99999",
        customerPhone: validPhone,
      },
    });
    expect(nonExistent).toBeNull();
  });

  it("cancels booking with Booking Code + Phone and releases bay capacity immediately", async () => {
    // Book slot 21:00 in Nasr City (bay capacity: 2)
    const b1 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "Customer 1",
      customerPhone: "+201044440001",
      bookingDate: today,
      startTime: "21:00",
    });
    createdBookingIds.push(b1.bookingId);

    const b2 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "Customer 2",
      customerPhone: "+201044440002",
      bookingDate: today,
      startTime: "21:00",
    });
    createdBookingIds.push(b2.bookingId);

    // Attempting a third booking at 21:00 must fail because both bays are full
    await expect(
      createBookingReservation({
        branchIdOrQr: "clean-car-nasr-city",
        customerName: "Customer 3",
        customerPhone: "+201044440003",
        bookingDate: today,
        startTime: "21:00",
      })
    ).rejects.toThrow("SLOT_FULLY_BOOKED");

    // Cancel Customer 1 using bookingNumber and customerPhone
    const cancelled = await cancelBooking(b1.bookingNumber, "+201044440001");
    expect(cancelled.status).toBe("CANCELLED");

    // Verify DB status is updated to CANCELLED with cancelledAt timestamp
    const dbBooking = await prisma.booking.findUnique({
      where: { id: b1.bookingId },
    });
    expect(dbBooking?.status).toBe("CANCELLED");
    expect(dbBooking?.cancelledAt).not.toBeNull();

    // Now Customer 3 can successfully book that same slot because capacity was freed!
    const b3 = await createBookingReservation({
      branchIdOrQr: "clean-car-nasr-city",
      customerName: "Customer 3",
      customerPhone: "+201044440003",
      bookingDate: today,
      startTime: "21:00",
    });
    createdBookingIds.push(b3.bookingId);
    expect(b3.status).toBe("CONFIRMED");
  });

  it("rejects cancellation when phone does not match", async () => {
    const booking = await createBookingReservation({
      branchIdOrQr: "clean-car-maadi",
      customerName: "Ahmed Farag",
      customerPhone: "+201011115555",
      bookingDate: today,
      startTime: "19:00",
    });
    createdBookingIds.push(booking.bookingId);

    await expect(
      cancelBooking(booking.bookingNumber, "+201011119999")
    ).rejects.toThrow("PHONE_MISMATCH");
  });

  it("rejects cancellation when booking is already COMPLETED", async () => {
    const booking = await createBookingReservation({
      branchIdOrQr: "clean-car-maadi",
      customerName: "Sameh Nabil",
      customerPhone: "+201077778888",
      bookingDate: today,
      startTime: "19:00",
    });
    createdBookingIds.push(booking.bookingId);

    // Update status to COMPLETED
    await prisma.booking.update({
      where: { id: booking.bookingId },
      data: { status: "COMPLETED" },
    });

    await expect(
      cancelBooking(booking.bookingNumber, "+201077778888")
    ).rejects.toThrow("CANNOT_CANCEL");
  });

  it("enforces rate limiting against repeated attempts", () => {
    const testKey = "test-rate-limit-key";
    resetRateLimit(testKey);

    // Allow up to 3 attempts
    const r1 = checkRateLimit(testKey, 3, 60000);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = checkRateLimit(testKey, 3, 60000);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = checkRateLimit(testKey, 3, 60000);
    expect(r3.allowed).toBe(true);
    expect(r3.remaining).toBe(0);

    // 4th attempt exceeds limit
    const r4 = checkRateLimit(testKey, 3, 60000);
    expect(r4.allowed).toBe(false);
    expect(r4.remaining).toBe(0);
    expect(r4.resetInSeconds).toBeGreaterThan(0);

    resetRateLimit(testKey);
  });
});
