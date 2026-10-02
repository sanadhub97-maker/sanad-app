// Regenerate the public, fictional samples after building the server.
// Uses the production templates; never reads the database or company settings.
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://sample:sample@127.0.0.1:1/sample';
process.env.CLIENT_URL = 'https://example.invalid';
for (const key of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET', 'SETTINGS_ENCRYPTION_KEY']) process.env[key] = crypto.randomBytes(32).toString('base64');
const templates = require('../dist/modules/pdf/templates.js');
const { PRINT_THEME_IDS, getPrintTheme } = require('../dist/services/printThemes.js');
const output = path.resolve(__dirname, '../../client/public/print-samples');
(async () => {
  await fs.mkdir(output, { recursive: true });
  for (const theme of PRINT_THEME_IDS) {
    const branding = { company: { nameAr: 'شركة سند النموذجية', nameEn: 'Sanad Sample Company' }, logoDataUrl: null, printTheme: theme };
    const samples = {
      report: templates.tableReportPdf('تقرير متابعة الوثائق', [{ header: 'الاسم', render: r => r.name }, { header: 'الفرع', render: () => 'الرياض' }, { header: 'الحالة', render: () => 'سارية' }], Array.from({ length: 8 }, (_, i) => ({ name: 'موظف تجريبي ' + (i + 1) })), branding),
      employee: templates.employeeProfilePdf({ employeeNumber: 'EMP-DEMO', fullNameAr: 'أحمد عبدالله — بيانات تجريبية', fullNameEn: 'Sample Employee', nationality: 'مصري', jobTitle: 'أخصائي عمليات', department: 'العمليات', branch: { name: 'الرياض' }, mobile: null, email: 'sample@example.com', employmentStatus: 'ACTIVE', joiningDate: new Date('2024-01-01'), iqamaNumber: 'DEMO-108', iqamaExpiryDate: new Date('2027-01-01'), iqamaStatus: 'VALID', passportNumber: 'DEMO-P108', passportExpiryDate: new Date('2028-01-01'), passportStatus: 'VALID', documents: [] }, branding),
      payment: templates.paymentReceiptPdf({ paymentNumber: 'PAY-DEMO', paymentDate: new Date('2026-10-02'), category: 'OTHER', description: 'تأمين طبي — نموذج للمعاينة', amount: 12800, vat: 0, total: 12800, method: 'BANK_TRANSFER', paidBy: 'الإدارة', referenceNumber: 'DEMO-142', branch: { name: 'الرياض' }, employee: null, supplierName: 'شركة التأمين النموذجية' }, branding),
    };
    const margins = getPrintTheme(theme).margin;
    for (const [kind, original] of Object.entries(samples)) {
      // The PDF renderer supplies the vertical paper margins; emulate them on screen.
      const css = `<style>html{background:white}body{min-height:297mm;padding-top:${margins.top};padding-bottom:${margins.bottom}}@media print{@page{size:A4;margin:0}}</style>`;
      await fs.writeFile(path.join(output, `${theme}-${kind}.html`), original.replace('</head>', `${css}</head>`).replace(/[ \t]+$/gm, '').trimEnd() + '\n');
    }
  }
  console.log(`Generated ${PRINT_THEME_IDS.length * 3} fictional print samples.`);
})().catch(error => { console.error(error); process.exitCode = 1; });
