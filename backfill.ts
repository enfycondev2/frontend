import { PrismaClient } from '@prisma/client';
import { extractTenderDetailsFromPdf } from './src/lib/scraper/pdf-extractor';

const prisma = new PrismaClient();

async function backfill() {
  console.log("Starting backfill for existing tenders...");
  const tenders = await prisma.tender.findMany({
    where: {
      aiSummary: null,
      noticePdfUrl: { not: null }
    },
    take: 5 // Just do 5 to test it quickly
  });

  if (tenders.length === 0) {
    console.log("No tenders need backfilling.");
    return;
  }

  for (const tender of tenders) {
    console.log(`\nProcessing: ${tender.title}`);
    try {
      const details = await extractTenderDetailsFromPdf(tender.noticePdfUrl!);
      if (details) {
        await prisma.tender.update({
          where: { id: tender.id },
          data: {
            tenderValue: details.tenderValue,
            emd: details.emd,
            applicationCost: details.applicationCost,
            aiSummary: details.aiSummary,
            priority: details.priority
          }
        });
        console.log(`✅ Updated! Priority: ${details.priority}`);
        console.log(`Summary: ${details.aiSummary}`);
      }
    } catch (e: any) {
      console.error(`❌ Failed: ${e.message}`);
    }
  }
  console.log("\nDone processing 5 tenders!");
}

backfill().finally(() => prisma.$disconnect());
