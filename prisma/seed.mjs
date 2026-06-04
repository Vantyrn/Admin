import { PrismaClient } from '../src/generated/prisma/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import bcrypt from "bcryptjs";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  const adminEmail = "abid@gmail.com";
  const existingAdmin = await prisma.adminUser.findUnique({
    where: { email: adminEmail },
  });

  if (existingAdmin) {
    console.log("Admin user already exists.");
  } else {
    const seedPassword = process.env.ADMIN_SEED_PASSWORD;
    if (!seedPassword) {
      throw new Error("ADMIN_SEED_PASSWORD environment variable is required for seeding!");
    }
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(seedPassword, salt);

    await prisma.adminUser.create({
      data: {
        name: "Super Admin",
        email: adminEmail,
        passwordHash,
      },
    });
    console.log(`Admin user created: ${adminEmail}`);
  }

  console.log("Seeding completed.");
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
