import { useTranslation } from "react-i18next";
import { tr } from "@/i18n";

interface PrintDocumentHeaderProps {
  title: string;
  subtitle?: string;
  referenceNumber?: string;
}

/**
 * 🖨️ Official Corporate Print Header
 * Automatically renders exclusively during paper printing (`@media print`).
 * Provides official letterhead, corporate branding, gold accent line, and metadata.
 */
export function PrintDocumentHeader({
  title,
  subtitle,
  referenceNumber,
}: PrintDocumentHeaderProps) {
  useTranslation(); // re-render on a language switch
  const now = new Date();
  const dateFormatted = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="print-only mb-6 w-full border-b-2 border-slate-900 pb-4">
      {/* 🌟 Royal Accent Bar */}
      <div
        className="mb-3 h-1 w-full rounded"
        style={{
          background: "linear-gradient(90deg, #0B1B3D 0%, #C59A45 50%, #0B1B3D 100%)",
        }}
      />

      <div className="flex items-center justify-between gap-4">
        {/* Company Identity */}
        <div>
          <h1 className="text-base font-black tracking-tight text-slate-900">
            {tr("منظومة سند لإدارة الموارد البشرية والامتثال", "SanaD HR & Compliance Platform")}
          </h1>
          <p className="text-[10px] font-semibold text-slate-500">
            SanaD Enterprise HR & Regulatory Compliance Platform
          </p>
          <div className="mt-1 inline-block rounded border border-slate-300 bg-slate-100 px-2 py-0.5 text-[9px] font-bold text-slate-700">
            {tr("وثيقة إدارية رسمية معتمدة", "Official administrative document")}
          </div>
        </div>

        {/* Document Title & Reference Metadata */}
        <div className="text-end">
          <h2 className="text-lg font-black text-slate-900">{title}</h2>
          {subtitle && <p className="text-xs text-slate-600 font-medium">{subtitle}</p>}
          {referenceNumber && (
            <p className="mt-1 font-mono text-xs font-bold text-sky-700">
              REF: {referenceNumber}
            </p>
          )}
          <p className="text-[10px] text-slate-500 font-medium">
            {tr("تاريخ الطباعة:", "Printed:")} {dateFormatted}
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * 🖨️ Official Corporate Print Signatures & Stamp Block
 */
export function PrintDocumentFooter({
  prepTitle,
  authTitle,
}: {
  prepTitle?: string;
  authTitle?: string;
}) {
  useTranslation(); // re-render on a language switch
  prepTitle ??= tr("إعداد وتدقيق", "Prepared & reviewed by");
  authTitle ??= tr("الاعتماد العام والإداري", "Approved by");
  return (
    <div className="print-only mt-8 w-full border-t border-slate-300 pt-4">
      <div className="flex items-center justify-between text-[10px] text-slate-500 mb-6">
        <span>🔒 {tr("وثيقة سرية ورسمية صالحة للأرشفة والتدقيق الحكومي", "Confidential official document")}</span>
        <span>{tr("منظومة سند السحابية المعتمدة", "SanaD Cloud Platform")}</span>
      </div>

      <div className="flex items-stretch justify-between gap-4">
        {/* Prepared By Box */}
        <div className="flex-1 rounded-lg border border-slate-300 p-2 text-center">
          <p className="text-[11px] font-bold text-slate-900">{prepTitle}</p>
          <div className="mt-8 border-t border-dashed border-slate-400 pt-1 text-[9px] text-slate-500">
            {tr("الاسم والتوقيع:", "Name & signature:")} _______________________
          </div>
        </div>

        {/* Circular Stamp Box */}
        <div className="flex w-28 items-center justify-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-slate-400 text-center text-[9px] font-bold text-slate-400">
            {tr("الختم الرسمي", "Official stamp")}
          </div>
        </div>

        {/* Authorized Approval Box */}
        <div className="flex-1 rounded-lg border border-slate-300 p-2 text-center">
          <p className="text-[11px] font-bold text-slate-900">{authTitle}</p>
          <div className="mt-8 border-t border-dashed border-slate-400 pt-1 text-[9px] text-slate-500">
            {tr("الاعتماد والختم:", "Approval & stamp:")} _______________________
          </div>
        </div>
      </div>
    </div>
  );
}
