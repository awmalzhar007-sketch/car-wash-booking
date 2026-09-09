import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

const createBranchSchema = z.object({
  brandId: z.string().min(1, "Brand is required"),
  name: z.string().min(2, "Branch name is required"),
  slug: z.string().min(2, "Slug is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  qrIdentifier: z.string().min(3, "QR identifier must be at least 3 characters"),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Format must be HH:mm"),
  avgDurationMinutes: z.number().int().min(5).default(30),
  numberOfBays: z.number().int().min(1).default(3),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers);

    const branches = await prisma.branch.findMany({
      include: {
        brand: true,
        washBays: { where: { isActive: true } },
        services: { orderBy: { sortOrder: "asc" } },
        users: {
          where: { role: "BRANCH_STAFF" },
          select: { id: true, name: true, email: true, role: true, createdAt: true },
        },
        _count: {
          select: { bookings: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ branches });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin(request.headers);
    const body = await request.json();
    const validated = createBranchSchema.parse(body);

    // Check QR identifier uniqueness
    const existingQr = await prisma.branch.findUnique({
      where: { qrIdentifier: validated.qrIdentifier },
    });
    if (existingQr) {
      return NextResponse.json(
        { error: "A branch with this QR identifier already exists" },
        { status: 400 }
      );
    }

    const branch = await prisma.$transaction(async (tx) => {
      const created = await tx.branch.create({
        data: {
          brandId: validated.brandId,
          name: validated.name,
          slug: validated.slug,
          address: validated.address,
          phone: validated.phone,
          qrIdentifier: validated.qrIdentifier,
          openTime: validated.openTime,
          closeTime: validated.closeTime,
          avgDurationMinutes: validated.avgDurationMinutes,
          isActive: true,
        },
      });

      // Create bays
      for (let i = 1; i <= validated.numberOfBays; i++) {
        await tx.washBay.create({
          data: {
            branchId: created.id,
            bayNumber: i,
            name: `Bay ${i}`,
            isActive: true,
          },
        });
      }

      return created;
    });

    return NextResponse.json({ success: true, branch });
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
