import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

const createBrandSchema = z.object({
  name: z.string().min(2, "Brand name is required"),
  slug: z.string().min(2, "Slug is required"),
  isActive: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers);

    const brands = await prisma.brand.findMany({
      include: {
        _count: {
          select: { branches: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ brands });
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
    const validated = createBrandSchema.parse(body);

    const brand = await prisma.brand.create({
      data: validated,
    });

    return NextResponse.json({ success: true, brand });
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
