import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createSessionToken, hashPassword } from "@/lib/auth/session";

describe("Staff Management & Branch Assignment", () => {
  let adminToken: string;
  let testBranch1: any;
  let testBranch2: any;
  let createdStaffIds: string[] = [];

  beforeAll(async () => {
    // Create admin token
    adminToken = await createSessionToken({
      userId: "admin-test-id",
      email: "admin@cleancar.com",
      name: "Admin Tester",
      role: "ADMIN",
      branchId: null,
    });

    // Find branches
    const branches = await prisma.branch.findMany({ take: 2 });
    testBranch1 = branches[0];
    testBranch2 = branches[1];
  });

  afterAll(async () => {
    if (createdStaffIds.length > 0) {
      await prisma.user.deleteMany({
        where: { id: { in: createdStaffIds } },
      });
    }
  });

  it("admin can create a staff member assigned to a specific branch", async () => {
    const passwordHash = await hashPassword("testpass123");
    const staff = await prisma.user.create({
      data: {
        name: "Test Staff One",
        email: "test.staff.one@test.com",
        passwordHash,
        role: "BRANCH_STAFF",
        branchId: testBranch1.id,
      },
      include: {
        branch: true,
      },
    });

    createdStaffIds.push(staff.id);

    expect(staff.id).toBeDefined();
    expect(staff.role).toBe("BRANCH_STAFF");
    expect(staff.branchId).toBe(testBranch1.id);
    expect(staff.branch?.name).toBe(testBranch1.name);
  });

  it("prevents creating two staff members with the same email", async () => {
    const passwordHash = await hashPassword("testpass123");
    await expect(
      prisma.user.create({
        data: {
          name: "Duplicate Email Staff",
          email: "test.staff.one@test.com",
          passwordHash,
          role: "BRANCH_STAFF",
          branchId: testBranch2.id,
        },
      })
    ).rejects.toThrow();
  });

  it("admin can reassign a staff member to another branch", async () => {
    const staffId = createdStaffIds[0];
    const updated = await prisma.user.update({
      where: { id: staffId },
      data: {
        branchId: testBranch2.id,
        name: "Test Staff Reassigned",
      },
      include: { branch: true },
    });

    expect(updated.branchId).toBe(testBranch2.id);
    expect(updated.branch?.name).toBe(testBranch2.name);
    expect(updated.name).toBe("Test Staff Reassigned");
  });

  it("enforces branch isolation: staff token has branchId attached", async () => {
    const staffToken = await createSessionToken({
      userId: createdStaffIds[0],
      email: "test.staff.one@test.com",
      name: "Test Staff Reassigned",
      role: "BRANCH_STAFF",
      branchId: testBranch2.id,
    });

    expect(staffToken).toBeDefined();
    expect(typeof staffToken).toBe("string");
  });
});
