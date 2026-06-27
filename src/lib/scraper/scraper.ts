import axios from "axios";
import { DISTRICTS } from "./districts";
import { scraperLimit, randomDelay } from "./queue";
import { withRetry, isTimeoutError } from "./retry";
import { parseTenderPage } from "./parser";
import { ScrapeResult, TenderSchema } from "./types";
import { extractTenderDetailsFromPdf } from "./pdf-extractor";
import { prisma } from "../prisma";
import { scrapeStateTenders } from "./nicgep-scraper";

const DEFAULT_TIMEOUT = 30000;
const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

export async function scrapeDistrict(district: string, source: string = "AUTO"): Promise<ScrapeResult> {
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
        source,
      }
    });

    return {
      district,
      success: true,
      tenders: allValidTenders,
      newTendersCount,
    };

  } catch (error) {
    if (isTimeoutError(error)) {
      console.warn(`[Scraper Timeout] ${district}.odisha.gov.in did not respond within ${DEFAULT_TIMEOUT}ms — skipping.`);
    } else {
      console.error(`[Scraper Error] Failed to scrape ${district}:`, error);
    }
    
    // Log failure to DB
    await prisma.scrapeLog.create({
      data: {
        district,
        status: "FAILED",
        tendersFound: 0,
        error: error instanceof Error ? error.message : "Unknown error",
        source,
      }
    });

    return {
      district,
      success: false,
      tenders: [],
      newTendersCount: 0,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/** Maximum number of times a failed district will be re-queued before giving up. */
const MAX_DISTRICT_RETRIES = 3;

/** Fisher-Yates shuffle — returns a new randomly-ordered array. */
function shuffleArray<T>(arr: T[]): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export async function runFullScrape(source: string = "AUTO") {
  const results: ScrapeResult[] = [];

  // Randomise district order so a slow district at position N doesn't
  // block the whole queue on every run.
  const shuffled = shuffleArray(DISTRICTS);

  // Track how many times each district has been attempted.
  const attemptCount = new Map<string, number>();

  // Work queue — districts waiting to be processed.
  // Use an object wrapper so we can mutate the array while tasks are running.
  const queue: string[] = [...shuffled];

  // We process the queue one slot at a time using p-limit.
  // Each task pops the next district, scrapes it, and re-queues on failure.
  // We keep spawning tasks until the queue is empty AND all in-flight tasks are done.
  const inFlight = new Set<Promise<void>>();

  async function processNext(): Promise<void> {
    const district = queue.shift();
    if (!district) return;

    const attempt = (attemptCount.get(district) ?? 0) + 1;
    attemptCount.set(district, attempt);

    if (attempt > 1) {
      console.log(`[Scraper Queue] Retrying ${district} (attempt ${attempt}/${MAX_DISTRICT_RETRIES})...`);
    }

    await randomDelay(500, 2000);

    const result = await scrapeDistrict(district, source);
    results.push(result);

    if (!result.success && attempt < MAX_DISTRICT_RETRIES) {
      // Put the failed district at the back of the queue for a later retry.
      console.warn(`[Scraper Queue] ${district} failed — re-queuing (attempt ${attempt}/${MAX_DISTRICT_RETRIES}).`);
      queue.push(district);
    } else if (!result.success) {
      console.error(`[Scraper Queue] ${district} failed ${attempt} times — giving up.`);
    }
  }

  // Drive the queue: keep spawning scraperLimit-wrapped tasks while there is
  // work to do (either items in queue or tasks still in-flight that may push
  // new retry items).
  await new Promise<void>((resolve) => {
    function scheduleNext() {
      // Fill available concurrency slots from the queue.
      while (queue.length > 0) {
        const task = scraperLimit(() => processNext()).then(() => {
          inFlight.delete(task);
          // After each task finishes, try to fill slots again.
          scheduleNext();
          if (inFlight.size === 0 && queue.length === 0) {
            resolve();
          }
        });
        inFlight.add(task);
      }

      // If nothing is queued and nothing is running, we are done.
      if (inFlight.size === 0 && queue.length === 0) {
        resolve();
      }
    }

    scheduleNext();
  });

  // State-level NICGEP scrape runs independently (not subject to district retries).
  const stateResult = await scraperLimit(async () => {
    await randomDelay(500, 2000);
    return scrapeStateTenders(source);
  });
  results.push(stateResult);

  return {
    success: true,
    districtsProcessed: DISTRICTS.length + 1,
    results,
  };
}
