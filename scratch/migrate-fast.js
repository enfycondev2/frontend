const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting FAST migration of state tenders...");

  // 1. Fetch all tenders that are state tenders
  const stateTenders = await prisma.tender.findMany({
    where: {
      sourceUrl: { contains: "nicgep" }
    }
  });

  console.log(`Found ${stateTenders.length} state tenders to migrate.`);

  // 2. Map to StateTender shape
  const toInsert = stateTenders.map(t => ({
    id: t.id,
    organisation: t.district,
    title: t.title,
    description: t.description,
    startDate: t.startDate,
    endDate: t.endDate,
    noticePdfUrl: t.noticePdfUrl,
    tenderPdfUrl: t.tenderPdfUrl || "",
    tenderValue: t.tenderValue,
    emd: t.emd,
    applicationCost: t.applicationCost,
    aiSummary: t.aiSummary,
    tags: t.tags,
    aiProcessed: t.aiProcessed,
    aiError: t.aiError,
    isBookmarked: t.isBookmarked,
    isApplied: t.isApplied,
    sourceUrl: t.sourceUrl,
    createdAt: t.createdAt,
    updatedAt: t.updatedAt
  }));

  // Clean the existing ones just in case to prevent unique constraint failures
  await prisma.stateTender.deleteMany({});

  // 3. Insert into StateTender
  try {
    const result = await prisma.stateTender.createMany({
      data: toInsert,
      skipDuplicates: true
    });
    console.log(`Successfully migrated ${result.count} tenders in bulk.`);
  } catch(err) {
    console.error(`Failed to bulk insert:`, err);
  }

  // 4. Delete from Tender
  const deleteResult = await prisma.tender.deleteMany({
    where: {
      sourceUrl: { contains: "nicgep" }
    }
  });

  console.log(`Deleted ${deleteResult.count} state tenders from the Tender table.`);
  console.log("Migration complete.");
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
