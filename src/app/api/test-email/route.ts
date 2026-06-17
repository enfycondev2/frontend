import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendHighPriorityTenderEmail } from '@/lib/email';

export async function GET() {
  try {
    const keywordsData = await prisma.priorityKeyword.findMany();
    const keywordList = keywordsData.map((k: any) => k.word);
    
    if (keywordList.length === 0) {
      return NextResponse.json({ success: false, message: "No keywords found in DB" });
    }

    const keywordConditions = [
      ...keywordList.map((kw: string) => ({ title: { contains: kw, mode: 'insensitive' as const } })),
      ...keywordList.map((kw: string) => ({ aiSummary: { contains: kw, mode: 'insensitive' as const } }))
    ];

    const districtTenders = await prisma.tender.findMany({
      where: {
        OR: keywordConditions
      }
    });

    const stateTenders = await prisma.stateTender.findMany({
      where: {
        OR: keywordConditions
      }
    });

    if (districtTenders.length === 0 && stateTenders.length === 0) {
      return NextResponse.json({ success: false, message: "No high priority tenders found." });
    }

    const recipients = await (prisma as any).emailRecipient.findMany();
    const testRecipients = [...recipients];
    if (!testRecipients.find((r: any) => r.email === 'sahadeb@enfycon.com')) {
      testRecipients.push({ email: 'sahadeb@enfycon.com', name: 'Sahadeb' });
    }

    if (districtTenders.length > 0) {
      for (const r of testRecipients) {
        await sendHighPriorityTenderEmail(districtTenders, 'District', r.email, r.name, true);
      }
    }

    if (stateTenders.length > 0) {
      for (const r of testRecipients) {
        await sendHighPriorityTenderEmail(stateTenders, 'State', r.email, r.name, true);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Test email sent for ${districtTenders.length} district tenders and ${stateTenders.length} state tenders.` 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message });
  }
}
