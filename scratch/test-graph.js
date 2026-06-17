const fs = require('fs');

async function test() {
  const tenantId = '449ef8af-d2d1-43ec-bdfe-a448d2d2e5a7';
  const clientId = "beaaeaf8-d20e-4c19-a555-9ee75c13ca33";
  const clientSecret = process.env.AZURE_CLIENT_SECRET || "YOUR_CLIENT_SECRET";

  const tokenParams = new URLSearchParams();
  tokenParams.append('client_id', clientId);
  tokenParams.append('scope', 'https://graph.microsoft.com/.default');
  tokenParams.append('client_secret', clientSecret);
  tokenParams.append('grant_type', 'client_credentials');

  console.log("Getting token...");
  const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
    method: 'POST',
    body: tokenParams,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  const tokenData = await tokenRes.json();
  console.log("Token Response:", tokenData);

  if (tokenData.access_token) {
    const emailPayload = {
      message: {
        subject: `🚨 Test Email from Enfycon Tender Platform`,
        body: {
          contentType: "HTML",
          content: "<h3>This is a test email for old tenders.</h3>"
        },
        toRecipients: [
          { emailAddress: { address: 'sahadeb@enfycon.com' } }
        ]
      },
      saveToSentItems: "false"
    };

    console.log("Sending email...");
    const mailRes = await fetch(`https://graph.microsoft.com/v1.0/users/mis@enfycon.com/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!mailRes.ok) {
      console.log("Failed:", await mailRes.text());
    } else {
      console.log("Success!");
    }
  }
}

test();
