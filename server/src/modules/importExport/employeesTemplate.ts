import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";

const COLUMNS: { header: string; width: number; required?: boolean; note?: string }[] = [
  { header: "Employee Number", width: 18, required: true },
  { header: "Full Name (Arabic)", width: 26, required: true },
  { header: "Full Name (English)", width: 26 },
  { header: "Nationality", width: 16 },
  { header: "Gender", width: 12, note: "MALE or FEMALE" },
  { header: "Date of Birth", width: 16, note: "YYYY-MM-DD" },
  { header: "Mobile", width: 16 },
  { header: "Email", width: 24 },
  { header: "Job Title", width: 20 },
  { header: "Department", width: 20 },
  { header: "Branch Code", width: 14, note: "Must match an existing branch code" },
  { header: "Joining Date", width: 16, note: "YYYY-MM-DD" },
  { header: "Employment Status", width: 18, note: "ACTIVE / INACTIVE / ON_LEAVE / TERMINATED" },
  { header: "Iqama Number", width: 18 },
  { header: "Iqama Issue Date", width: 16, note: "YYYY-MM-DD" },
  { header: "Iqama Expiry Date", width: 16, note: "YYYY-MM-DD" },
  { header: "Passport Number", width: 18 },
  { header: "Passport Country", width: 16 },
  { header: "Passport Issue Date", width: 16, note: "YYYY-MM-DD" },
  { header: "Passport Expiry Date", width: 16, note: "YYYY-MM-DD" },
  { header: "Notes", width: 30 },
];

const EXAMPLE_ROW = [
  "EMP-0001",
  "محمد أحمد",
  "Mohammed Ahmed",
  "Saudi",
  "MALE",
  "1990-05-14",
  "+966500000000",
  "employee@example.com",
  "Accountant",
  "Finance",
  "",
  "2023-01-01",
  "ACTIVE",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "Example row — delete before importing",
];

export async function buildEmployeesImportTemplate(): Promise<Buffer> {
  const branches = await prisma.branch.findMany({ where: { deletedAt: null }, select: { code: true } });

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SanaD Documents & Licenses Management System";

  const sheet = workbook.addWorksheet("Employees", { views: [{ state: "frozen", ySplit: 1 }] });
  sheet.columns = COLUMNS.map((c) => ({ header: c.header, width: c.width }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F3A" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
  headerRow.height = 30;

  const exampleRow = sheet.addRow(EXAMPLE_ROW);
  exampleRow.font = { italic: true, color: { argb: "FF94A3B8" } };

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: COLUMNS.length } };

  // Dropdown validation for enum-like columns + branch codes (§26).
  const genderCol = COLUMNS.findIndex((c) => c.header === "Gender") + 1;
  const statusCol = COLUMNS.findIndex((c) => c.header === "Employment Status") + 1;
  const branchCol = COLUMNS.findIndex((c) => c.header === "Branch Code") + 1;

  for (let row = 2; row <= 500; row++) {
    sheet.getCell(row, genderCol).dataValidation = { type: "list", formulae: ['"MALE,FEMALE"'], allowBlank: true };
    sheet.getCell(row, statusCol).dataValidation = {
      type: "list",
      formulae: ['"ACTIVE,INACTIVE,ON_LEAVE,TERMINATED"'],
      allowBlank: true,
    };
    if (branches.length) {
      sheet.getCell(row, branchCol).dataValidation = {
        type: "list",
        formulae: [`"${branches.map((b) => b.code).join(",")}"`],
        allowBlank: true,
      };
    }
  }

  const instructions = workbook.addWorksheet("Instructions");
  instructions.columns = [{ header: "Column", width: 24 }, { header: "Required", width: 12 }, { header: "Notes", width: 50 }];
  instructions.getRow(1).font = { bold: true };
  instructions.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F3A" } };
  instructions.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  for (const col of COLUMNS) {
    instructions.addRow([col.header, col.required ? "Yes" : "No", col.note ?? ""]);
  }
  instructions.addRow([]);
  instructions.addRow(["General instructions:"]);
  instructions.addRow(["1. Do not rename or reorder the column headers on the Employees sheet."]);
  instructions.addRow(["2. Delete the italic example row before importing your real data."]);
  instructions.addRow(["3. Dates must be in YYYY-MM-DD format (or a real Excel date cell)."]);
  instructions.addRow(["4. Employee Number must be unique — matching an existing number updates that employee."]);
  instructions.addRow(["5. Branch Code must match a code from Branches → All Branches."]);

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
