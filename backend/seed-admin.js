// backend/seed-admin.js
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = "admin@example.com";      // login email
  const plainPassword = "Admin@123";      // login password
  const name = "Super Admin";

  const hashed = await bcrypt.hash(plainPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: "admin",
      password: hashed,
      name,
    },
    create: {
      name,
      email,
      password: hashed,
      role: "admin",
    },
  });

  console.log("Admin user ready:");
  console.log("Email:", email);
  console.log("Password:", plainPassword);
  console.log("User record:", admin);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
