const axios = require('axios');
async function clearCache() {
  await axios.patch('http://localhost:3000/api/tenders/123/retry-ai?state=true').catch(e => console.log('ignore errors'));
}
clearCache();
