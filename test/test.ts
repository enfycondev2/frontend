import axios from "axios";
import * as cheerio from "cheerio";

async function run() {
  const res = await axios.get("https://sundargarh.odisha.gov.in/en/tender");
  const $ = cheerio.load(res.data);
  const rows = $("table tbody tr").slice(0, 3);
  rows.each((i, row) => {
    const cells = $(row).find("td");
    const texts = cells.map((_, td) => $(td).text().trim().replace(/\n/g, ' ')).get();
    console.log(`Row ${i}:`, texts);
  });
}
run();
