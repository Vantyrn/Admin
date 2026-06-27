import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import 'dotenv/config';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Canonical business categories the vendor app currently offers at registration
// (mirrors FOOD_CATEGORIES + non-food list in Vendor-2026/app/auth/vendor-register.js).
const CANONICAL = [
  { name: 'Biryani & Rice', is_food: true },
  { name: 'Burgers & Fast Food', is_food: true },
  { name: 'Pizza & Pasta', is_food: true },
  { name: 'North Indian', is_food: true },
  { name: 'South Indian', is_food: true },
  { name: 'Chinese & Pan-Asian', is_food: true },
  { name: 'Street Food & Snacks', is_food: true },
  { name: 'Mithai & Desserts', is_food: true },
  { name: 'Beverages & Shakes', is_food: true },
  { name: 'Bakery & Cake', is_food: true },
  { name: 'Grocery', is_food: false },
  { name: 'Pharmacy', is_food: false },
  { name: 'Dairy', is_food: false },
];

async function main() {
  console.log('🌱 Seeding business_categories...');

  // 1. Upsert the canonical list with stable display ordering. `update` only
  //    refreshes ordering/is_food so re-running never resurrects a disabled row's
  //    is_active state (admins may have intentionally disabled one).
  for (let i = 0; i < CANONICAL.length; i++) {
    const cat = CANONICAL[i];
    await prisma.business_categories.upsert({
      where: { name: cat.name },
      update: { is_food: cat.is_food, display_order: i },
      create: { name: cat.name, is_food: cat.is_food, display_order: i, is_active: true },
    });
  }
  console.log(`✅ Upserted ${CANONICAL.length} canonical categories.`);

  // 2. Pull in any business_category already in use by existing vendors that isn't
  //    in the canonical list, so the managed list never hides an in-use category.
  const vendorCats = await prisma.vendors.findMany({
    select: { business_category: true },
    distinct: ['business_category'],
  });
  const known = new Set(CANONICAL.map((c) => c.name.toLowerCase()));
  let extra = 0;
  for (const v of vendorCats) {
    const name = (v.business_category || '').trim();
    if (!name || known.has(name.toLowerCase())) continue;
    known.add(name.toLowerCase());
    await prisma.business_categories.upsert({
      where: { name },
      update: {},
      // is_food defaults true for unknown imported categories; admin can adjust.
      create: { name, is_food: true, display_order: 100 + extra, is_active: true },
    });
    extra++;
  }
  console.log(`✅ Imported ${extra} extra in-use categor${extra === 1 ? 'y' : 'ies'} from existing vendors.`);

  const total = await prisma.business_categories.count();
  console.log(`🎉 Done. business_categories now has ${total} rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
