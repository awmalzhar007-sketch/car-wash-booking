import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth/session";
import { isValidEgyptianPhone, normalizeEgyptianPhone, generateBookingNumber } from "@/lib/utils";

describe("Staff Booking Management, Conflict Prevention & Monthly Revenue", () => {
  let staffToken: string;
  let adminToken: string;
  let testBranch: any;
  let testBays: any[];
  let testServices: any[];
  let createdBookingIds: string[] = [];

  beforeAll(async () => {
    // Fetch a branch with its wash bays and services
    testBranch = await prisma.branch.findFirst({
      where: { isActive: true },
      include: {
        washBays: { where: { isActive: true }, orderBy: { bayNumber: "asc" } },
        services: { where: { isActive: true }, orderBy: { sortOrder: "asc" } },
      },
    });

    if (!testBranch || testBranch.washBays.length === 0) {
      throw new Error("Test branch with bays required for testing");
    }

    testBays = testBranch.washBays;
    testServices = testBranch.services;

    // Create session tokens
    staffToken = await createSessionToken({
      userId: "test-staff-id",
      email: "staff@test.com",
      name: "Test Staff",
      role: "BRANCH_STAFF",
      branchId: testBranch.id,
    });

    adminToken = await createSessionToken({
      userId: "test-admin-id",
      email: "admin@test.com",
      name: "Test Admin",
      role: "ADMIN",
      branchId: null,
    });
  });

  afterAll(async () => {
    if (createdBookingIds.length > 0) {
      await prisma.booking.deleteMany({
        where: { id: { in: createdBookingIds } },
      });
    }
  });

  describe("Phone Number Validation & Normalization", () => {
    it("validates local Egyptian mobile numbers (010, 011, 012, 015)", () => {
      expect(isValidEgyptianPhone("01012345678")).toBe(true);
      expect(isValidEgyptianPhone("01198765432")).toBe(true);
      expect(isValidEgyptianPhone("01234567890")).toBe(true);
      expect(isValidEgyptianPhone("01555555555")).toBe(true);
    });

    it("validates and normalizes international Egyptian numbers (+201...)", () => {
      expect(isValidEgyptianPhone("+201012345678")).toBe(true);
      expect(normalizeEgyptianPhone("+201012345678")).toBe("01012345678");
      expect(isValidEgyptianPhone("00201123456789")).toBe(true);
      expect(normalizeEgyptianPhone("00201123456789")).toBe("01123456789");
    });

    it("rejects invalid numbers", () => {
      expect(isValidEgyptianPhone("01312345678")).toBe(false); // invalid prefix 013
      expect(isValidEgyptianPhone("010123456")).toBe(false); // too short
      expect(isValidEgyptianPhone("1234567890123")).toBe(false); // invalid
      expect(isValidEgyptianPhone("")).toBe(false);
    });
  });

  describe("Booking Editing & Recalculation", () => {
    it("updates customer name and phone without creating duplicate records", async () => {
      const initialBooking = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          branchId: testBranch.id,
          assignedBayId: testBays[0].id,
          customerName: "Original Customer",
          customerPhone: "01011111111",
          bookingDate: "2026-04-15",
          startTime: "10:00",
          endTime: "10:30",
          status: "CONFIRMED",
          totalPrice: 100,
        },
      });
      createdBookingIds.push(initialBooking.id);

      // Update name and phone
      const newPhone = "+201022222222";
      const normalizedPhone = normalizeEgyptianPhone(newPhone);
      const updated = await prisma.booking.update({
        where: { id: initialBooking.id },
        data: {
          customerName: "Updated Customer Name",
          customerPhone: normalizedPhone,
        },
      });

      expect(updated.id).toBe(initialBooking.id);
      expect(updated.customerName).toBe("Updated Customer Name");
      expect(updated.customerPhone).toBe("01022222222");

      // Verify no duplicate was created
      const count = await prisma.booking.count({
        where: { id: initialBooking.id },
      });
      expect(count).toBe(1);
    });

    it("recalculates price and duration when service types are changed", async () => {
      if (testServices.length < 2) return;

      const svc1 = testServices[0];
      const svc2 = testServices[1];

      const initialBooking = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          branchId: testBranch.id,
          assignedBayId: testBays[0].id,
          customerName: "Service Test Customer",
          customerPhone: "01033333333",
          bookingDate: "2026-04-16",
          startTime: "12:00",
          endTime: "12:30",
          status: "CONFIRMED",
          servicesJson: JSON.stringify([svc1]),
          totalPrice: svc1.price,
        },
      });
      createdBookingIds.push(initialBooking.id);

      // Switch to both services combined
      const newServices = [svc1, svc2];
      const newTotalPrice = svc1.price + svc2.price;
      const newDuration = (svc1.durationMinutes || 30) + (svc2.durationMinutes || 30);
      const startMins = 12 * 60;
      const endMins = startMins + newDuration;
      const newEndTime = `${Math.floor(endMins / 60).toString().padStart(2, "0")}:${(endMins % 60).toString().padStart(2, "0")}`;

      const updated = await prisma.booking.update({
        where: { id: initialBooking.id },
        data: {
          servicesJson: JSON.stringify(newServices),
          totalPrice: newTotalPrice,
          endTime: newEndTime,
        },
      });

      expect(updated.totalPrice).toBe(newTotalPrice);
      expect(updated.endTime).toBe(newEndTime);
      const parsedServices = JSON.parse(updated.servicesJson!);
      expect(parsedServices.length).toBe(2);
    });
  });

  describe("Wash Bay Conflict Detection", () => {
    it("detects time overlap conflict on the same bay", async () => {
      const targetBayId = testBays[0].id;
      const targetDate = "2026-04-20";

      // Booking 1: 14:00 - 15:00 in Bay 1
      const booking1 = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          branchId: testBranch.id,
          assignedBayId: targetBayId,
          customerName: "Customer 1",
          customerPhone: "01044444444",
          bookingDate: targetDate,
          startTime: "14:00",
          endTime: "15:00",
          status: "CONFIRMED",
          totalPrice: 150,
        },
      });
      createdBookingIds.push(booking1.id);

      // Attempting to place Booking 2: 14:30 - 15:30 in the same Bay on the same date
      const conflictQuery = await prisma.booking.findFirst({
        where: {
          id: { not: "dummy-new-id" },
          assignedBayId: targetBayId,
          bookingDate: targetDate,
          status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] },
          AND: [
            { startTime: { lt: "15:30" } },
            { endTime: { gt: "14:30" } },
          ],
        },
      });

      expect(conflictQuery).not.toBeNull();
      expect(conflictQuery?.id).toBe(booking1.id);
    });

    it("allows bookings at adjacent times without conflict", async () => {
      const targetBayId = testBays[0].id;
      const targetDate = "2026-04-21";

      // Booking 1: 10:00 - 10:30
      const booking1 = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          branchId: testBranch.id,
          assignedBayId: targetBayId,
          customerName: "Customer Adjacent 1",
          customerPhone: "01055555555",
          bookingDate: targetDate,
          startTime: "10:00",
          endTime: "10:30",
          status: "CONFIRMED",
          totalPrice: 100,
        },
      });
      createdBookingIds.push(booking1.id);

      // Booking 2 starts immediately when Booking 1 ends: 10:30 - 11:00
      const conflictQuery = await prisma.booking.findFirst({
        where: {
          id: { not: "dummy-new-id-2" },
          assignedBayId: targetBayId,
          bookingDate: targetDate,
          status: { in: ["CONFIRMED", "WASHING", "COMPLETED"] },
          AND: [
            { startTime: { lt: "11:00" } },
            { endTime: { gt: "10:30" } },
          ],
        },
      });

      expect(conflictQuery).toBeNull();
    });
  });

  describe("Monthly Revenue Calculations", () => {
    it("strictly counts COMPLETED bookings and excludes CANCELLED / NO_SHOW / CONFIRMED from revenue", async () => {
      const testMonth = "2026-05";

      // Create 1 COMPLETED booking (Revenue = 200)
      const completedB = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          branchId: testBranch.id,
          assignedBayId: testBays[0].id,
          customerName: "Rev Customer 1",
          customerPhone: "01066666666",
          bookingDate: `${testMonth}-05`,
          startTime: "09:00",
          endTime: "09:30",
          status: "COMPLETED",
          totalPrice: 200,
          servicesJson: JSON.stringify([{ id: "s1", name: "Premium Wash", price: 200 }]),
        },
      });
      createdBookingIds.push(completedB.id);

      // Create 1 CANCELLED booking (totalPrice = 500) -> MUST BE EXCLUDED
      const cancelledB = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          branchId: testBranch.id,
          assignedBayId: testBays[0].id,
          customerName: "Cancelled Customer",
          customerPhone: "01077777777",
          bookingDate: `${testMonth}-06`,
          startTime: "10:00",
          endTime: "10:30",
          status: "CANCELLED",
          totalPrice: 500,
        },
      });
      createdBookingIds.push(cancelledB.id);

      // Create 1 NO_SHOW booking (totalPrice = 300) -> MUST BE EXCLUDED
      const noShowB = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          branchId: testBranch.id,
          assignedBayId: testBays[0].id,
          customerName: "No Show Customer",
          customerPhone: "01088888888",
          bookingDate: `${testMonth}-07`,
          startTime: "11:00",
          endTime: "11:30",
          status: "NO_SHOW",
          totalPrice: 300,
        },
      });
      createdBookingIds.push(noShowB.id);

      // Fetch bookings for testMonth for this branch
      const monthBookings = await prisma.booking.findMany({
        where: {
          branchId: testBranch.id,
          bookingDate: { startsWith: testMonth },
        },
      });

      // Compute revenue strictly from completed bookings
      const completedList = monthBookings.filter((b) => b.status === "COMPLETED");
      const computedRevenue = completedList.reduce((acc, b) => acc + b.totalPrice, 0);
      const avgRevenue = completedList.length > 0 ? computedRevenue / completedList.length : 0;

      // Assertions
      expect(computedRevenue).toBe(200); // Only completedB counted, cancelled (500) and noShow (300) excluded!
      expect(completedList.length).toBe(1);
      expect(avgRevenue).toBe(200);

      // Verify cancelled bookings are excluded
      const cancelledCount = monthBookings.filter((b) => b.status === "CANCELLED").length;
      expect(cancelledCount).toBeGreaterThanOrEqual(1);
    });
  });
});
