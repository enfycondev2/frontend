import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const setting = await prisma.systemSetting.findUnique({
      where: { key: "scrapeIntervalHours" }
    });
    
    // Default to 6 hours if not set
    const interval = setting ? parseInt(setting.value, 10) : 6;
    
    return NextResponse.json({ success: true, scrapeIntervalHours: interval });
  } catch (error) {
    console.error("[GET /api/settings] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (body.scrapeIntervalHours !== undefined) {
      const valueStr = body.scrapeIntervalHours.toString();
      await prisma.systemSetting.upsert({
        where: { key: "scrapeIntervalHours" },
        update: { value: valueStr },
        create: { key: "scrapeIntervalHours", value: valueStr }
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/settings] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to update settings" }, { status: 500 });
  }
}
