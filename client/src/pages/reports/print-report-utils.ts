export async function collectReportPages<T>(fetchPage: (page: number) => Promise<{ data: T[]; meta: { totalPages: number; total: number } }>): Promise<T[]> {
  const rows: T[] = [];
  for (let page = 1; page <= 1000; page++) {
    const result = await fetchPage(page);
    rows.push(...result.data);
    if (page >= result.meta.totalPages) {
      if (rows.length !== result.meta.total) throw new Error("Report records changed during loading. Refresh the report.");
      return rows;
    }
  }
  throw new Error("Report exceeds 100,000 records. Narrow the filters.");
}
export const escapeReportText = (value: unknown) => String(value ?? "").replace(/[&<>"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]!));
export function buildReportDocument(input: { title: string; subtitle: string; headers: string[]; rows: string[][]; total: string; isAr: boolean }) {
  const e = escapeReportText;
  return `<!doctype html><html lang="${input.isAr ? "ar" : "en"}" dir="${input.isAr ? "rtl" : "ltr"}"><meta charset="utf-8"><title>${e(input.title)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;500;600;700&family=Alexandria:wght@500;600;700&display=swap"><style>@page{size:A4 landscape;margin:12mm}*{box-sizing:border-box}body{margin:0;padding:24px;color:#203451;background:white;font:13px "IBM Plex Sans Arabic",sans-serif}header{border-bottom:3px solid #243c64;padding-bottom:15px}h1{font-size:23px;font-family:Alexandria,"IBM Plex Sans Arabic",sans-serif}.metrics{padding:16px;background:#f4f6fa;margin:20px 0}table{width:100%;border-collapse:collapse;table-layout:fixed}td,th{padding:10px;border-bottom:1px solid #dce3ed;text-align:inherit;overflow-wrap:anywhere}th{background:#edf1f7}tbody tr:nth-child(even){background:#f8fafc}thead{display:table-header-group}tr{break-inside:avoid}footer{margin-top:20px;border-top:1px solid #dde3eb;padding-top:12px;color:#6b778c}@media print{body{padding:0}}</style><header><b>${input.isAr ? "سَنَد · التقارير" : "Sanad · Reports"}</b><h1>${e(input.title)}</h1><p>${e(input.subtitle)}</p></header><div class="metrics">${input.isAr ? "عدد السجلات" : "Records"}: ${input.rows.length} · ${input.isAr ? "إجمالي مبالغ السجلات" : "Total record amounts"}: ${e(input.total)}</div><table><thead><tr>${input.headers.map(h => `<th>${e(h)}</th>`).join("")}</tr></thead><tbody>${input.rows.length ? input.rows.map(row => `<tr>${row.map(cell => `<td>${e(cell)}</td>`).join("")}</tr>`).join("") : `<tr><td colspan="${input.headers.length}">${input.isAr ? "لا توجد سجلات مطابقة للفلاتر" : "No matching records"}</td></tr>`}</tbody></table><footer>${input.isAr ? "تقرير داخلي من سجلات النظام — لا يمثل تقديم إقرار إلى الهيئة. إجمالي التقرير لا يُعد بالضرورة رصيدًا مستحقًا." : "Internal report from application records, not a filing to the authority. The report total is not necessarily an outstanding balance."}</footer></html>`;
}
