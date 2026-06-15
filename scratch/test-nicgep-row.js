const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = "https://tendersodisha.gov.in";
const HOME_URL = "https://tendersodisha.gov.in/nicgep/app";
const STATE_URL = "https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndTendersByOrganisation&service=direct&session=T&sp";

async function test() {
  const session = axios.create({
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    }
  });

  await session.get(HOME_URL);
  const response = await session.get(STATE_URL);
  const html = response.data;
  
  const $ = cheerio.load(html);
  const rows = $('table#table tr.list_row');
  
  if (rows.length > 0) {
    console.log("HTML of first row:");
    console.log($(rows[0]).html());
  } else {
    console.log("No rows found.");
  }
}

test();
