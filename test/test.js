const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    const t = await prisma.tender.findFirst();
    if (!t) return console.log("No tenders found");
    const updated = await prisma.tender.update({
      where: { id: t.id },
      data: { isBookmarked: true }
    });
    console.log("Success", updated.id, updated.isBookmarked);
  } catch (err) {
    console.error("PRISMA ERROR", err);
  } finally {
    await prisma.$disconnect();
  }
}

main();
