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
    
    let href = titleCell.find('a').attr('href');
    
    if (href) {
      href = href.replace(/&amp;/g, '&');
      const detailUrl = href.startsWith('http') ? href : "https://tendersodisha.gov.in" + href;
      
      const detailRes = await axios.get(detailUrl, {
        headers: { "User-Agent": USER_AGENT, "Cookie": cookieStr }
      });
      
      const $d = cheerio.load(detailRes.data);
      
      console.log("Looking for document links...");
      $d('a').each((i, el) => {
        const linkHref = $d(el).attr('href');
        const text = $d(el).text().trim();
        const id = $d(el).attr('id');
        
        if (linkHref && (linkHref.includes('Download') || linkHref.includes('download') || text.includes('pdf') || linkHref.includes('DirectLink'))) {
          console.log(`- ID: ${id || 'N/A'} | Text: ${text} | Href: ${linkHref}`);
        }
      });
      
    }
  }
}

test();
