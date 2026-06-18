const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
  const res = await axios.get("https://tendersodisha.gov.in/nicgep/app?page=FrontEndAdvancedSearch&service=page");
  const $ = cheerio.load(res.data);
  const captcha = $('#captchaImage');
  console.log("Has captcha?", captcha.length > 0);
}
test();
