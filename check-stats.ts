import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const total = await prisma.tender.count();
  
  const successfullyProcessedByAI = await prisma.tender.count({
    where: { aiProcessed: true, aiError: null }
  });
  
  const processedButNoTextOrEmpty = await prisma.tender.count({
    where: { aiProcessed: true, aiError: { not: null } }
  });

  const errorsStuckInQueue = await prisma.tender.count({
    where: { aiProcessed: false, aiError: { not: null } }
  });

  const pending = await prisma.tender.count({
    where: {
      aiProcessed: false,
      OR: [
        { noticePdfUrl: { not: null } },
        { tenderPdfUrl: { not: null } }
      ]
    }
  });

  const highPriority = await prisma.tender.count({
    where: { priority: "HIGH" }
  });

  console.log("=== QUEUE STATISTICS ===");
  console.log(`Total Tenders in DB: ${total}`);
  console.log(`Successfully Processed (AI or Regex): ${successfullyProcessedByAI}`);
  console.log(`Processed but Empty/No Text: ${processedButNoTextOrEmpty}`);
  console.log(`High Priority Tenders Found: ${highPriority}`);
  console.log(`Pending in Queue: ${pending}`);
  console.log(`Recently Errored in Queue (Retrying): ${errorsStuckInQueue}`);
  
  // Sample a successful tender
  const sample = await prisma.tender.findFirst({
    where: { aiProcessed: true, aiError: null, tenderValue: { not: null } },
    select: { title: true, tenderValue: true, applicationCost: true, aiSummary: true }
  });
  
  if (sample) {
    console.log("\n=== SAMPLE EXTRACTED DATA ===");
    console.log(JSON.stringify(sample, null, 2));
  }
}

main().finally(() => prisma.$disconnect());
