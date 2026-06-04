const { PrismaClient } = require("../src/generated/prisma/index.js");
const { PrismaPg } = require("@prisma/adapter-pg");
const pg = require("pg");
const bcrypt = require("bcryptjs");
const readline = require("readline");
require("dotenv").config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function main() {
  console.log("--- Secure Admin Creation Tool ---");
  
  const name = await question("Enter Admin Name: ");
  const email = await question("Enter Admin Email: ");
  const password = await question("Enter Admin Password: ");

  if (!name || !email || !password) {
    console.error("All fields are required!");
    process.exit(1);
  }

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  try {
    const admin = await prisma.adminUser.create({
      data: {
        name,
        email,
        passwordHash,
      },
    });

    console.log("\x1b[32m%s\x1b[0m", `Success! Admin created: ${admin.email} (ID: ${admin.id})`);
  } catch (error) {
    if (error.code === 'P2002') {
      console.error("\x1b[31m%s\x1b[0m", "Error: An admin with this email already exists.");
    } else {
      console.error("\x1b[31m%s\x1b[0m", "Error creating admin:", error);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
    rl.close();
  }
}

main();
