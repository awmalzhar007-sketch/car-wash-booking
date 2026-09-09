import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

const updateBranchSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  openTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  avgDurationMinutes: z.number().int().min(5).optional(),
  isActive: z.boolean().optional(),
  numberOfBays: z.number().int().min(1).max(20).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request.headers);

    const branch = await prisma.branch.findUnique({
      where: { id: params.id },
      include: {
        brand: true,
        washBays: { orderBy: { bayNumber: "asc" } },
        _count: { select: { bookings: true } },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    return NextResponse.json({ branch });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request.headers);
    const body = await request.json();
    const validated = updateBranchSchema.parse(body);

    const updated = await prisma.$transaction(async (tx) => {
      const branch = await tx.branch.update({
        where: { id: params.id },
        data: {
          ...(validated.name ? { name: validated.name } : {}),
          ...(validated.address !== undefined ? { address: validated.address } : {}),
          ...(validated.phone !== undefined ? { phone: validated.phone } : {}),
          ...(validated.openTime ? { openTime: validated.openTime } : {}),
          ...(validated.closeTime ? { closeTime: validated.closeTime } : {}),
          ...(validated.avgDurationMinutes ? { avgDurationMinutes: validated.avgDurationMinutes } : {}),
          ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
        },
        include: { washBays: true },
      });

      if (validated.numberOfBays !== undefined) {
        const currentBays = branch.washBays;
        const target = validated.numberOfBays;
        if (target > currentBays.length) {
          for (let i = currentBays.length + 1; i <= target; i++) {
            await tx.washBay.create({
              data: {
                branchId: branch.id,
                bayNumber: i,
                name: `Bay ${i}`,
                isActive: true,
              },
            });
          }
        } else if (target < currentBays.length) {
          for (const b of currentBays) {
            await tx.washBay.update({
              where: { id: b.id },
              data: { isActive: b.bayNumber <= target },
            });
          }
        }
      }

      return branch;
    });

    return NextResponse.json({ success: true, branch: updated });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
    }
    if (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
