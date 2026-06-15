import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const res = await prisma.tender.deleteMany({
    where: {
      title: {
        contains: 'SE MI GANJAM II BERHAMPUR corrigendum'
      }
    }
  });
  console.log('Deleted tenders:', res.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
