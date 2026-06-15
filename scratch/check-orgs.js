const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.stateTender.findMany({select: {organisation: true}}).then(res => { 
  const unique = [...new Set(res.map(r=>r.organisation))]; 
  console.log('Unique orgs in StateTender:', unique); 
}).finally(()=>prisma.$disconnect());
