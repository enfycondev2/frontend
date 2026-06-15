import axios from 'axios';

async function run() {
  try {
    const res = await axios.post('http://localhost:3000/api/test-pdf', {
      pdfUrl: 'https://sundargarh.odisha.gov.in/sites/default/files/2026-06/1555%20%281%29.pdf'
    });
    console.log(JSON.stringify(res.data, null, 2));
  } catch (error: any) {
    console.error(error.response?.data || error.message);
  }
}
run();
