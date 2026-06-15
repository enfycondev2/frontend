import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DISTRICTS } from "@/lib/scraper/districts";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const setting = await prisma.systemSetting.findUnique({
      where: { key: "scrapeIntervalHours" }
    });
    
    const intervalHours = setting ? parseInt(setting.value, 10) : 6;
    
    if (intervalHours === 0) {
      return NextResponse.json({ success: true, shouldRun: false, reason: "Interval is set to 0 (Disabled)" });
    }

    const lastLog = await prisma.scrapeLog.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    if (lastLog) {
      const hoursSinceLast = (Date.now() - lastLog.createdAt.getTime()) / (1000 * 60 * 60);
      if (hoursSinceLast < intervalHours) {
        return NextResponse.json({ 
          success: true, 
          shouldRun: false, 
          reason: `Only ${hoursSinceLast.toFixed(1)} hours passed. Needs ${intervalHours} hours.` 
        });
      }
    }

    return NextResponse.json({ 
      success: true, 
      shouldRun: true, 
      districts: DISTRICTS 
    });

  } catch (error) {
    console.error("[GET /api/cron/status] Error:", error);
    return NextResponse.json({ success: false, error: "Failed to check cron status" }, { status: 500 });
  }
}
