import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
