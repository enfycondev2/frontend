const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  await prisma.tender.deleteMany({});
  await prisma.stateTender.deleteMany({});
  console.log('All old district and state tenders have been successfully cleared from the database.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
