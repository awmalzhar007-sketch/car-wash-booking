import { describe, it, expect } from "vitest";
import {
  hashPassword,
  verifyPassword,
  createSessionToken,
  verifySessionToken,
  requireBranchAccess,
} from "@/lib/auth/session";
import {
  canTransitionStatus,
  validateStatusTransition,
} from "@/lib/services/status-transitions";

describe("Auth and Branch Isolation", () => {
  it("hashes and verifies passwords correctly", async () => {
    const raw = "secretpassword123";
    const hash = await hashPassword(raw);
    expect(await verifyPassword(raw, hash)).toBe(true);
    expect(await verifyPassword("wrongpassword", hash)).toBe(false);
  });

  it("creates and verifies JWT session tokens", async () => {
    const sessionPayload = {
      userId: "user_123",
      email: "staff@cleancar.com",
      name: "Staff Member",
      role: "BRANCH_STAFF" as const,
      branchId: "branch_maadi",
    };

    const token = await createSessionToken(sessionPayload);
    expect(token).toBeDefined();

    const verified = await verifySessionToken(token);
    expect(verified?.userId).toBe(sessionPayload.userId);
    expect(verified?.email).toBe(sessionPayload.email);
    expect(verified?.role).toBe(sessionPayload.role);
    expect(verified?.branchId).toBe(sessionPayload.branchId);
  });

  it("enforces branch isolation for branch staff", async () => {
    const staffToken = await createSessionToken({
      userId: "u1",
      email: "staff@cleancar.com",
      name: "Staff",
      role: "BRANCH_STAFF",
      branchId: "branch_maadi",
    });

    const staffHeaders = new Headers({
      authorization: `Bearer ${staffToken}`,
    });

    // Access to assigned branch should succeed
    const allowed = await requireBranchAccess("branch_maadi", staffHeaders);
    expect(allowed.branchId).toBe("branch_maadi");

    // Access to another branch must be rejected
    await expect(
      requireBranchAccess("branch_nasr_city", staffHeaders)
    ).rejects.toThrow("FORBIDDEN_BRANCH_ISOLATION");
  });

  it("allows admin access to any branch", async () => {
    const adminToken = await createSessionToken({
      userId: "u_admin",
      email: "admin@cleancar.com",
      name: "Admin",
      role: "ADMIN",
      branchId: null,
    });

    const adminHeaders = new Headers({
      authorization: `Bearer ${adminToken}`,
    });

    const access1 = await requireBranchAccess("branch_maadi", adminHeaders);
    const access2 = await requireBranchAccess("branch_nasr_city", adminHeaders);
    expect(access1.role).toBe("ADMIN");
    expect(access2.role).toBe("ADMIN");
  });
});

describe("Status State Machine Transitions", () => {
  it("allows valid transitions", () => {
    expect(canTransitionStatus("PENDING_VERIFICATION", "CONFIRMED")).toBe(true);
    expect(canTransitionStatus("CONFIRMED", "WASHING")).toBe(true);
    expect(canTransitionStatus("WASHING", "CONFIRMED")).toBe(true); // Undo wash back to confirmed
    expect(canTransitionStatus("WASHING", "COMPLETED")).toBe(true);
    expect(canTransitionStatus("CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionStatus("CONFIRMED", "NO_SHOW")).toBe(true);
  });

  it("allows admin overrides for any status transition", () => {
    expect(canTransitionStatus("COMPLETED", "CONFIRMED", true)).toBe(true);
    expect(canTransitionStatus("CANCELLED", "CONFIRMED", true)).toBe(true);
    expect(canTransitionStatus("NO_SHOW", "CONFIRMED", true)).toBe(true);
    expect(canTransitionStatus("COMPLETED", "CANCELLED", true)).toBe(true);
  });

  it("blocks invalid transitions for non-admin", () => {
    expect(canTransitionStatus("PENDING_VERIFICATION", "COMPLETED")).toBe(false);
    expect(canTransitionStatus("PENDING_VERIFICATION", "WASHING")).toBe(false);

    expect(() => validateStatusTransition("PENDING_VERIFICATION", "COMPLETED")).toThrow(
      "INVALID_STATUS_TRANSITION"
    );
  });
});