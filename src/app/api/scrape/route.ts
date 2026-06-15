import { NextResponse, NextRequest } from "next/server";
import { runFullScrape, scrapeDistrict } from "@/lib/scraper/scraper";
import { DISTRICTS } from "@/lib/scraper/districts";

export async function POST(req: NextRequest) {
  try {
    // Basic authentication: requires either a frontend 'auth' cookie or a valid CRON_SECRET header
    const authCookie = req.cookies.get("auth");
    const authHeader = req.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    const isFrontendUser = !!authCookie?.value;
    const isCronJob = cronSecret && authHeader === `Bearer ${cronSecret}`;

    if (!isFrontendUser && !isCronJob) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    let targetDistrict: string | null = null;
    
    // Parse optional JSON body for a specific district
    try {
      const body = await req.json();
      if (body && body.district) {
        if (!DISTRICTS.includes(body.district.toLowerCase())) {
          return NextResponse.json({ success: false, error: `Invalid district name. Allowed values: ${DISTRICTS.join(', ')}` }, { status: 400 });
        }
        targetDistrict = body.district.toLowerCase();
      }
    } catch (e) {
      // Ignored: No JSON body provided, default to full scrape
    }

    if (targetDistrict) {
      const result = await scrapeDistrict(targetDistrict);
      const newTenders = result.tenders?.length || 0;
      
      return NextResponse.json({
        success: result.success,
        districtsProcessed: 1,
        newTenders: newTenders,
        details: [result]
      });
    } else {
      const result = await runFullScrape();
      const newTenders = result.results.reduce((acc, curr) => acc + (curr.tenders?.length || 0), 0);

      return NextResponse.json({
        success: true,
        districtsProcessed: result.districtsProcessed,
        newTenders: newTenders,
        details: result.results
      });
    }

  } catch (error) {
    console.error("[POST /api/scrape] Error:", error);
    return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
  }
}
