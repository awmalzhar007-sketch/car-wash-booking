import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";
import { parseTimeToMinutes } from "@/lib/utils";

const settingsSchema = z.object({
  branchId: z.string().optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
  avgDurationMinutes: z.number().int().min(5).max(180),
  numberOfBays: z.number().int().min(1).max(20),
});

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth(request.headers);
    const { searchParams } = new URL(request.url);
    const requestedBranchId = searchParams.get("branchId");

    let branchId = session.branchId;
    if (session.role === "ADMIN" && requestedBranchId) {
      branchId = requestedBranchId;
    }

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID required" }, { status: 400 });
    }

    if (session.role !== "ADMIN" && session.branchId !== branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        washBays: { where: { isActive: true }, orderBy: { bayNumber: "asc" } },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({
      branchId: branch.id,
      name: branch.name,
      openTime: branch.openTime,
      closeTime: branch.closeTime,
      avgDurationMinutes: branch.avgDurationMinutes,
      numberOfBays: branch.washBays.length,
    });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAuth(request.headers);
    const body = await request.json();
    const validated = settingsSchema.parse(body);

    let branchId = session.branchId;
    if (session.role === "ADMIN" && validated.branchId) {
      branchId = validated.branchId;
    }

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID required" }, { status: 400 });
    }

    if (session.role !== "ADMIN" && session.branchId !== branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Validate opening time is before closing time
    const openMin = parseTimeToMinutes(validated.openTime);
    const closeMin = parseTimeToMinutes(validated.closeTime);
    if (openMin >= closeMin) {
      return NextResponse.json(
        { error: "Opening time must be earlier than closing time" },
        { status: 400 }
      );
    }

    // Update branch config in transaction
    const updatedBranch = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.update({
        where: { id: branchId },
        data: {
          openTime: validated.openTime,
          closeTime: validated.closeTime,
          avgDurationMinutes: validated.avgDurationMinutes,
        },
        include: { washBays: true },
      });

      // Manage wash bays count
      const currentBays = branch.washBays;
      const targetCount = validated.numberOfBays;

      if (targetCount > currentBays.length) {
        // Add additional bays
        for (let i = currentBays.length + 1; i <= targetCount; i++) {
          await tx.washBay.create({
            data: {
              branchId: branch.id,
              bayNumber: i,
              name: `Bay ${i}`,
              isActive: true,
            },
          });
        }
      } else if (targetCount < currentBays.length) {
        // Mark surplus bays as inactive
        for (const bay of currentBays) {
          if (bay.bayNumber > targetCount) {
            await tx.washBay.update({
              where: { id: bay.id },
              data: { isActive: false },
            });
          } else {
            await tx.washBay.update({
              where: { id: bay.id },
              data: { isActive: true },
            });
          }
        }
      }

      return branch;
    });

    return NextResponse.json({
      success: true,
      message: "Branch settings updated successfully",
      branch: updatedBranch,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
