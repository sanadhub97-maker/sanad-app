import ExcelJS from "exceljs";

export interface ColumnDef<T> {
  header: string;
  subHeader?: string;
  key: keyof T & string;
  width?: number;
  format?: (value: unknown, row: T) => string | number | Date | null;
}

export interface WorkbookOptions {
  title?: string;
  subtitle?: string;
  companyName?: string;
}

/**
 * 👑 Executive Luxury Excel Workbook Generator
 * Generates corporate-grade .xlsx workbooks with:
 * - Sovereign Gold & Royal Navy branded executive header block
 * - Live metadata badge & total record count
 * - Auto-fitted column widths ensuring Arabic & English labels are never clipped
 * - Status pills with chromatic highlights (Emerald, Amber, Rose)
 * - Number, currency & date formatting
 * - Frozen header pane for seamless scrolling
 * - Classical accounting double-border summary footer
 */
export async function buildWorkbook<T extends Record<string, unknown>>(
  sheetName: string,
  columns: ColumnDef<T>[],
  rows: T[],
  options: WorkbookOptions = {}
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SanaD Enterprise HR & Compliance Suite";
  workbook.lastModifiedBy = "SanaD Automated Reporting System";
  workbook.created = new Date();
  workbook.modified = new Date();

  const totalCols = Math.max(columns.length, 1);
  const now = new Date();
  const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const reportTitle = options.title || sheetName;
  const companyTitle = options.companyName || "منظومة سند للحلول الرقمية وإدارة الموارد البشرية | SanaD Enterprise";

  // Create worksheet with RTL enabled and frozen pane below header row (row 4)
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: "frozen", ySplit: 4, rightToLeft: true }],
    pageSetup: { paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
  });

  // Track max string length per column for intelligent auto-width calculation
  const colLengths: number[] = columns.map((c) => {
    const fullHeader = c.subHeader ? `${c.header} (${c.subHeader})` : c.header;
    return Math.max(fullHeader.length, 10);
  });

  // 👑 Row 1: Royal Navy Corporate Title Banner
  sheet.mergeCells(1, 1, 1, totalCols);
  const titleRow = sheet.getRow(1);
  titleRow.height = 38;
  const titleCell = sheet.getCell(1, 1);
  titleCell.value = `🏛️  ${companyTitle}  —  ${reportTitle}`;
  titleCell.font = { name: "Cairo", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0B1B3D" } };
  titleCell.alignment = { vertical: "middle", horizontal: "center" };

  // 🌟 Row 2: Sovereign Gold Accent Stripe
  sheet.mergeCells(2, 1, 2, totalCols);
  const accentRow = sheet.getRow(2);
  accentRow.height = 4.5;
  const accentCell = sheet.getCell(2, 1);
  accentCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC59A45" } };

  // 📋 Row 3: Metadata & Executive Stats Banner
  sheet.mergeCells(3, 1, 3, totalCols);
  const metaRow = sheet.getRow(3);
  metaRow.height = 24;
  const metaCell = sheet.getCell(3, 1);
  metaCell.value = `📅 تاريخ التصدير: ${formattedDate}   |   📊 إجمالي السجلات: ${rows.length} سجل   |   🔒 وثيقة رسمية معتمدة صالحة للأرشفة والتدقيق`;
  metaCell.font = { name: "Cairo", size: 9.5, bold: true, color: { argb: "FF334155" } };
  metaCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  metaCell.alignment = { vertical: "middle", horizontal: "center" };
  metaCell.border = { bottom: { style: "medium", color: { argb: "FFCBD5E1" } } };

  // 🏷️ Row 4: Column Headers
  const headerRow = sheet.getRow(4);
  headerRow.height = 32;
  headerRow.font = { name: "Cairo", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };
  headerRow.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

  columns.forEach((col, idx) => {
    const colNumber = idx + 1;
    const cell = sheet.getCell(4, colNumber);
    cell.value = col.subHeader ? `${col.header} (${col.subHeader})` : col.header;
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "33FFFFFF" } },
      right: { style: "thin", color: { argb: "33FFFFFF" } },
    };
  });

  // 📝 Rows 5+: Data Rows with Zebra Striping & Status Highlighting
  rows.forEach((row, rIdx) => {
    const rowIndex = 5 + rIdx;
    const dataRow = sheet.getRow(rowIndex);
    dataRow.height = 25;

    const isEven = rIdx % 2 === 0;
    const baseBg = isEven ? "FFFFFFFF" : "FFF8FAFC";

    columns.forEach((col, cIdx) => {
      const colNumber = cIdx + 1;
      const cell = sheet.getCell(rowIndex, colNumber);

      const raw = row[col.key];
      const val = col.format ? col.format(raw, row) : raw;
      cell.value = val as never;

      // Track width
      const strVal = val != null ? String(val) : "";
      if (strVal.length > colLengths[cIdx]) {
        colLengths[cIdx] = Math.min(strVal.length, 50);
      }

      // Default font & borders
      cell.font = { name: "Cairo", size: 9.5, color: { argb: "FF0F172A" } };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      // Intelligent Content Styling
      const upperStr = strVal.trim().toUpperCase();
      const isDate = val instanceof Date || /^\d{4}-\d{2}-\d{2}/.test(strVal);
      const isCode = /^[A-Z0-9_-]{3,}$/.test(strVal);
      const isPhone = /^\+?[0-9\s-]{8,}$/.test(strVal);
      const isNumber = typeof val === "number";

      // Status Pill Detection
      if (["VALID", "ACTIVE", "سارية", "نشط", "مفعل", "COMPLETED", "APPROVED"].includes(upperStr)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE6F7ED" } };
        cell.font = { name: "Cairo", size: 9.5, bold: true, color: { argb: "FF047857" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (["EXPIRING_SOON", "توشك على الانتهاء", "ON_LEAVE", "PENDING", "قيد المراجعة"].includes(upperStr)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFEF3C7" } };
        cell.font = { name: "Cairo", size: 9.5, bold: true, color: { argb: "FFB45309" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else if (["EXPIRED", "منتهية", "TERMINATED", "معطل", "INACTIVE", "REJECTED"].includes(upperStr)) {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE4E6" } };
        cell.font = { name: "Cairo", size: 9.5, bold: true, color: { argb: "FFBE123C" } };
        cell.alignment = { vertical: "middle", horizontal: "center" };
      } else {
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: baseBg } };

        if (isDate || isCode || isPhone) {
          cell.alignment = { vertical: "middle", horizontal: "center" };
        } else if (isNumber) {
          cell.alignment = { vertical: "middle", horizontal: "right" };
          cell.numFmt = "#,##0.00";
        } else {
          cell.alignment = { vertical: "middle", horizontal: "right" };
        }
      }
    });
  });

  // 🏁 Summary / Totals Footer Row
  const footerRowIndex = 5 + rows.length;
  const footerRow = sheet.getRow(footerRowIndex);
  footerRow.height = 28;
  sheet.mergeCells(footerRowIndex, 1, footerRowIndex, totalCols);
  const footerCell = sheet.getCell(footerRowIndex, 1);
  footerCell.value = `✓ انتهى التقرير  —  إجمالي عدد السجلات المطابقة: ${rows.length} سجل  |  تم الإنشاء عبر نظام سند السحابي`;
  footerCell.font = { name: "Cairo", size: 9.5, bold: true, color: { argb: "FF475569" } };
  footerCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
  footerCell.alignment = { vertical: "middle", horizontal: "center" };
  footerCell.border = {
    top: { style: "thin", color: { argb: "FF94A3B8" } },
    bottom: { style: "double", color: { argb: "FF0F172A" } },
  };

  // Set intelligent column widths
  columns.forEach((col, idx) => {
    const colNumber = idx + 1;
    const maxLen = colLengths[idx] || 12;
    const calculatedWidth = Math.max(maxLen + 5, col.width ?? 18);
    sheet.getColumn(colNumber).width = Math.min(calculatedWidth, 48);
  });

  // Enable AutoFilter on header row
  sheet.autoFilter = {
    from: { row: 4, column: 1 },
    to: { row: 4, column: totalCols },
  };

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = value instanceof Date ? value.toISOString() : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function buildCsv<T extends Record<string, unknown>>(columns: ColumnDef<T>[], rows: T[]): string {
  const header = columns.map((c) => csvEscape(c.subHeader ? `${c.header} (${c.subHeader})` : c.header)).join(",");
  const lines = rows.map((row) =>
    columns.map((c) => csvEscape(c.format ? c.format(row[c.key], row) : row[c.key])).join(",")
  );
  return [header, ...lines].join("\n");
}
