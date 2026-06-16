const https = require('https');
const http = require('http');

let SITE_URL = process.env.SITE_URL || 'http://localhost:3000';
if (!SITE_URL.startsWith('http')) {
  SITE_URL = `https://${SITE_URL}`;
}
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error("CRON_SECRET environment variable is missing.");
  process.exit(1);
}

// Helper to make HTTP requests
function makeRequest(method, endpoint, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint, SITE_URL);
    const options = {
      method: method,
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json'
      }
    };

    const client = url.protocol === 'https:' ? https : http;
    const req = client.request(url, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log(`Checking cron status at ${SITE_URL}/api/cron/status...`);
  try {
    const statusRes = await makeRequest('GET', '/api/cron/status');
    
    if (statusRes.status !== 200) {
      console.error("Failed to fetch status:", statusRes.status, statusRes.data);
      process.exit(1);
    }

    if (!statusRes.data.shouldRun) {
      console.log("Skipping scrape:", statusRes.data.reason);
      process.exit(0);
    }

    const districts = statusRes.data.districts || [];
    console.log(`Starting scrape for ${districts.length} districts...`);

    let successCount = 0;
    let failCount = 0;

    for (const district of districts) {
      console.log(`\nCrawling ${district}...`);
      try {
        const res = await makeRequest('POST', '/api/scrape', { district });
        if (res.status === 200 && res.data.success) {
          console.log(`✅ Success. Found ${res.data.newTenders} new tenders.`);
          successCount++;
        } else {
          console.error(`❌ Failed:`, res.data);
          failCount++;
        }
      } catch (err) {
        console.error(`❌ Network Error for ${district}:`, err.message);
        failCount++;
      }
      
      // Delay to be polite
      await new Promise(r => setTimeout(r, 1000));
    }

    console.log(`\nScrape Finished! Successful: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error("Runner Error:", error);
    process.exit(1);
  }
}

run();
