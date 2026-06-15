const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const count = await prisma.stateTender.count();
  console.log("StateTenders count:", count);
  const tenders = await prisma.tender.count({ where: { sourceUrl: { contains: "nicgep" } } });
  console.log("Old state tenders remaining:", tenders);
}

main().finally(() => prisma.$disconnect());
