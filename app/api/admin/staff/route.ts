import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth/session";

const createStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  branchId: z.string().min(1, "Branch is required"),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers);

    const staffMembers = await prisma.user.findMany({
      where: { role: "BRANCH_STAFF" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            slug: true,
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ staffMembers });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request.headers);
    const body = await request.json();
    const validated = createStaffSchema.parse(body);

    // Check if email already exists
    const existing = await prisma.user.findUnique({
      where: { email: validated.email.toLowerCase() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "A user with this email already exists" },
        { status: 400 }
      );
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: validated.branchId },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const passwordHash = await hashPassword(validated.password);

    const newStaff = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email.toLowerCase(),
        passwordHash,
        role: "BRANCH_STAFF",
        branchId: validated.branchId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        branchId: true,
        createdAt: true,
        branch: {
          select: {
            id: true,
            name: true,
            brand: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ success: true, staff: newStaff });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === "UNAUTHORIZED" || error.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
