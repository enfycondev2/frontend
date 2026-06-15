import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.tender.groupBy({ by: ['district'], _count: { id: true } });
  console.log(JSON.stringify(t, null, 2));
}
main().finally(() => prisma.$disconnect());
