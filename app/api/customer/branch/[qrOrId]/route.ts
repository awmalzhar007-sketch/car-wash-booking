import { NextRequest, NextResponse } from "next/server";
import { getBranchAvailability } from "@/lib/services/availability";

export async function GET(
  request: NextRequest,
  { params }: { params: { qrOrId: string } }
) {
  try {
    const { qrOrId } = params;
    if (!qrOrId) {
      return NextResponse.json({ error: "Branch or QR identifier is required" }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const serviceIdsParam = searchParams.get("serviceIds");
    const bayId = searchParams.get("bayId") || undefined;
    const selectedServiceIds = serviceIdsParam
      ? serviceIdsParam.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined;

    const availability = await getBranchAvailability(
      qrOrId,
      undefined,
      undefined,
      selectedServiceIds,
      bayId
    );
    return NextResponse.json({ data: availability });
  } catch (error: any) {
    if (error.message === "BRANCH_NOT_FOUND") {
      return NextResponse.json(
        { error: "Branch not found or currently inactive. Please check the QR code." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: error.message || "Failed to load branch availability" },
      { status: 500 }
    );
  }
}