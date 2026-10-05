import { expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildWorkbook } from "@/services/excel";
it("exports real readable Excel even when the report title contains worksheet forbidden characters", async () => {
  const buffer = await buildWorkbook("Owner / [Branch]: Q3?*", [{header:"المالك", key:"owner"}], [{owner:"مالك تجريبي"}], {title:"Owner / [Branch]: Q3?*"});
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  expect(workbook.worksheets).toHaveLength(1);
  expect(workbook.worksheets[0].name).not.toMatch(/[\\/?*\[\]:]/);
  expect(workbook.worksheets[0].getCell(5,1).value).toBe("مالك تجريبي");
});
