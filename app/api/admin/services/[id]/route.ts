import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";
import { autoTranslateService } from "@/lib/i18n/translator";

// Super Admin manages the service TYPE (name/description/visibility/order)
// only. Price is intentionally excluded here — that is owned by branch staff
// via PUT /api/staff/services/[id].
const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request.headers);
    const body = await request.json();
    const validated = updateServiceSchema.parse(body);

    const existing = await prisma.service.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    let finalName = existing.name;
    let finalDesc = existing.description;

    if (validated.name !== undefined || validated.description !== undefined) {
      const nameToTranslate = validated.name !== undefined ? validated.name : existing.name;
      const descToTranslate = validated.description !== undefined ? validated.description : existing.description;
      const translated = autoTranslateService(nameToTranslate, descToTranslate);
      finalName = translated.combinedName;
      finalDesc = translated.combinedDesc || null;
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        name: finalName,
        description: finalDesc,
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await requireAdmin(request.headers);

    const existing = await prisma.service.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    await prisma.service.delete({ where: { id: params.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
