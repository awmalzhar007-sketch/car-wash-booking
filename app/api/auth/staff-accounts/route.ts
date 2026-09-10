import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request.headers);

    const brands = await prisma.brand.findMany({
      where: { isActive: true },
      include: {
        branches: {
          where: { isActive: true },
          include: {
            users: {
              where: { role: "BRANCH_STAFF" },
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
          orderBy: { name: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ brands });
  } catch (error: any) {
    if (error.message === "UNAUTHORIZED" || error.message?.includes("FORBIDDEN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

