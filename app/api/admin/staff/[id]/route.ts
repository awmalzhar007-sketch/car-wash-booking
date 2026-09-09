import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, hashPassword } from "@/lib/auth/session";

const updateStaffSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  branchId: z.string().min(1, "Branch is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal("")),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request.headers);
    const body = await request.json();
    const validated = updateStaffSchema.parse(body);

    const staffId = params.id;

    // Verify staff member exists
    const existing = await prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!existing || existing.role !== "BRANCH_STAFF") {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    // If email is changed, check uniqueness
    if (validated.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailTaken = await prisma.user.findUnique({
        where: { email: validated.email.toLowerCase() },
      });
      if (emailTaken) {
        return NextResponse.json(
          { error: "A user with this email already exists" },
          { status: 400 }
        );
      }
    }

    // Verify branch exists
    const branch = await prisma.branch.findUnique({
      where: { id: validated.branchId },
    });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const updateData: any = {
      name: validated.name,
      email: validated.email.toLowerCase(),
      branchId: validated.branchId,
    };

    if (validated.password && validated.password.trim().length >= 6) {
      updateData.passwordHash = await hashPassword(validated.password.trim());
    }

    const updatedStaff = await prisma.user.update({
      where: { id: staffId },
      data: updateData,
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

    return NextResponse.json({ success: true, staff: updatedStaff });
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request.headers);
    const staffId = params.id;

    const existing = await prisma.user.findUnique({
      where: { id: staffId },
    });

    if (!existing || existing.role !== "BRANCH_STAFF") {
      return NextResponse.json({ error: "Staff member not found" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: staffId },
    });

    return NextResponse.json({ success: true, message: "Staff member deleted successfully" });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
