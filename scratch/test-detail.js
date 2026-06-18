const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  
  // Get session
  const sessionRes = await axios.get("https://tendersodisha.gov.in/nicgep/app", {
    headers: { "User-Agent": USER_AGENT }
  });
  const cookies = sessionRes.headers["set-cookie"];
  const cookieStr = cookies ? cookies.map(c => c.split(';')[0]).join('; ') : '';

  // Get table
  const tenderRes = await axios.get(
    "https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndTendersByOrganisation&service=direct&session=T&sp",
    { headers: { "User-Agent": USER_AGENT, "Cookie": cookieStr } }
  );

  const $ = cheerio.load(tenderRes.data);
  const rows = $('table#table tr.even, table#table tr.odd');
  
  if (rows.length > 0) {
    const firstRow = rows.first();
    const tds = firstRow.find('td');
    const titleCell = $(tds[4]);
    console.log("Title cell HTML:", titleCell.html());
    
    // Sometimes the link is not a.Xwb, let's just find the first 'a' tag
    let href = titleCell.find('a').attr('href');
    
    console.log("Found href:", href);
    
    if (href) {
      // Decode XML entities if any, e.g. &amp;
      href = href.replace(/&amp;/g, '&');
      const detailUrl = href.startsWith('http') ? href : "https://tendersodisha.gov.in" + href;
      console.log("Detail URL:", detailUrl);
      
      const detailRes = await axios.get(detailUrl, {
        headers: { "User-Agent": USER_AGENT, "Cookie": cookieStr }
      });
      
      const $d = cheerio.load(detailRes.data);
      // Let's dump the bold keys and their values
      const data = {};
      $d('.td_caption').each((i, el) => {
        const key = $d(el).text().replace(/\s+/g, ' ').trim();
        const nextTd = $d(el).next('td');
        if (nextTd.length) {
           data[key] = nextTd.text().replace(/\s+/g, ' ').trim();
        }
      });
      console.log("Extracted Data:", JSON.stringify(data, null, 2));
      
      // Look for specific tables if caption logic fails
      if (Object.keys(data).length === 0) {
         // fallback, find td where text includes EMD Amount
         const dump = [];
         $d('td').each((i, el) => {
             const t = $d(el).text().trim();
             if (t) dump.push(t);
         });
         console.log("All td texts:", dump.slice(0, 50));
      }
    }
  } else {
    console.log("No rows found.");
  }
}

test();
