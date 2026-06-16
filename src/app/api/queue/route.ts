import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { extractTenderDetailsFromPdf, extractTenderDetailsFromText } from '@/lib/scraper/pdf-extractor';
import { revalidateTag } from 'next/cache';

const prisma = new PrismaClient();

export async function POST() {
  try {
    // 1. Find up to 3 tenders that haven't been processed by AI yet
    const pendingTenders = await prisma.tender.findMany({
      where: {
        aiProcessed: false,
      },
      take: 10,
    });

    const pendingStateTenders = await prisma.stateTender.findMany({
      where: {
        aiProcessed: false,
      },
      take: 10,
    });

    const allPending = [...pendingTenders.map(t => ({...t, isState: false})), ...pendingStateTenders.map(t => ({...t, isState: true}))].slice(0, 10);

    if (allPending.length === 0) {
      return NextResponse.json({ success: true, processed: 0, message: "Queue is empty." });
    }

    let processedCount = 0;
    let errorCount = 0;

    for (const tender of allPending) {
      const delegate = tender.isState ? prisma.stateTender : prisma.tender;
      
      // Prioritize PDF over other formats for AI extraction
      let targetPdf = tender.tenderPdfUrl;
      if (targetPdf && !targetPdf.toLowerCase().split('?')[0].endsWith('.pdf') && tender.noticePdfUrl?.toLowerCase().split('?')[0].endsWith('.pdf')) {
        targetPdf = tender.noticePdfUrl;
      }
      if (!targetPdf) {
        targetPdf = tender.noticePdfUrl;
      }
      
      try {
        let details = null;
        if (targetPdf) {
          details = await extractTenderDetailsFromPdf(targetPdf);
        } else if (tender.title) {
          details = await extractTenderDetailsFromText(tender.title, tender.description || '');
        }
        
        if (details) {
          await (delegate as any).update({
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
          await (delegate as any).update({
            where: { id: tender.id },
            data: { aiProcessed: true, aiError: "No text or data could be extracted." }
          });
          errorCount++;
        }
        
        // Respect Gemini Free Tier limits by spacing out requests (15 RPM max)
        await new Promise(r => setTimeout(r, 3000));

      } catch (error: any) {
        // If we hit a hard error (like 503 Unavailable or 429 Too Many Requests), log the error but keep aiProcessed: false
        // so it stays in the queue for next time!
        const isRateLimit = error?.status === 503 || error?.status === 429;
        const errorMessage = isRateLimit ? `Gemini ${error.status} Error` : (error.message || "Unknown Error");
        
        await (delegate as any).update({
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
    const remainingCountDist = await prisma.tender.count({ where: { aiProcessed: false } });
    const remainingCountState = await prisma.stateTender.count({ where: { aiProcessed: false } });

    if (processedCount > 0 || errorCount > 0) {
      revalidateTag("tenders");
    }

    return NextResponse.json({ 
      success: true, 
      processed: processedCount, 
      errors: errorCount,
      remaining: remainingCountDist + remainingCountState
    });

  } catch (error: any) {
    console.error("[AI Queue] Fatal Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
