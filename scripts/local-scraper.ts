import { config } from 'dotenv';
config(); // Load environment variables from .env

import cron from 'node-cron';
import { runFullScrape, scrapeDistrict } from '../src/lib/scraper/scraper';
import { scrapeStateTenders } from '../src/lib/scraper/nicgep-scraper';

async function runManualScrape(district: string | null) {
  try {
    if (district) {
      if (district.toLowerCase() === 'state') {
        console.log(`\n🔍 Scraping State Level Tenders...`);
        const result = await scrapeStateTenders("LOCAL_MANUAL");
        if (result.success) {
           console.log(`✅ Success! Added/Updated ${result.newTendersCount} state tenders.`);
        } else {
           console.error(`❌ Failed:`, result.error);
        }
      } else {
        console.log(`\n🔍 Scraping district: ${district}...`);
        const result = await scrapeDistrict(district, "LOCAL_MANUAL");
        if (result.success) {
           console.log(`✅ Success! Found ${result.tenders.length} tenders (${result.newTendersCount} new).`);
        } else {
           console.error(`❌ Failed:`, result.error);
        }
      }
    } else {
      console.log(`\n🔄 Scraping ALL districts & state (Full Scrape)...`);
      const result = await runFullScrape("LOCAL_MANUAL");
      if (result.success) {
         console.log(`✅ Full Scrape Success! Processed ${result.districtsProcessed} locations.`);
      } else {
         console.error(`❌ Full Scrape Failed.`);
      }
    }
  } catch (error) {
    console.error(`❌ Manual scrape failed:`, error);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isDaemon = args.includes('--daemon');

  // Verify DB connection string is loaded
  if (!process.env.DATABASE_URL) {
    console.warn("⚠️  WARNING: DATABASE_URL is not set in environment or .env file.");
  }

  if (isDaemon) {
    console.log("==================================================");
    console.log("🚀 Starting Local Scraper Daemon...");
    console.log("🕒 Scheduled to run every day at 12:00 PM and 5:00 PM (IST).");
    console.log("🛑 Leave this window open to keep the daemon running.");
    console.log("   Press Ctrl+C to stop.");
    console.log("==================================================");

    // Run at 12:00 (Noon) and 17:00 (5 PM) IST
    cron.schedule('0 12,17 * * *', async () => {
      console.log(`\n[${new Date().toISOString()}] 🔄 Starting scheduled full scrape...`);
      try {
        const result = await runFullScrape("LOCAL_DAEMON");
        if (result.success) {
          console.log(`✅ [${new Date().toISOString()}] Scheduled scrape completed successfully.`);
        } else {
          console.error(`❌ [${new Date().toISOString()}] Scheduled scrape reported failure.`);
        }
      } catch (error) {
        console.error(`❌ [${new Date().toISOString()}] Scheduled scrape crashed:`, error);
      }
    }, {
      scheduled: true,
      timezone: "Asia/Kolkata"
    });

  } else {
    // Check if a specific district is requested
    const districtIdx = args.indexOf('--district');
    const district = districtIdx !== -1 && args[districtIdx + 1] ? args[districtIdx + 1] : null;

    console.log(`🚀 Starting Manual Local Scrape...`);
    await runManualScrape(district);
    console.log("\nDone.");
    process.exit(0);
  }
}

main().catch(err => {
  console.error("Fatal Error:", err);
  process.exit(1);
});
