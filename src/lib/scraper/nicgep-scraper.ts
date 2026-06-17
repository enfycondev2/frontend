import axios from "axios";
import * as cheerio from "cheerio";
import { prisma } from "../prisma";
import { ScrapeResult, TenderSchema } from "./types";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const STATE_URL = "https://tendersodisha.gov.in/nicgep/app?page=FrontEndTendersByOrganisation&service=page";

export async function scrapeStateTenders(source: string = "AUTO"): Promise<ScrapeResult> {
  const district = "State Level"; // Logical district name for logging
  try {
    console.log("[NICGEP] Fetching homepage to initialize session...");
    const sessionRes = await axios.get("https://tendersodisha.gov.in/nicgep/app", {
      headers: { "User-Agent": USER_AGENT }
    });

    const cookies = sessionRes.headers["set-cookie"];
    const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

    console.log("[NICGEP] Fetching organisation tenders table...");
    const tenderRes = await axios.get(
      "https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndTendersByOrganisation&service=direct&session=T&sp",
      {
        headers: {
          "User-Agent": USER_AGENT,
          "Cookie": cookieStr
        }
      }
    );

    const $ = cheerio.load(tenderRes.data);
    const rows = $('table#table tr.even, table#table tr.odd');
    
    if (rows.length === 0) {
      console.log("[NICGEP] No rows found. Session might be invalid or table empty.");
      return { district, success: false, tenders: [] };
    }

    console.log(`[NICGEP] Found ${rows.length} tenders. Parsing...`);
    const allValidTenders: any[] = [];

    rows.each((i, row) => {
      const tds = $(row).find('td');
      if (tds.length >= 6) {
        // Parse dates: "13-Jun-2026 06:55 PM"
        const publishedDateStr = $(tds[1]).text().trim();
        const closingDateStr = $(tds[2]).text().trim();
        const openingDateStr = $(tds[3]).text().trim();

        // Title and Ref: "[Construction of road...] [RMC-01/2025-26][2026_OSAMB_132126_1]"
        const titleCell = $(tds[4]);
        const fullTitle = titleCell.find('a.Xwb').text().trim() || titleCell.text().trim();
        
        // Split by brackets to get clean title and ref ID if possible
        const cleanTitle = fullTitle.replace(/[\n\t\r]+/g, ' ').trim();
        
        // Organisation Chain: "Odisha State Agricultural Marketing Board||RMC Keonjhar"
        const orgChain = $(tds[5]).text().trim();

        // Build the tender object matching our schema
        const tenderObj = {
          district: orgChain || "State Tenders",
          title: cleanTitle,
          description: `Opening Date: ${openingDateStr} | Published: ${publishedDateStr}`,
          startDate: openingDateStr ? new Date(openingDateStr) : new Date(publishedDateStr),
          endDate: new Date(closingDateStr),
          sourceUrl: STATE_URL,
        };

        const validation = TenderSchema.safeParse(tenderObj);
        if (validation.success) {
          allValidTenders.push(validation.data);
        } else {
          // Fallback parsing if date fails
          try {
            const fallbackTender = {
               ...tenderObj,
               startDate: new Date(),
               endDate: new Date()
            };
            if (TenderSchema.safeParse(fallbackTender).success) {
                allValidTenders.push(fallbackTender);
            }
          } catch(e) {}
        }
      }
    });

    console.log(`[NICGEP] Parsed ${allValidTenders.length} valid tenders. Inserting to DB...`);

    // Insert into DB in batches to prevent overwhelming the connection pool
    let newTendersCount = 0;
    const batchSize = 100;
    
    for (let i = 0; i < allValidTenders.length; i += batchSize) {
      const batch = allValidTenders.slice(i, i + batchSize);
      
      // Process batch sequentially but efficiently
      for (const tender of batch) {
        try {
          await prisma.stateTender.upsert({
            where: {
              organisation_title: {
                organisation: tender.district,
                title: tender.title,
              }
            },
            update: {
              title: tender.title,
              description: tender.description,
              startDate: tender.startDate,
              endDate: tender.endDate,
              noticePdfUrl: tender.noticePdfUrl,
            },
            create: {
              organisation: tender.district,
              title: tender.title,
              description: tender.description,
              startDate: tender.startDate,
              endDate: tender.endDate,
              noticePdfUrl: tender.noticePdfUrl,
              tenderPdfUrl: tender.tenderPdfUrl || "",
              sourceUrl: tender.sourceUrl,
            }
          });
          newTendersCount++;
        } catch (dbError) {
          console.error(`[DB Error NICGEP]`, dbError);
        }
      }
      console.log(`[NICGEP] Processed batch ${i / batchSize + 1} / ${Math.ceil(allValidTenders.length / batchSize)}`);
    }

    console.log(`[NICGEP] Finished. Added ${newTendersCount} new tenders.`);

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
    console.error(`[Scraper Error] Failed to scrape NICGEP State Tenders:`, error);
    
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
      error: error instanceof Error ? error.message : "Unknown error",
      tenders: [],
      newTendersCount: 0,
    };
  }
}
