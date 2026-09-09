export type UserRole = "ADMIN" | "BRANCH_STAFF";

export type BookingStatus =
  | "PENDING_VERIFICATION"
  | "CONFIRMED"
  | "WASHING"
  | "COMPLETED"
  | "CANCELLED"
  | "NO_SHOW";

export interface TimeSlot {
  time: string; // "HH:mm"
  displayTime: string; // "5:30 PM"
  available: boolean;
  isPassed?: boolean;
  isFull?: boolean;
  status?: "AVAILABLE" | "PASSED" | "BOOKED";
}

export interface ServiceItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  durationMinutes: number;
}

export interface CustomerBookingSummary {
  id: string;
  bookingNumber: string;
  brandName: string;
  branchName: string;
  bookingDate: string;
  displayDate: string;
  startTime: string;
  endTime: string;
  displayTime: string;
  estimatedDuration: number;
  status: BookingStatus;
  customerName: string;
  customerPhone: string;
  services: ServiceItem[];
  totalPrice: number;
}

export interface StaffBookingDetail {
  id: string;
  bookingNumber: string;
  customerName: string;
  customerPhone: string;
  bookingDate: string;
  startTime: string;
  endTime: string;
  displayTime: string;
  estimatedDuration: number;
  status: BookingStatus;
  assignedBayId: string;
  assignedBayName: string;
  bayNumber: number;
  createdAt: string;
  services: ServiceItem[];
  totalPrice: number;
}

export interface BranchSchedule {
  branchId: string;
  branchName: string;
  date: string;
  bays: {
    id: string;
    bayNumber: number;
    name: string;
  }[];
  timeSlots: {
    time: string;
    displayTime: string;
    slots: {
      bayId: string;
      bayNumber: number;
      booking?: StaffBookingDetail;
    }[];
  }[];
}

export interface AuthSession {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
  branchId?: string | null;
}