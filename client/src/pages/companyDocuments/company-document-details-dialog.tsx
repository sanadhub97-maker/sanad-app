import { useTranslation } from "react-i18next";
import {
  FileText,
  Calendar,
  Building,
  Hash,
  Download,
  ExternalLink,
  Edit,
  Clock,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Copy,
  Paperclip,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppleIcon } from "@/components/common/apple-icon";
import { StatusBadge } from "@/components/common/status-badge";
import { filesApi } from "@/api/files";
import { formatDate, daysUntil } from "@/lib/utils";
import { COMPANY_DOCUMENT_CATEGORY_ICONS } from "@/lib/document-type-icons";
import type { CompanyDocument } from "@/types/models";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: CompanyDocument | null;
  onEdit?: (document: CompanyDocument) => void;
}

export function CompanyDocumentDetailsDialog({ open, onOpenChange, document, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  if (!document) return null;

  const Icon = COMPANY_DOCUMENT_CATEGORY_ICONS[document.category] ?? FileText;
  const days = document.expiryDate ? daysUntil(document.expiryDate) : null;

  function copyText(text?: string | null) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ للحافظة" : "Copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl md:max-w-3xl max-h-[92vh] overflow-y-auto border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-3xl p-6">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <AppleIcon icon={Icon} tone="blue" size="md" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                {document.name}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border/60">
                  {t(`documentCategories.${document.category}`)}
                </span>
                <StatusBadge status={document.status} />
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Expiration Countdown Banner */}
          {days !== null && (
            <div
              className={`flex items-center justify-between p-3 rounded-2xl border text-xs font-semibold backdrop-blur-md ${
                days < 0
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300"
                  : days === 0
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-700 dark:text-rose-300 animate-pulse"
                  : days <= 30
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <div className="flex items-center gap-2">
                {days <= 0 ? (
                  <AlertOctagon className="h-4 w-4 shrink-0" />
                ) : days <= 30 ? (
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                )}
                <span>
                  {days < 0
                    ? isAr
                      ? `هذه الوثيقة منتهية الصلاحية منذ ${Math.abs(days)} يوم`
                      : `This document expired ${Math.abs(days)} days ago`
                    : days === 0
                    ? isAr
                      ? "تنتهي صلاحية هذه الوثيقة اليوم!"
                      : "This document expires today!"
                    : isAr
                    ? `متبقي على انتهاء الصلاحية ${days} يوم`
                    : `${days} days remaining until expiration`}
                </span>
              </div>
              <span className="font-mono text-[11px] font-bold">
                {formatDate(document.expiryDate)}
              </span>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Document Number */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Hash className="h-3.5 w-3.5 text-primary" />
                  {t("companyDocuments.fields.documentNumber")}
                </span>
                {document.documentNumber && (
                  <button
                    type="button"
                    onClick={() => copyText(document.documentNumber)}
                    className="text-muted-foreground hover:text-foreground p-0.5"
                    title={isAr ? "نسخ الرقم" : "Copy"}
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="font-mono text-sm font-bold text-foreground">
                {document.documentNumber || "—"}
              </p>
            </div>

            {/* Issuing Authority */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-muted-foreground" />
                {t("companyDocuments.fields.issuingAuthority")}
              </span>
              <p className="text-sm font-semibold text-foreground truncate">
                {document.issuingAuthority || "—"}
              </p>
            </div>

            {/* Branch / Establishment */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Building className="h-3.5 w-3.5 text-indigo-500" />
                {t("companyDocuments.fields.branch")}
              </span>
              <p className="text-sm font-semibold text-foreground truncate">
                {document.branch?.name || "—"}
              </p>
            </div>

            {/* Expiry Date */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-amber-500" />
                {t("companyDocuments.fields.expiryDate")}
              </span>
              <p className="font-mono text-sm font-bold text-foreground">
                {formatDate(document.expiryDate)}
              </p>
            </div>

            {/* Issue Date */}
            {document.issueDate && (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("companyDocuments.fields.issueDate")}
                </span>
                <p className="font-mono text-xs font-semibold text-foreground">
                  {formatDate(document.issueDate)}
                </p>
              </div>
            )}

            {/* Start Date */}
            {document.startDate && (
              <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
                <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  {t("companyDocuments.fields.startDate")}
                </span>
                <p className="font-mono text-xs font-semibold text-foreground">
                  {formatDate(document.startDate)}
                </p>
              </div>
            )}
          </div>

          {/* Attached File Card */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5 space-y-2">
            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
              <Paperclip className="h-3.5 w-3.5 text-primary" />
              {isAr ? "الملف والمستند المرفق" : "Attached Document File"}
            </span>

            {document.fileId ? (
              <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-background/80 border border-border/60">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <FileText className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">
                      {document.name}.pdf
                    </p>
                    <span className="text-[10px] text-muted-foreground">
                      {isAr ? "ملف وثيقة رسمي" : "Official document file"}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 rounded-xl text-xs gap-1"
                    onClick={() => filesApi.openInNewTab(document.fileId!)}
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    {isAr ? "معاينة" : "Preview"}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-8 rounded-xl text-xs gap-1"
                    onClick={() => filesApi.download(document.fileId!, `${document.name}.pdf`)}
                  >
                    <Download className="h-3.5 w-3.5" />
                    {isAr ? "تنزيل" : "Download"}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-1 px-1">
                {isAr ? "لم يتم إرفاق ملف لهذه الوثيقة." : "No file attached to this document."}
              </p>
            )}
          </div>

          {/* Notes */}
          {document.notes && (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <span className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                {t("companyDocuments.fields.notes")}
              </span>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {document.notes}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 gap-2">
          {onEdit && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onEdit(document);
              }}
              className="rounded-xl gap-1.5 font-semibold"
            >
              <Edit className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          )}

          <Button
            onClick={() => onOpenChange(false)}
            className="rounded-xl font-semibold"
          >
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

