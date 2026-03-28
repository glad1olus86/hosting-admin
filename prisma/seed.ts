import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { hash } from "bcryptjs";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set");

const parsed = new URL(url);
const adapter = new PrismaMariaDb({
  host: parsed.hostname,
  port: parseInt(parsed.port || "3306", 10),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
});

const prisma = new PrismaClient({ adapter });

async function main() {
  const passwordHash = await hash("admin", 12);

  const admin = await prisma.dashboardAccount.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      email: "admin@hostpanel.local",
      passwordHash,
      role: "admin",
    },
  });

  console.log(`Admin account ready: ${admin.username} (id=${admin.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
