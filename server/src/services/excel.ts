import ExcelJS from "exceljs";

export interface ColumnDef<T> {
  header: string;
  key: keyof T & string;
  width?: number;
  format?: (value: unknown, row: T) => string | number | Date | null;
}

/** Generic "rows -> professional .xlsx buffer" used by every module's Export
 * Excel button and by the Reports center (§27). Frozen header row + executive
 * styling; column-specific dropdowns/validation are added by callers that
 * need them (see importExport templates). */
export async function buildWorkbook<T extends Record<string, unknown>>(
  sheetName: string,
  columns: ColumnDef<T>[],
  rows: T[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SanaD Enterprise HR & Compliance Suite";
  workbook.created = new Date();

  // RTL Sheet View with frozen header row
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ state: "frozen", ySplit: 1, rightToLeft: true }],
  });

  sheet.columns = columns.map((c) => ({
    header: c.header,
    key: c.key,
    width: c.width ?? 22,
  }));

  // Style Header Row (Row 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = 34;
  headerRow.font = { name: "Cairo", size: 10.5, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  for (let c = 1; c <= columns.length; c++) {
    const cell = sheet.getCell(1, c);
    cell.border = {
      top: { style: "medium", color: { argb: "FF0B1324" } },
      bottom: { style: "medium", color: { argb: "FF0B1324" } },
      left: { style: "thin", color: { argb: "33FFFFFF" } },
      right: { style: "thin", color: { argb: "33FFFFFF" } },
    };
  }

  // Populate Data Rows with Zebra Striping & Borders
  rows.forEach((row, rIdx) => {
    const values: Record<string, unknown> = {};
    for (const col of columns) {
      const raw = row[col.key];
      values[col.key] = col.format ? col.format(raw, row) : (raw as never);
    }
    const addedRow = sheet.addRow(values);
    addedRow.height = 24;

    const isEven = rIdx % 2 === 0;
    const bgArgb = isEven ? "FFFFFFFF" : "FFF8FAFC";

    for (let c = 1; c <= columns.length; c++) {
      const cell = addedRow.getCell(c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      cell.font = { name: "Cairo", size: 9.5, color: { argb: "FF0F172A" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      const val = cell.value;
      const isDate = val instanceof Date || (typeof val === "string" && /^\d{4}-\d{2}-\d{2}/.test(val));
      const isNum = typeof val === "number" || (typeof val === "string" && /^[A-Z0-9_-]+$/.test(val));
      cell.alignment = {
        vertical: "middle",
        horizontal: isDate || isNum ? "center" : "right",
      };
    }
  });

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
