import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.tender.findMany({
    where: { district: 'sambalpur' },
    select: { id: true, title: true, noticePdfUrl: true, tenderPdfUrl: true, createdAt: true },
    orderBy: { title: 'asc' }
  });
  console.log(JSON.stringify(t, null, 2));
}
main().finally(() => prisma.$disconnect());
