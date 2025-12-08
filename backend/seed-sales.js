// backend/seed-sales.js
// ----------------------
// Creates some demo sales users in the Render DB
// ----------------------

require("dotenv").config();
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const usersToCreate = [
    {
      name: "Moslem Ali Sheikh",
      email: "sales1@example.com",
      password: "Sales@123",
    },
    {
      name: "Jack Sparrow",
      email: "sales2@example.com",
      password: "Sales@123",
    },
  ];

  for (const u of usersToCreate) {
    const hashed = await bcrypt.hash(u.password, 10);

    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: "user",
        password: hashed,
      },
      create: {
        name: u.name,
        email: u.email,
        password: hashed,
        role: "user",
      },
    });

    console.log("User ready:", user.email, "password:", u.password);
  }
}

main()
  .catch((err) => {
    console.error("Error seeding sales users:", err);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
