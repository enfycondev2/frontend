import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.tender.updateMany({
    data: {
      aiProcessed: false,
      aiError: null,
      aiSummary: null,
      tenderValue: null,
      emd: null,
      applicationCost: null,
      priority: "LOW"
    }
  });

  console.log(`Reset ${result.count} tenders to be re-processed by the queue.`);
}

main().finally(() => prisma.$disconnect());
