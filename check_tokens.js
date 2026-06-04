require('dotenv').config();
const { prisma } = require('./src/lib/prisma');
async function check() {
  const vendors = await prisma.vendors.findMany({ select: { id: true, business_name: true, fcm_token: true } });
  const customers = await prisma.customers.findMany({ select: { id: true, full_name: true } }); // customers table doesn't have fcm_token, they use profiles? Wait, let's check schema.
  const profiles = await prisma.profiles.findMany({ select: { id: true, role: true, fcm_token: true } });
  console.log('Vendors:', vendors);
  console.log('Profiles:', profiles.filter(p => p.fcm_token));
  await prisma.$disconnect();
}
check();
