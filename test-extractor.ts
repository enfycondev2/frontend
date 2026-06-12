import { extractTenderDetailsFromPdf } from './src/lib/scraper/pdf-extractor';

async function run() {
  console.log("Starting extraction test...");
  try {
    const result = await extractTenderDetailsFromPdf('https://sundargarh.odisha.gov.in/sites/default/files/2026-06/1555%20%281%29.pdf');
    console.log("Result:", result);
  } catch(e) {
    console.error("Crash:", e);
  }
}
run();
