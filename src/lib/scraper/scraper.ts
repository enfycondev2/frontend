import axios from "axios";
import { DISTRICTS } from "./districts";
import { scraperLimit, randomDelay } from "./queue";
import { withRetry } from "./retry";
import { parseTenderPage } from "./parser";
import { ScrapeResult, TenderSchema } from "./types";
import { extractTenderDetailsFromPdf } from "./pdf-extractor";
import { prisma } from "../prisma";
import { scrapeStateTenders } from "./nicgep-scraper";

const DEFAULT_TIMEOUT = 30000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function scrapeDistrict(district: string): Promise<ScrapeResult> {
  let page = 0;
  const maxPages = 10;
  let hasMore = true;
  const allValidTenders: any[] = [];
  const seenTitles = new Set<string>();

  try {
    while (hasMore && page < maxPages) {
      const url = `https://${district}.odisha.gov.in/en/tender?page=${page}`;
      
      // 1. Fetch with retry and timeout
      const response = await withRetry(async () => {
        return await axios.get(url, {
          timeout: DEFAULT_TIMEOUT,
          headers: {
            "User-Agent": USER_AGENT,
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.5",
          }
        });
      }, 3, 1000);

      // 2. Parse HTML
      const html = response.data;
      const rawTenders = parseTenderPage(html, district, url);

      // If the page has no tender rows, we reached the end
      if (rawTenders.length === 0) {
        hasMore = false;
        break;
      }

      // Check for infinite pagination loops (when server ignores ?page)
      let duplicateCount = 0;
      for (const t of rawTenders) {
        if (seenTitles.has(t.title)) {
          duplicateCount++;
        }
        seenTitles.add(t.title);
      }

      if (duplicateCount === rawTenders.length && rawTenders.length > 0) {
        console.warn(`[Scraper Warning] District ${district} pagination loop detected at page ${page}. Breaking.`);
        hasMore = false;
        break;
      }

      // 3. Validation & Cleanup
      const validTenders = rawTenders.filter(tender => {
        const result = TenderSchema.safeParse(tender);
        if (!result.success) {
          console.warn(`[Validation Error] District: ${district}, Title: ${tender.title}`, result.error.issues);
          return false;
        }
        return true;
      });

      allValidTenders.push(...validTenders);
      page++;
      
      // Be polite to the server between pages
      if (hasMore && page < maxPages) {
        await randomDelay(1000, 2000);
      }
    }

    // 4. Database Insertion (Deduplication Layer)
    let newTendersCount = 0;
    for (const tender of allValidTenders) {
      try {
        const existing = await prisma.tender.findFirst({
          where: {
            district: tender.district,
            OR: [
              { tenderPdfUrl: tender.tenderPdfUrl !== null ? tender.tenderPdfUrl : undefined },
              { title: tender.title }
            ]
          }
        });

        if (!existing) {
          // Save to Database instantly without waiting for AI
          // The background queue will pick this up later
          await prisma.tender.create({
            data: {
              district: tender.district,
              title: tender.title,
              description: tender.description,
              startDate: tender.startDate,
              endDate: tender.endDate,
              noticePdfUrl: tender.noticePdfUrl,
              tenderPdfUrl: tender.tenderPdfUrl,
              sourceUrl: tender.sourceUrl,
              aiProcessed: false,
            }
          });
          newTendersCount++;
        }
      } catch (dbError) {
        console.error(`[DB Error] District: ${district}`, dbError);
      }
    }

    // 5. Create Scrape Log
    await prisma.scrapeLog.create({
      data: {
        district,
        status: "SUCCESS",
        tendersFound: allValidTenders.length,
      }
    });

    return {
      district,
      success: true,
      tenders: allValidTenders,
    };

  } catch (error) {
    console.error(`[Scraper Error] Failed to scrape ${district}:`, error);
    
    // Log failure to DB
    await prisma.scrapeLog.create({
      data: {
        district,
        status: "FAILED",
        tendersFound: 0,
        error: error instanceof Error ? error.message : "Unknown error",
      }
    });

    return {
      district,
      success: false,
      tenders: [],
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function runFullScrape() {
  const results: ScrapeResult[] = [];
  
  // Create tasks wrapped in p-limit for concurrency
  const tasks = DISTRICTS.map(district => {
    return scraperLimit(async () => {
      // Add random delay between requests as per anti-blocking requirements
      await randomDelay(1000, 3000);
      const result = await scrapeDistrict(district);
      results.push(result);
      return result;
    });
  });

  // Also add the state-level NICGEP scraper task
  const stateTask = scraperLimit(async () => {
    await randomDelay(1000, 3000);
    const result = await scrapeStateTenders();
    results.push(result);
    return result;
  });

  // Wait for all districts + state to complete
  await Promise.allSettled([...tasks, stateTask]);
  
  return {
    success: true,
    districtsProcessed: DISTRICTS.length + 1,
    results
  };
}
