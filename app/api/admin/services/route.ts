import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { autoTranslateService } from "@/lib/i18n/translator";

// Super Admin defines the SERVICE TYPE only (name/description). Pricing and
// duration are intentionally NOT accepted here — branch staff set and own
// both via the /api/staff/services endpoints.
const createServiceSchema = z.object({
  branchId: z.string().min(1, "Branch is required"),
  name: z.string().min(2, "Service name must be at least 2 characters"),
  description: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers);

    const { searchParams } = new URL(request.url);
    const branchId = searchParams.get("branchId");

    const services = await prisma.service.findMany({
      where: branchId ? { branchId } : undefined,
      orderBy: [{ branchId: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ services });
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
    const validated = createServiceSchema.parse(body);

    const branch = await prisma.branch.findUnique({ where: { id: validated.branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const maxSort = await prisma.service.aggregate({
      where: { branchId: validated.branchId },
      _max: { sortOrder: true },
    });

    const translated = autoTranslateService(validated.name, validated.description);

    const service = await prisma.service.create({
      data: {
        branchId: validated.branchId,
        name: translated.combinedName,
        description: translated.combinedDesc || null,
        // New service types start at price 0 and inherit the branch's
        // average duration — branch staff set the real price/duration for
        // their branch before the service goes live.
        price: 0,
        durationMinutes: branch.avgDurationMinutes,
        sortOrder: validated.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, service });
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
