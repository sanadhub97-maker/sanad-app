import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }) });

async function main() {
  if (process.env.NODE_ENV !== "test") throw new Error("Tax demo data may only be seeded into an isolated test database.");
  const [target] = await prisma.$queryRaw<{ database: string; schema: string }[]>`SELECT current_database() AS database, current_schema() AS schema`;
  if (!target || (!target.database.endsWith("_test") && !/^sanad_test_[a-f0-9]{16}$/.test(target.schema))) {
    throw new Error("Refusing to insert fictional financial records into this database.");
  }
  console.log("Checking tax returns in database...");
  const count = await prisma.taxReturn.count();
  console.log(`Current tax returns count: ${count}`);

  if (count === 0) {
    console.log("Seeding realistic sample VAT & Zakat declarations for 2026...");

    // Q1 2026
    await prisma.taxReturn.create({
      data: {
        kind: "VAT",
        year: 2026,
        quarter: 1,
        dueDate: new Date("2026-04-30T00:00:00.000Z"),
        status: "PAID",
        salesStandard: 450000,
        salesZero: 20000,
        purchasesStandard: 210000,
        purchasesImports: 15000,
        outputVat: 67500,
        inputVat: 31500,
        amount: 36000,
        filedDate: new Date("2026-04-26T00:00:00.000Z"),
        reference: "VAT-2026-Q1-89102",
        sadadNumber: "2489019283",
        notes: "تم تقديم الإقرار وسداد الضريبة بالكامل عبر سداد",
      },
    });

    // Q2 2026
    await prisma.taxReturn.create({
      data: {
        kind: "VAT",
        year: 2026,
        quarter: 2,
        dueDate: new Date("2026-07-31T00:00:00.000Z"),
        status: "PAID",
        salesStandard: 580000,
        salesZero: 35000,
        purchasesStandard: 260000,
        purchasesImports: 25000,
        outputVat: 87000,
        inputVat: 39000,
        amount: 48000,
        filedDate: new Date("2026-07-28T00:00:00.000Z"),
        reference: "VAT-2026-Q2-93411",
        sadadNumber: "2489028471",
        notes: "سداد عبر البنك الأهلي التجاري",
      },
    });

    // Q3 2026
    await prisma.taxReturn.create({
      data: {
        kind: "VAT",
        year: 2026,
        quarter: 3,
        dueDate: new Date("2026-10-31T00:00:00.000Z"),
        status: "FILED",
        salesStandard: 640000,
        salesZero: 40000,
        purchasesStandard: 310000,
        purchasesImports: 30000,
        outputVat: 96000,
        inputVat: 46500,
        amount: 49500,
        filedDate: new Date("2026-10-02T00:00:00.000Z"),
        reference: "VAT-2026-Q3-99881",
        sadadNumber: "2489039102",
        notes: "تم تقديم الإقرار بانتظار إتمام السداد قبل نهاية الشهر",
      },
    });

    // Annual Zakat 2026
    await prisma.taxReturn.create({
      data: {
        kind: "ZAKAT",
        year: 2026,
        dueDate: new Date("2027-04-30T00:00:00.000Z"),
        status: "DRAFT",
        zakatBase: 1850000,
        amount: 46250,
        reference: "ZAKAT-2026-EST-01",
        sadadNumber: "2489098177",
        notes: "الوعاء الزكوي التقديري للعام المالي 2026 بنسبة 2.5%",
      },
    });

    console.log("Seeding completed successfully!");
  } else {
    console.log("Database already has tax returns records.");
  }
}

main().catch(() => { console.error("Tax demo seeding stopped; production databases are not permitted."); process.exitCode = 1; }).finally(() => prisma.$disconnect());
