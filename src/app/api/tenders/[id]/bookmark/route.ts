import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isBookmarked } = body;

    if (typeof isBookmarked !== "boolean") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const updated = await prisma.tender.update({
      where: { id },
      data: { isBookmarked },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/tenders/[id]/bookmark] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
