import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getBranchAvailability } from "@/lib/services/availability";
import { getTodayDateString } from "@/lib/utils";

describe("Availability Service", () => {
  const today = getTodayDateString();

  it("calculates slots correctly within opening and closing hours", async () => {
    // Maadi Branch is 09:00 - 22:00, 30 min duration
    // Simulated current time: 08:00 (before opening)
    const availability = await getBranchAvailability("clean-car-maadi", today, 8 * 60);

    expect(availability.brandName).toBe("Clean Car");
    expect(availability.branchName).toBe("Maadi Branch");
    expect(availability.openTime).toBe("09:00");
    expect(availability.closeTime).toBe("22:00");
    expect(availability.slots.length).toBeGreaterThan(0);

    // First slot should be 09:00
    expect(availability.slots[0].time).toBe("09:00");

    // Last slot must not exceed closing time: 21:30 is last slot that ends at 22:00
    const lastSlot = availability.slots[availability.slots.length - 1];
    expect(lastSlot.time).toBe("21:30");
  });

  it("marks past slots as unavailable", async () => {
    // Simulated current time: 14:15 (2:15 PM)
    const availability = await getBranchAvailability("clean-car-maadi", today, 14 * 60 + 15);

    // Slots at or before 14:00 must be unavailable
    const slot0900 = availability.slots.find((s) => s.time === "09:00");
    const slot1400 = availability.slots.find((s) => s.time === "14:00");
    const slot1430 = availability.slots.find((s) => s.time === "14:30");

    expect(slot0900?.available).toBe(false);
    expect(slot1400?.available).toBe(false);
    // Future slot at 14:30 should be available if not fully occupied
    expect(slot1430?.available).toBe(true);
  });

  it("rejects future dates (strict same-day rule)", async () => {
    await expect(
      getBranchAvailability("clean-car-maadi", "2029-01-01")
    ).rejects.toThrow("SAME_DAY_ONLY");
  });

  it("identifies slot as available if at least 1 bay is free", async () => {
    const branch = await prisma.branch.findUnique({
      where: { qrIdentifier: "clean-car-maadi" },
      include: { washBays: { where: { isActive: true }, orderBy: { bayNumber: "asc" } } },
    });
    const bay1 = branch!.washBays[0];
    const bay2 = branch!.washBays[1];

    // Create bookings on Bay 1 and Bay 2 at 15:00, leaving Bay 3 free
    const b1 = await prisma.booking.create({
      data: {
        bookingNumber: "CW-TEST-FREE-1",
        branchId: branch!.id,
        assignedBayId: bay1.id,
        customerName: "User 1",
        customerPhone: "+201011112222",
        bookingDate: today,
        startTime: "15:00",
        endTime: "15:30",
        status: "CONFIRMED",
      },
    });
    const b2 = await prisma.booking.create({
      data: {
        bookingNumber: "CW-TEST-FREE-2",
        branchId: branch!.id,
        assignedBayId: bay2.id,
        customerName: "User 2",
        customerPhone: "+201011113333",
        bookingDate: today,
        startTime: "15:00",
        endTime: "15:30",
        status: "CONFIRMED",
      },
    });

    const availability = await getBranchAvailability("clean-car-maadi", today, 8 * 60);
    const slot1500 = availability.slots.find((s) => s.time === "15:00");
    expect(slot1500?.available).toBe(true);

    // Clean up
    await prisma.booking.deleteMany({ where: { id: { in: [b1.id, b2.id] } } });
  });

  it("identifies slot as unavailable when all bays are occupied", async () => {
    const branch = await prisma.branch.findUnique({
      where: { qrIdentifier: "clean-car-maadi" },
      include: { washBays: { where: { isActive: true }, orderBy: { bayNumber: "asc" } } },
    });

    const createdIds: string[] = [];
    for (let i = 0; i < branch!.washBays.length; i++) {
      const bay = branch!.washBays[i];
      const b = await prisma.booking.create({
        data: {
          bookingNumber: `CW-TEST-ALL-BAYS-${i}`,
          branchId: branch!.id,
          assignedBayId: bay.id,
          customerName: `User ${i}`,
          customerPhone: `+20109999000${i}`,
          bookingDate: today,
          startTime: "16:00",
          endTime: "16:30",
          status: "CONFIRMED",
        },
      });
      createdIds.push(b.id);
    }

    const availability = await getBranchAvailability("clean-car-maadi", today, 8 * 60);
    const slot1600 = availability.slots.find((s) => s.time === "16:00");
    expect(slot1600?.available).toBe(false);

    // Clean up
    await prisma.booking.deleteMany({ where: { id: { in: createdIds } } });
  });

  it("filters availability for a specific bayId", async () => {
    const branch = await prisma.branch.findUnique({
      where: { qrIdentifier: "clean-car-maadi" },
      include: { washBays: { where: { isActive: true }, orderBy: { bayNumber: "asc" } } },
    });
    const bay1 = branch!.washBays[0];
    const bay2 = branch!.washBays[1];

    const b1 = await prisma.booking.create({
      data: {
        bookingNumber: "CW-TEST-BAYID-1",
        branchId: branch!.id,
        assignedBayId: bay1.id,
        customerName: "User 1",
        customerPhone: "+201011112222",
        bookingDate: today,
        startTime: "17:00",
        endTime: "17:30",
        status: "CONFIRMED",
      },
    });

    // Bay 1 is booked at 17:00 -> should be unavailable
    const bay1Avail = await getBranchAvailability("clean-car-maadi", today, 8 * 60, undefined, bay1.id);
    const bay1Slot = bay1Avail.slots.find((s) => s.time === "17:00");
    expect(bay1Slot?.available).toBe(false);

    // Bay 2 is free at 17:00 -> should be available
    const bay2Avail = await getBranchAvailability("clean-car-maadi", today, 8 * 60, undefined, bay2.id);
    const bay2Slot = bay2Avail.slots.find((s) => s.time === "17:00");
    expect(bay2Slot?.available).toBe(true);

    // Clean up
    await prisma.booking.delete({ where: { id: b1.id } });
  });

  it("nearest available slot returns earliest future unbooked slot", async () => {
    // Simulated time: 10:15
    const availability = await getBranchAvailability("clean-car-maadi", today, 10 * 60 + 15);
    expect(availability.nearestAvailableSlot).not.toBeNull();
    // First future slot after 10:15 is 10:30
    expect(availability.nearestAvailableSlot?.time).toBe("10:30");
  });

  it("sanitizes customer slot response and does not expose bay details", async () => {
    const availability = await getBranchAvailability("clean-car-maadi", today, 8 * 60);
    for (const slot of availability.slots) {
      expect(slot).toHaveProperty("time");
      expect(slot).toHaveProperty("displayTime");
      expect(slot).toHaveProperty("available");
      expect(slot).not.toHaveProperty("bayId");
      expect(slot).not.toHaveProperty("assignedBay");
      expect(slot).not.toHaveProperty("bayNumber");
    }
  });
});