import { PrismaClient } from "./generated/client";
import bcrypt from "bcryptjs";

// Gateway Prisma client (separate DB)
import { PrismaClient as GatewayPrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const GATEWAY_DATABASE_URL = process.env.GATEWAY_DATABASE_URL
  || "postgres://postgres:pfkR1UPFB1wUs3JKfmsY94LNcWPdLHrwyIXN8tiLDjWDq1LDcS0NREnwmoGQNmNP@157.90.128.248:5454/postgres?schema=public";

const PASSWORD = "password123";

// IDs from the gateway seed-users.ts run
const GATEWAY_IDS = {
  managerEntityId: "16cec4a4-5325-43fe-b42f-2a7c37afa9c7",
  employeeEntityId: "59bafc68-0bb9-4214-a4c4-51a3c9c36eb7",
  agentEntityId: "9e2bfe5d-96e9-4150-a9e9-26f3253ff9e9",
  managerSpaceId: "94eb4dd4-059e-433e-bbb8-01aa1a631cd0",
  employeeSpaceId: "b644d9a9-ee9b-4524-8008-59969ee33a08",
  teamSpaceId: "f6d2659d-5dd2-46f1-8ad7-0bc8b4bf2195",
};

async function main() {
  console.log("🌱 Seeding use-case-app users...");

  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // --- Create Manager user ---
  const manager = await prisma.user.upsert({
    where: { email: "sarah@hsafa.com" },
    update: {},
    create: {
      email: "sarah@hsafa.com",
      name: "Sarah Mitchell",
      passwordHash,
      hsafaEntityId: GATEWAY_IDS.managerEntityId,
      hsafaSpaceId: GATEWAY_IDS.managerSpaceId,
      agentEntityId: GATEWAY_IDS.agentEntityId,
    },
  });
  console.log("✅ Manager created:", manager.name, `(${manager.email})`);

  // --- Create Employee user ---
  const employee = await prisma.user.upsert({
    where: { email: "ahmed@hsafa.com" },
    update: {},
    create: {
      email: "ahmed@hsafa.com",
      name: "Ahmed Hassan",
      passwordHash,
      hsafaEntityId: GATEWAY_IDS.employeeEntityId,
      hsafaSpaceId: GATEWAY_IDS.employeeSpaceId,
      agentEntityId: GATEWAY_IDS.agentEntityId,
    },
  });
  console.log("✅ Employee created:", employee.name, `(${employee.email})`);

  // --- Update gateway entities' externalId to match use-case-app user IDs ---
  // This is required so JWT sub claim (user.id) matches entity.externalId
  const gatewayPrisma = new GatewayPrismaClient({
    datasources: { db: { url: GATEWAY_DATABASE_URL } },
  });

  await gatewayPrisma.entity.update({
    where: { id: GATEWAY_IDS.managerEntityId },
    data: { externalId: manager.id },
  });
  console.log("✅ Gateway manager entity externalId →", manager.id);

  await gatewayPrisma.entity.update({
    where: { id: GATEWAY_IDS.employeeEntityId },
    data: { externalId: employee.id },
  });
  console.log("✅ Gateway employee entity externalId →", employee.id);

  await gatewayPrisma.$disconnect();

  console.log("\n🎉 Seed complete!");
  console.log("\nLogin credentials:");
  console.log("  Manager: sarah@hsafa.com / password123");
  console.log("  Employee: ahmed@hsafa.com / password123");
  console.log("\nUser IDs:");
  console.log(`  Manager: ${manager.id}`);
  console.log(`  Employee: ${employee.id}`);
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
