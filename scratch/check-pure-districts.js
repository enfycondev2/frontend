const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
prisma.stateTender.findMany({select: {organisation: true}}).then(res => { 
  const unique = [...new Set(res.map(r=>r.organisation))]; 
  const pureDistricts = unique.filter(o => ["Ganjam", "Sundargarh"].includes(o));
  console.log('Pure districts found in StateTender:', pureDistricts); 
}).finally(()=>prisma.$disconnect());
