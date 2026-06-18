import { scrapeStateTenders } from "../src/lib/scraper/nicgep-scraper";

async function run() {
  console.log("Testing full state scraper...");
  await scrapeStateTenders("TEST_RUN");
  console.log("Done testing.");
}

run();
