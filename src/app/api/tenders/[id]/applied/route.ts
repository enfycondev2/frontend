import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { isApplied } = body;

    if (typeof isApplied !== "boolean") {
      return NextResponse.json({ error: "Invalid data" }, { status: 400 });
    }

    const updated = await prisma.tender.update({
      where: { id },
      data: { isApplied },
    });

    revalidateTag("tenders", "default");

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/tenders/[id]/applied] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
