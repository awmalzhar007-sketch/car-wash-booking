import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { identifier: string } }
) {
  try {
    const { identifier } = params;

    const branch = await prisma.branch.findUnique({
      where: { qrIdentifier: identifier },
      include: { brand: true },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    const host = request.headers.get("host") || "localhost:3000";
    const protocol = host.includes("localhost") ? "http" : "https";
    const bookingUrl = `${protocol}://${host}/book/${branch.qrIdentifier}`;

    // Generate high resolution QR Data URL
    const qrDataUrl = await QRCode.toDataURL(bookingUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: "#1e3a8a",
        light: "#ffffff",
      },
    });

    return NextResponse.json({
      branchId: branch.id,
      brandName: branch.brand.name,
      branchName: branch.name,
      qrIdentifier: branch.qrIdentifier,
      isActive: branch.isActive,
      bookingUrl,
      qrDataUrl,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
