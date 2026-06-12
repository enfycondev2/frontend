import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { extractTenderDetailsFromPdf } from '@/lib/scraper/pdf-extractor';

const prisma = new PrismaClient();

export async function POST() {
  try {
    // 1. Find up to 3 tenders that haven't been processed by AI yet
    const pendingTenders = await prisma.tender.findMany({
      where: {
        aiProcessed: false,
        OR: [
          { noticePdfUrl: { not: null } },
          { tenderPdfUrl: { not: null } }
        ]
      },
      take: 3,
    });

    if (pendingTenders.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "Queue is empty." });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const tender of pendingTenders) {
      const targetPdf = tender.tenderPdfUrl || tender.noticePdfUrl;
      
      try {
        const details = await extractTenderDetailsFromPdf(targetPdf!);
        
        if (details) {
          await prisma.tender.update({
            where: { id: tender.id },
            data: {
              tenderValue: details.tenderValue,
              emd: details.emd,
              applicationCost: details.applicationCost,
              aiSummary: details.aiSummary,
              tags: details.tags,
              aiProcessed: true,
              aiError: null
            }
          });
          processedCount++;
        } else {
          // If details came back null but didn't throw an error, mark as processed so we don't get stuck in a loop
          await prisma.tender.update({
            where: { id: tender.id },
            data: { aiProcessed: true, aiError: "No text or data could be extracted." }
          });
          errorCount++;
        }

      } catch (error: any) {
        // If we hit a hard error (like 503 Unavailable or 429 Too Many Requests), log the error but keep aiProcessed: false
        // so it stays in the queue for next time!
        const isRateLimit = error?.status === 503 || error?.status === 429;
        const errorMessage = isRateLimit ? `Gemini ${error.status} Error` : (error.message || "Unknown Error");
        
        await prisma.tender.update({
          where: { id: tender.id },
          data: { aiError: errorMessage }
        });
        errorCount++;
        
        // If it's a rate limit or unavailable, abort the rest of the queue immediately so we don't spam the API
        if (isRateLimit) {
          console.warn(`[AI Queue] Halting queue processing due to Gemini ${error.status} Rate Limit.`);
          break;
        }
      }
    }

    // Get the remaining queue count to send back to the frontend
    const remainingCount = await prisma.tender.count({
      where: { aiProcessed: false }
    });

    return NextResponse.json({ 
      success: true, 
      processed: processedCount, 
      errors: errorCount,
      remaining: remainingCount
    });

  } catch (error: any) {
    console.error("[AI Queue] Fatal Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
