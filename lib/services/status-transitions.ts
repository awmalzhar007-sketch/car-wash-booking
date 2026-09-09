import { BookingStatus } from "@/lib/types";

const ALLOWED_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING_VERIFICATION: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["WASHING", "CANCELLED", "NO_SHOW"],
  WASHING: ["COMPLETED", "CONFIRMED", "CANCELLED"],
  COMPLETED: ["CONFIRMED", "WASHING", "CANCELLED"], // Admin / Staff flexibility
  CANCELLED: ["CONFIRMED"],
  NO_SHOW: ["CONFIRMED"],
};

export function canTransitionStatus(
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
  isAdmin: boolean = false
): boolean {
  if (isAdmin) return true;
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
}

export function validateStatusTransition(
  currentStatus: BookingStatus,
  targetStatus: BookingStatus,
  isAdmin: boolean = false
): void {
  if (!canTransitionStatus(currentStatus, targetStatus, isAdmin)) {
    throw new Error(
      `INVALID_STATUS_TRANSITION: Cannot transition booking from ${currentStatus} to ${targetStatus}`
    );
  }
}