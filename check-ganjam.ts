import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const t = await prisma.tender.findFirst({
    where: { title: { contains: 'SE MI GANJAM II BERHAMPUR corrigendum' } }
  });
  console.log(JSON.stringify(t, null, 2));
}
main().finally(() => prisma.$disconnect());
