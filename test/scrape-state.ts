import axios from 'axios';
import * as cheerio from 'cheerio';

async function testScrape() {
  console.log("Fetching homepage to get session...");
  const sessionRes = await axios.get('https://tendersodisha.gov.in/nicgep/app', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const cookies = sessionRes.headers['set-cookie'];
  const cookieStr = cookies ? cookies.map((c: string) => c.split(';')[0]).join('; ') : '';

  console.log("Fetching organisation tenders...");
  const tenderRes = await axios.get('https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndTendersByOrganisation&service=direct&session=T&sp', {
    headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookieStr }
  });

  const $ = cheerio.load(tenderRes.data);
  const rows = $('table#table tr.even, table#table tr.odd');
  console.log("Total rows found:", rows.length);

  if (rows.length > 0) {
    const firstRow = $(rows[0]);
    const tds = firstRow.find('td');
    
    const sNo = $(tds[0]).text().trim();
    const publishedDate = $(tds[1]).text().trim();
    const closingDate = $(tds[2]).text().trim();
    const openingDate = $(tds[3]).text().trim();
    
    const titleEl = $(tds[4]).find('a.Xwb');
    const title = titleEl.text().trim() || $(tds[4]).text().trim();
    const href = titleEl.attr('href');
    
    const org = $(tds[5]).text().trim();

    console.log({ sNo, publishedDate, closingDate, openingDate, title, href, org });
  }
}

testScrape().catch(console.error);
