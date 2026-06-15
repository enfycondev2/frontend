const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function migrate() {
  console.log("Starting migration of state tenders...");

  // 1. Fetch all tenders that are state tenders
  const stateTenders = await prisma.tender.findMany({
    where: {
      sourceUrl: { contains: "nicgep" }
    }
  });

  console.log(`Found ${stateTenders.length} state tenders to migrate.`);

  // 2. Insert into StateTender
  let inserted = 0;
  for (const t of stateTenders) {
    try {
      await prisma.stateTender.upsert({
        where: {
          organisation_tenderPdfUrl: {
            organisation: t.district,
            tenderPdfUrl: t.tenderPdfUrl || ""
          }
        },
        update: {},
        create: {
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
        }
      });
      inserted++;
    } catch(err) {
      console.error(`Failed to migrate: ${t.id}`, err);
    }
  }

  console.log(`Successfully migrated ${inserted} tenders.`);

  // 3. Delete from Tender
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
