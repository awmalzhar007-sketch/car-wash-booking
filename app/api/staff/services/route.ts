import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";

// Branch staff can see the service TYPES that the Super Admin created for
// their branch, and the price currently set for each. Staff use
// PUT /api/staff/services/[id] to update the price only.
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

    const services = await prisma.service.findMany({
      where: { branchId },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });

    return NextResponse.json({ services });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth(request.headers);
    const body = await request.json();

    let branchId = session.branchId;
    if (session.role === "ADMIN" && body.branchId) {
      branchId = body.branchId;
    }

    if (!branchId) {
      return NextResponse.json({ error: "Branch ID required" }, { status: 400 });
    }

    const { name, description, price, durationMinutes } = body;
    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json(
        { error: "Service name must be at least 2 characters" },
        { status: 400 }
      );
    }

    const branch = await prisma.branch.findUnique({ where: { id: branchId } });
    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const { autoTranslateService } = await import("@/lib/i18n/translator");
    const translated = autoTranslateService(name, description);

    const maxSort = await prisma.service.aggregate({
      where: { branchId },
      _max: { sortOrder: true },
    });

    const numPrice = Number(price);
    const numDuration = Number(durationMinutes);

    const service = await prisma.service.create({
      data: {
        branchId,
        name: translated.combinedName,
        description: translated.combinedDesc || null,
        price: !isNaN(numPrice) && numPrice >= 0 ? numPrice : 0,
        durationMinutes:
          !isNaN(numDuration) && numDuration >= 5
            ? numDuration
            : (branch.avgDurationMinutes || 30),
        sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, service });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
