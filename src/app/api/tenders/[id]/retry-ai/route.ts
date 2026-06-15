import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { revalidateTag } from "next/cache";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const isState = searchParams.get('state') === 'true';

    if (isState) {
      await prisma.stateTender.update({
        where: { id },
        data: { aiProcessed: false, aiError: null },
      });
    } else {
      await prisma.tender.update({
        where: { id },
        data: { aiProcessed: false, aiError: null },
      });
    }

    // Flush cache so UI gets fresh data
    revalidateTag("tenders");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[PATCH /api/tenders/[id]/retry-ai] Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
