const axios = require('axios');
const cheerio = require('cheerio');

async function randomDelay(min = 1000, max = 2000) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((resolve) => setTimeout(resolve, delay));
}

async function fetchTenTenders() {
  const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  
  const sessionRes = await axios.get("https://tendersodisha.gov.in/nicgep/app", {
    headers: { "User-Agent": USER_AGENT }
  });
  const cookies = sessionRes.headers["set-cookie"];
  const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

  const tenderRes = await axios.get(
    "https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndTendersByOrganisation&service=direct&session=T&sp",
    { headers: { "User-Agent": USER_AGENT, "Cookie": cookieStr } }
  );

  const $ = cheerio.load(tenderRes.data);
  const rows = $('table#table tr.even, table#table tr.odd');
  
  const limit = Math.min(rows.length, 10);
  const results = [];

  for (let i = 0; i < limit; i++) {
    const row = $(rows[i]);
    const tds = row.find('td');
    const titleCell = $(tds[4]);
    
    let href = titleCell.find('a').attr('href');
    if (!href) continue;

    href = href.replace(/&amp;/g, '&');
    const detailUrl = href.startsWith('http') ? href : "https://tendersodisha.gov.in" + href;
    
    const detailRes = await axios.get(detailUrl, {
      headers: { "User-Agent": USER_AGENT, "Cookie": cookieStr }
    });
    
    const $d = cheerio.load(detailRes.data);
    
    const data = {};
    $d('.td_caption').each((idx, el) => {
      const key = $d(el).text().replace(/\s+/g, ' ').trim();
      const nextTd = $d(el).next('td');
      if (nextTd.length) {
         data[key] = nextTd.text().replace(/\s+/g, ' ').trim();
      }
    });

    results.push({
      title: data["Title"] || data["Work Description"],
      tenderId: data["Tender ID"],
      emd: data["EMD Amount in ₹"] || null,
      tenderValue: data["Tender Value in ₹"] || null,
      applicationCost: data["Tender Fee in ₹"] || null,
      webUrl: detailUrl
    });

    if (i < limit - 1) {
      await randomDelay(800, 1500);
    }
  }

  console.log(JSON.stringify(results, null, 2));
}

fetchTenTenders();
