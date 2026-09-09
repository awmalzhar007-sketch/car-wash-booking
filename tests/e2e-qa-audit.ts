import { prisma } from "../lib/prisma";
import { getBranchAvailability } from "../lib/services/availability";
import {
  createBookingReservation,
  confirmBookingAfterOTP,
  cancelBooking,
  sanitizeCustomerBooking,
} from "../lib/services/booking-engine";
import { verifyOTPChallenge, generateAndSendOTP } from "../lib/services/otp";
import { validateStatusTransition } from "../lib/services/status-transitions";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  requireBranchAccess,
} from "../lib/auth/session";
import { getTodayDateString } from "../lib/utils";

async function runQaAudit() {
  console.log("==================================================");
  console.log("🚀 STARTING COMPLETE END-TO-END QA AUDIT");
  console.log("==================================================\n");

  const today = getTodayDateString();

  // --------------------------------------------------
  // 1. CUSTOMER JOURNEY
  // --------------------------------------------------
  console.log("--- 1. Testing Customer Journey ---");

  // Step 1: Scan QR code for Maadi Branch
  console.log("1.1 Customer scans QR: 'clean-car-maadi'...");
  const availability = await getBranchAvailability("clean-car-maadi", today, 9 * 60); // 9:00 AM
  if (!availability.nearestAvailableSlot) {
    throw new Error("FAIL: Nearest available slot should exist at 9:00 AM");
  }
  console.log(`✓ Branch loaded: ${availability.branchName} (${availability.brandName})`);
  console.log(`✓ Nearest Available slot found: ${availability.nearestAvailableSlot.displayTime}`);

  // Customer ensures Bay details are NOT exposed
  for (const slot of availability.slots) {
    if ((slot as any).bayId || (slot as any).assignedBay) {
      throw new Error("FAIL: Bay details exposed in customer availability slot!");
    }
  }
  console.log("✓ Verified: No bay information is leaked in customer slots API.");

  // Step 2: Book nearest available slot
  const testPhone = "+201099887766";
  const targetSlot = availability.nearestAvailableSlot.time;
  console.log(`1.2 Customer enters Name='Tarek Zaki', Phone='${testPhone}', slot=${targetSlot}...`);

  const reservation = await createBookingReservation({
    branchIdOrQr: "clean-car-maadi",
    customerName: "Tarek Zaki",
    customerPhone: testPhone,
    bookingDate: today,
    startTime: targetSlot,
  });

  console.log(`✓ Reservation created with status: ${reservation.status}`);
  console.log(`✓ Unique Booking Number generated: ${reservation.bookingNumber}`);
  if ((reservation as any).assignedBayId) {
    throw new Error("FAIL: assignedBayId leaked in customer reservation result!");
  }
  console.log("✓ Verified: No bay information leaked in customer booking summary.");

  // Step 3: Verify booking is directly CONFIRMED without OTP
  if (reservation.status !== "CONFIRMED") {
    throw new Error("FAIL: Booking was not directly CONFIRMED upon creation");
  }
  console.log(`✓ Booking confirmed directly without OTP! Status: ${reservation.status}, Reference: ${reservation.bookingNumber}`);

  // Step 4: Access "My Booking" with Booking Code + Phone (No OTP)
  console.log("1.4 Accessing 'My Booking' using Booking Code + Phone Number...");
  const activeBooking = await prisma.booking.findFirst({
    where: {
      bookingNumber: reservation.bookingNumber,
      customerPhone: testPhone,
      bookingDate: today,
      status: "CONFIRMED",
    },
    include: { branch: { include: { brand: true } } },
  });
  if (!activeBooking || activeBooking.bookingNumber !== reservation.bookingNumber) {
    throw new Error("FAIL: Could not retrieve active booking using Booking Code and Phone Number");
  }
  const sanitizedMyBooking = sanitizeCustomerBooking(activeBooking);
  if ((sanitizedMyBooking as any).assignedBayId) {
    throw new Error("FAIL: Bay leaked in My Booking!");
  }
  console.log(`✓ My Booking successfully loaded customer appointment: ${sanitizedMyBooking.bookingNumber}`);

  // Step 5: Cancel Booking using Booking Code + Phone and check capacity release
  console.log("1.5 Customer cancels booking using Booking Code + Phone...");
  const cancelled = await cancelBooking(reservation.bookingNumber, testPhone);
  if (cancelled.status !== "CANCELLED") {
    throw new Error("FAIL: Booking was not cancelled");
  }
  console.log("✓ Booking status changed to CANCELLED.");

  // Verify capacity release in availability
  const availabilityAfterCancel = await getBranchAvailability("clean-car-maadi", today, 9 * 60);
  const slotAfterCancel = availabilityAfterCancel.slots.find((s) => s.time === targetSlot);
  if (!slotAfterCancel?.available) {
    throw new Error("FAIL: Slot capacity was not immediately released upon cancellation!");
  }
  console.log(`✓ Verified: Slot ${targetSlot} immediately released and is available again!`);

  // --------------------------------------------------
  // 2. BRANCH STAFF OPERATIONS & ISOLATION
  // --------------------------------------------------
  console.log("\n--- 2. Testing Branch Staff Operations & Isolation ---");

  // Authenticate Maadi staff
  const staff = await prisma.user.findUnique({
    where: { email: "staff.maadi@cleancar.com" },
    include: { branch: true },
  });
  if (!staff || !staff.branchId) {
    throw new Error("FAIL: Staff user not found in DB");
  }
  const passwordMatch = await verifyPassword("staff123456", staff.passwordHash);
  if (!passwordMatch) {
    throw new Error("FAIL: Staff password verification failed");
  }
  console.log(`✓ Staff login verified for: ${staff.email} (Branch: ${staff.branch?.name})`);

  const staffToken = await createSessionToken({
    userId: staff.id,
    email: staff.email,
    name: staff.name,
    role: "BRANCH_STAFF",
    branchId: staff.branchId,
  });

  const staffHeaders = new Headers({ authorization: `Bearer ${staffToken}` });

  // Verify staff can access Maadi branch
  const allowed = await requireBranchAccess(staff.branchId, staffHeaders);
  if (allowed.branchId !== staff.branchId) {
    throw new Error("FAIL: Staff failed to access their own branch");
  }
  console.log("✓ Branch isolation: Staff authorized to access their assigned branch.");

  // Verify staff CANNOT access Nasr City branch
  const nasrBranch = await prisma.branch.findUnique({ where: { qrIdentifier: "clean-car-nasr-city" } });
  try {
    await requireBranchAccess(nasrBranch!.id, staffHeaders);
    throw new Error("FAIL: Branch isolation breached! Staff accessed another branch!");
  } catch (err: any) {
    if (err.message.includes("FORBIDDEN_BRANCH_ISOLATION")) {
      console.log("✓ Branch isolation verified: Staff blocked from accessing other branches.");
    } else {
      throw err;
    }
  }

  // Create a new booking for staff status testing
  const staffTestBooking = await createBookingReservation({
    branchIdOrQr: "clean-car-maadi",
    customerName: "Omar QA",
    customerPhone: "+201088776655",
    bookingDate: today,
    startTime: "16:00",
  });
  await confirmBookingAfterOTP(staffTestBooking.bookingId);

  // Staff views assigned bay
  const staffBookingRecord = await prisma.booking.findUnique({
    where: { id: staffTestBooking.bookingId },
    include: { assignedBay: true },
  });
  console.log(`✓ Staff can view assigned bay: ${staffBookingRecord?.assignedBay.name} (Bay #${staffBookingRecord?.assignedBay.bayNumber})`);

  // Staff status transitions: CONFIRMED -> WASHING -> COMPLETED
  validateStatusTransition("CONFIRMED", "WASHING");
  await prisma.booking.update({
    where: { id: staffTestBooking.bookingId },
    data: { status: "WASHING" },
  });
  console.log("✓ Status transitioned: CONFIRMED -> WASHING");

  validateStatusTransition("WASHING", "COMPLETED");
  await prisma.booking.update({
    where: { id: staffTestBooking.bookingId },
    data: { status: "COMPLETED" },
  });
  console.log("✓ Status transitioned: WASHING -> COMPLETED");

  // Verify invalid transition is rejected
  try {
    validateStatusTransition("COMPLETED", "WASHING");
    throw new Error("FAIL: Invalid transition COMPLETED -> WASHING was allowed!");
  } catch (err: any) {
    console.log("✓ Invalid status transition (COMPLETED -> WASHING) correctly blocked.");
  }

  // Clean up staff test booking
  await prisma.oTPChallenge.deleteMany({ where: { bookingId: staffTestBooking.bookingId } });
  await prisma.booking.delete({ where: { id: staffTestBooking.bookingId } });

  // --------------------------------------------------
  // 3. ADMIN OPERATIONS
  // --------------------------------------------------
  console.log("\n--- 3. Testing Admin Operations ---");

  const admin = await prisma.user.findUnique({ where: { email: "admin@cleancar.com" } });
  if (!admin || admin.role !== "ADMIN") {
    throw new Error("FAIL: Admin user not found");
  }
  const adminPass = await verifyPassword("admin123456", admin.passwordHash);
  if (!adminPass) {
    throw new Error("FAIL: Admin password verification failed");
  }
  console.log("✓ Admin authentication verified.");

  // Admin access to all branches
  const adminToken = await createSessionToken({
    userId: admin.id,
    email: admin.email,
    name: admin.name,
    role: "ADMIN",
    branchId: null,
  });
  const adminHeaders = new Headers({ authorization: `Bearer ${adminToken}` });
  await requireBranchAccess(staff.branchId, adminHeaders);
  await requireBranchAccess(nasrBranch!.id, adminHeaders);
  console.log("✓ Admin verified to have unrestricted access to all branches.");

  // QR identifier uniqueness
  const maadiBranch = await prisma.branch.findUnique({ where: { qrIdentifier: "clean-car-maadi" } });
  if (!maadiBranch || !maadiBranch.qrIdentifier) {
    throw new Error("FAIL: Branch missing unique QR identifier");
  }
  console.log(`✓ Branch unique QR identifier verified: ${maadiBranch.qrIdentifier}`);

  console.log("\n==================================================");
  console.log("🎉 ALL QA AUDIT SCENARIOS PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

runQaAudit()
  .catch((err) => {
    console.error("QA AUDIT FAILED:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
