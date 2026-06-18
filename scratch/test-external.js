const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const tenderId = "2026_CERWI_132260_1";
  
  // Try FrontEndTenderDetailsExternal
  const urls = [
    `https://tendersodisha.gov.in/nicgep/app?page=FrontEndTenderDetailsExternal&service=page&sp=%2B${tenderId}`,
    `https://tendersodisha.gov.in/nicgep/app?page=FrontEndTenderDetailsExternal&service=page&sp=${tenderId}`,
    `https://tendersodisha.gov.in/nicgep/app?component=%24DirectLink&page=FrontEndTenderDetailsExternal&service=direct&sp=${tenderId}`
  ];

  for (const url of urls) {
    try {
      console.log("Trying:", url);
      const res = await axios.get(url, { validateStatus: () => true });
      console.log("Status:", res.status);
      const $ = cheerio.load(res.data);
      const hasCaptcha = $('#captchaImage').length > 0;
      const hasTenderText = res.data.includes(tenderId);
      console.log(`Has Captcha: ${hasCaptcha}, Has Tender Text: ${hasTenderText}`);
      if (hasCaptcha) {
        console.log("URL WORKS AS CAPTCHA WALL!");
      }
    } catch (e) {
      console.log("Error:", e.message);
    }
  }
}
test();
