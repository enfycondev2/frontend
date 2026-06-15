import axios from "axios";
import { parseTenderPage } from "./src/lib/scraper/parser";

async function run() {
  const res = await axios.get("https://puri.odisha.gov.in/en/tender?page=999");
  const tenders = parseTenderPage(res.data, "puri", "https://puri.odisha.gov.in/en/tender?page=999");
  console.log("Tenders on page 999:", tenders.length);
}
run();
