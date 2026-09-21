import ExcelJS from "exceljs";

export interface ColumnDef<T> {
  header: string;
  key: keyof T & string;
  width?: number;
  format?: (value: unknown, row: T) => string | number | Date | null;
}

/** Generic "rows -> professional .xlsx buffer" used by every module's Export
 * Excel button and by the Reports center (§27). Frozen header row + basic
 * styling; column-specific dropdowns/validation are added by callers that
 * need them (see importExport templates). */
export async function buildWorkbook<T extends Record<string, unknown>>(
  sheetName: string,
  columns: ColumnDef<T>[],
  rows: T[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SanaD Documents & Licenses Management System";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet(sheetName, { views: [{ state: "frozen", ySplit: 1, rightToLeft: false }] });
  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width ?? 22 }));

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1F3A" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  for (const row of rows) {
    const values: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = row[col.key];
      values[col.key] = col.format ? col.format(raw, row) : (raw as never);
    }
    sheet.addRow(values);
  }

  sheet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: columns.length } };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildCsv<T extends Record<string, unknown>>(columns: ColumnDef<T>[], rows: T[]): string {
  const header = columns.map((c) => csvEscape(c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(c.format ? c.format(row[c.key], row) : row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
}
