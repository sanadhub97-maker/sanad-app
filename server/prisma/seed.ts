import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, PERMISSIONS } from "../src/constants/permissions";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  console.log("Seeding permissions...");
  for (const [module, actions] of Object.entries(PERMISSIONS)) {
    for (const action of actions) {
      const key = `${module}.${action}`;
      await prisma.permission.upsert({ where: { key }, update: { module }, create: { key, module, description: `${action} ${module}` } });
    }
  }

  console.log("Seeding default roles...");
  for (const [roleName, permissionKeys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: { name: roleName, isSystem: true, description: `${roleName} (built-in role)` },
    });

    const resolvedKeys = permissionKeys.includes("*") ? ALL_PERMISSION_KEYS : permissionKeys;
    const permissions = await prisma.permission.findMany({ where: { key: { in: resolvedKeys } } });

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    await prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId: role.id, permissionId: p.id })),
    });
  }

  const superAdminEmail = process.env.SEED_SUPERADMIN_EMAIL || "admin@example.com";
  const existingAdmin = await prisma.user.findUnique({ where: { email: superAdminEmail } });

  if (!existingAdmin) {
    console.log(`Creating initial Super Admin account (${superAdminEmail})...`);
    const superAdminRole = await prisma.role.findUniqueOrThrow({ where: { name: "Super Admin" } });
    const passwordHash = await bcrypt.hash(process.env.SEED_SUPERADMIN_PASSWORD || "ChangeMe123!", 12);

    await prisma.user.create({
      data: {
        fullName: process.env.SEED_SUPERADMIN_NAME || "Super Admin",
        email: superAdminEmail,
        passwordHash,
        emailVerifiedAt: new Date(),
        userRoles: { create: [{ roleId: superAdminRole.id }] },
      },
    });
    console.log("Super Admin created. Please change the seeded password after first login.");
  } else {
    console.log("Super Admin already exists — skipping.");
  }

  // No fake employees, documents, licenses, or payments are seeded (§51) —
  // the application shows professional empty states until real data is
  // entered or imported.
  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
