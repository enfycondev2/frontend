const tenantId = process.env.AZURE_TENANT_ID || '449ef8af-d2d1-43ec-bdfe-a448d2d2e5a7';
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

export async function sendHighPriorityTenderEmail(tenders: any[], tenderType: string = 'Mixed', recipientEmail: string = 'sudhakar@enfycon.com', recipientName: string = 'Sudhakar', isTest: boolean = false) {
  if (!clientId || !clientSecret) {
    console.warn("MS Graph API credentials not found. Skipping email.");
    return;
  }

  if (!tenders || tenders.length === 0) return;

  try {
    // 1. Get Token
    const tokenParams = new URLSearchParams();
    tokenParams.append('client_id', clientId);
    tokenParams.append('scope', 'https://graph.microsoft.com/.default');
    tokenParams.append('client_secret', clientSecret);
    tokenParams.append('grant_type', 'client_credentials');

    const tokenRes = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      body: tokenParams,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });

    const tokenData = await tokenRes.json();
    if (!tokenData.access_token) {
      console.error("Failed to get MS Graph access token:", tokenData);
      return;
    }

    // 2. Send Email
    const sender = "mis@enfycon.com";
    
    const tendersHtml = `
      <div class="table-container" style="overflow-x: auto;">
        <table class="responsive-table" style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <thead>
            <tr style="background-color: #1f2937; color: #ffffff; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">
              <th style="padding: 16px; border: 1px solid #374151; font-weight: 600;">${tenderType === 'State' ? 'Organisation' : 'District'}</th>
              <th style="padding: 16px; border: 1px solid #374151; font-weight: 600; width: 45%;">Title & AI Summary</th>
              <th style="padding: 16px; border: 1px solid #374151; font-weight: 600;">Financials</th>
              <th style="padding: 16px; border: 1px solid #374151; font-weight: 600;">Timeline</th>
              <th style="padding: 16px; border: 1px solid #374151; font-weight: 600;">Documents</th>
            </tr>
          </thead>
          <tbody>
            ${tenders.map((tender, index) => {
              const tidMatch = tender.title.match(/(\d{4}_[A-Z0-9]+_\d+(?:_\d+)?)/i);
              const tid = tidMatch ? tidMatch[1] : null;
              
              return `
            <tr class="responsive-tr" style="background-color: ${index % 2 === 0 ? '#ffffff' : '#f9fafb'}; border-bottom: 1px solid #e5e7eb;">
              <td class="responsive-td" style="padding: 16px; color: #4b5563; font-weight: 600; text-transform: uppercase; font-size: 12px; vertical-align: top; border: 1px solid #e5e7eb;">
                <div class="mobile-label" style="display: none;">${tenderType === 'State' ? 'Organisation' : 'District'}</div>
                ${tender.district || tender.organisation || 'N/A'}
              </td>
              <td class="responsive-td" style="padding: 16px; vertical-align: top; border: 1px solid #e5e7eb;">
                <div style="color: #111827; font-weight: 700; font-size: 15px; margin-bottom: 8px; line-height: 1.4;">
                  ${tender.title.replace(/[\\[\\]]/g, '').trim()}
                </div>
                <div style="color: #6b7280; font-style: italic; font-size: 13px; line-height: 1.5;">
                  ✨ ${tender.aiSummary || 'No summary available.'}
                </div>
              </td>
              <td class="responsive-td fin-td" style="padding: 16px; vertical-align: top; border: 1px solid #e5e7eb; font-size: 13px;">
                <div class="mobile-label" style="display: none;">Financials</div>
                <div class="fin-flex">
                  <div style="margin-bottom: 8px;"><span style="color:#9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">Est. Value</span><br/><strong style="color: #059669; white-space: nowrap;">${tender.tenderValue || 'N/A'}</strong></div>
                  <div style="margin-bottom: 8px;"><span style="color:#9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">EMD</span><br/><strong style="color: #2563eb; white-space: nowrap;">${tender.emd || 'N/A'}</strong></div>
                  <div><span style="color:#9ca3af; font-size: 11px; text-transform: uppercase; font-weight: 600;">App Cost</span><br/><strong style="color: #9333ea; white-space: nowrap;">${tender.applicationCost || 'N/A'}</strong></div>
                </div>
              </td>
              <td class="responsive-td time-td" style="padding: 16px; vertical-align: top; border: 1px solid #e5e7eb; font-size: 13px;">
                <div class="mobile-label" style="display: none;">Timeline</div>
                <div class="time-flex">
                  <div style="margin-bottom: 6px; color: #374151; white-space: nowrap;">📅 <strong style="color:#6b7280; font-size:11px; text-transform:uppercase;">Start:</strong><br/>${tender.startDate ? new Date(tender.startDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}</div>
                  <div style="margin-bottom: 6px; color: #374151; white-space: nowrap;">⏳ <strong style="color:#6b7280; font-size:11px; text-transform:uppercase;">End:</strong><br/>${tender.endDate ? new Date(tender.endDate).toLocaleDateString('en-GB', {day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A'}</div>
                  ${(() => {
                    const bidOpenMatch = tender.description ? tender.description.match(/Bid Opening:\\s*([^|]+)/i) : null;
                    const bidOpenDate = bidOpenMatch ? bidOpenMatch[1].trim().split(' ')[0] : null;
                    if (!bidOpenDate && tenderType !== 'State') return '';
                    return `<div style="color: #374151; white-space: nowrap;">📂 <strong style="color:#6b7280; font-size:11px; text-transform:uppercase;">Bid Open:</strong><br/>${bidOpenDate || 'N/A'}</div>`;
                  })()}
                </div>
              </td>
              <td class="responsive-td doc-td" style="padding: 16px; vertical-align: top; border: 1px solid #e5e7eb; font-size: 13px; text-align: center;">
                <div class="mobile-label" style="display: none;">Documents</div>
                <div class="doc-container">
                  ${tender.noticePdfUrl ? `<a href="${tender.noticePdfUrl}" target="_blank" style="display:inline-block; padding: 6px 12px; background-color: #eff6ff; color: #2563eb; text-decoration: none; border-radius: 4px; font-weight: 600; margin-bottom: 6px; width: 100%; box-sizing: border-box; white-space: nowrap;">📄 Notice</a><br class="desktop-br"/>` : ''}
                  ${tender.tenderPdfUrl ? `<a href="${tender.tenderPdfUrl}" target="_blank" style="display:inline-block; padding: 6px 12px; background-color: #faf5ff; color: #9333ea; text-decoration: none; border-radius: 4px; font-weight: 600; margin-bottom: 6px; width: 100%; box-sizing: border-box; white-space: nowrap;">📄 Tender</a><br class="desktop-br"/>` : ''}
                  
                  ${tenderType === 'State' ? `
                    <div style="margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb;">
                      <a href="https://tendersodisha.gov.in/nicgep/app?page=FrontEndAdvancedSearch&service=page" target="_blank" style="display:inline-block; padding: 6px 12px; background-color: #f3f4f6; color: #374151; text-decoration: none; border-radius: 4px; font-weight: 600; border: 1px solid #e5e7eb; width: 100%; box-sizing: border-box; white-space: nowrap;">🔍 Search on Portal</a>
                      ${tid ? `<div style="margin-top: 6px; font-size: 10px; color: #6b7280; white-space: nowrap;">ID: <strong style="user-select: all; background-color: #fef3c7; padding: 3px 6px; border-radius: 3px; color: #92400e; letter-spacing: 0.5px;">${tid}</strong></div>` : ''}
                    </div>
                  ` : `
                    ${!tender.noticePdfUrl && !tender.tenderPdfUrl ? `<a href="${tender.sourceUrl}" target="_blank" style="display:inline-block; padding: 6px 12px; background-color: #f3f4f6; color: #374151; text-decoration: none; border-radius: 4px; font-weight: 600; border: 1px solid #e5e7eb; width: 100%; box-sizing: border-box; white-space: nowrap;">↗ View Portal</a>` : ''}
                  `}
                </div>
              </td>
            </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>enfycon Tender Alerts</title>
        <style>
          @media only screen and (max-width: 600px) {
            .email-wrapper { padding: 10px !important; }
            .email-container { padding: 20px 15px !important; }
            .header-container { padding: 20px 15px !important; }
            .responsive-table, .responsive-table tbody, .responsive-table tr, .responsive-table td {
              display: block !important;
              width: 100% !important;
              box-sizing: border-box;
            }
            .responsive-table thead {
              display: none !important;
            }
            .responsive-tr {
              margin-bottom: 20px !important;
              border: 1px solid #e5e7eb !important;
              border-radius: 8px !important;
              background-color: #ffffff !important;
              box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
              overflow: hidden !important;
            }
            .responsive-td {
              padding: 12px 16px !important;
              border: none !important;
              border-bottom: 1px solid #f3f4f6 !important;
              text-align: left !important;
            }
            .responsive-td:last-child {
              border-bottom: none !important;
            }
            .mobile-label {
              display: block !important;
              font-size: 11px !important;
              font-weight: 600 !important;
              color: #9ca3af !important;
              text-transform: uppercase !important;
              margin-bottom: 6px !important;
              letter-spacing: 0.5px !important;
            }
            .fin-flex, .time-flex {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 12px !important;
            }
            .fin-flex > div, .time-flex > div {
              margin-bottom: 0 !important;
            }
            .doc-container {
              display: flex !important;
              flex-wrap: wrap !important;
              gap: 8px !important;
            }
            .doc-container > a, .doc-container > div {
              width: calc(50% - 4px) !important;
              margin-bottom: 0 !important;
            }
            .doc-container > div {
              width: 100% !important;
            }
            .desktop-br {
              display: none !important;
            }
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
        <div class="email-wrapper" style="padding: 20px; background-color: #f3f4f6;">
          <div style="max-width: 1200px; margin: 0 auto;">
            ${isTest ? `<div style="background-color: #fef2f2; color: #b91c1c; padding: 12px; text-align: center; font-weight: bold; font-size: 14px; border-radius: 8px; border: 1px dashed #f87171; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">🚨 Test Email - Non-Production Alert 🚨</div>` : ''}
            <div style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            
            <!-- Header -->
            <div class="header-container" style="background-color: #ffffff; padding: 30px 40px; border-bottom: 1px solid #e5e7eb; display: flex; align-items: center; justify-content: space-between;">
              <div>
                <div style="font-size: 28px; font-weight: 800; color: #4361ee; letter-spacing: -1px; margin-bottom: 4px;">enfycon</div>
                <h1 style="color: #111827; margin: 0; font-size: 20px; font-weight: 600;">Tender Alert Report</h1>
              </div>
            </div>
            
            <!-- Content -->
            <div class="email-container" style="padding: 30px 40px 40px 40px;">
              <p style="color: #111827; font-size: 16px; margin: 0 0 24px 0; line-height: 1.6;">Dear <strong>${recipientName}</strong>,<br/><br/>We have identified <strong>${tenders.length}</strong> new high-priority ${tenderType === 'Mixed' ? '' : tenderType.toLowerCase() + ' '}tender${tenders.length > 1 ? 's' : ''} matching your keywords. Please review the details below.</p>
              ${tendersHtml}
              
              <!-- Call to Action -->
              <div style="margin-top: 40px; text-align: center;">
                <a href="https://tenders.enfycon.com/dashboard" style="display: inline-block; background-color: #4361ee; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 6px -1px rgba(67, 97, 238, 0.2);">
                  View Full Dashboard
                </a>
              </div>
            </div>
            
            <!-- Footer -->
            <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; margin: 0; font-size: 12px;">
                Automated alert from the enfycon Tenders System.<br/>
                &copy; ${new Date().getFullYear()} enfycon. All rights reserved.
              </p>
            </div>
            </div>
            
          </div>
        </div>
      </body>
      </html>
    `;

    const subjectText = tenders.length === 1 
      ? `Enfycon Alert: High-Priority ${tenderType === 'Mixed' ? '' : tenderType + ' '}Tender - ${tenders[0].title.replace(/[\[\]]/g, '').trim().substring(0, 40)}...` 
      : `Enfycon Alert: ${tenders.length} New High-Priority ${tenderType === 'Mixed' ? '' : tenderType + ' '}Tenders`;

    const emailPayload = {
      message: {
        subject: subjectText,
        body: {
          contentType: "HTML",
          content: emailHtml
        },
        toRecipients: [
          { emailAddress: { address: recipientEmail, name: recipientName } }
        ]
      },
      saveToSentItems: "false"
    };

    const mailRes = await fetch(`https://graph.microsoft.com/v1.0/users/${sender}/sendMail`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(emailPayload)
    });

    if (!mailRes.ok) {
      const errData = await mailRes.text();
      console.error("Failed to send email via MS Graph:", errData);
    } else {
      console.log(`High priority tender email sent to ${recipientEmail}`);
    }
  } catch (error) {
    console.error("Exception sending email:", error);
  }
}
