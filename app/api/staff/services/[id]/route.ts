import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth/session";

// Branch staff own PRICING and DURATION only. They cannot rename, describe,
// hide, reorder or delete a service — that is the Super Admin's job via
// /api/admin/services.
const updateServiceSchema = z
  .object({
    price: z.number().min(0, "Price cannot be negative").optional(),
    durationMinutes: z
      .number()
      .int("Duration must be a whole number of minutes")
      .min(5, "Duration must be at least 5 minutes")
      .max(180, "Duration cannot exceed 180 minutes")
      .optional(),
  })
  .refine((data) => data.price !== undefined || data.durationMinutes !== undefined, {
    message: "Provide a price and/or a duration to update",
  });

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await requireAuth(request.headers);
    const body = await request.json();
    const validated = updateServiceSchema.parse(body);

    const existing = await prisma.service.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    // Staff may only update their own branch's services. Admins are allowed
    // too, for support/troubleshooting purposes.
    if (session.role !== "ADMIN" && session.branchId !== existing.branchId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const service = await prisma.service.update({
      where: { id: params.id },
      data: {
        ...(validated.price !== undefined ? { price: validated.price } : {}),
        ...(validated.durationMinutes !== undefined
          ? { durationMinutes: validated.durationMinutes }
          : {}),
      },
    });

    return NextResponse.json({ success: true, service });
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
