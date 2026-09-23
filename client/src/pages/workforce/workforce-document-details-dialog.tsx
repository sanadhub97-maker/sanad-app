import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  FileText,
  Building,
  Download,
  ExternalLink,
  Edit,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Copy,
  Paperclip,
  User,
  CreditCard,
  BookUser,
  HeartPulse,
  ShieldPlus,
  Stamp,
  Plane,
} from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppleIcon, type AppleTone } from "@/components/common/apple-icon";
import { StatusBadge } from "@/components/common/status-badge";
import { filesApi } from "@/api/files";
import { formatDate, daysUntil } from "@/lib/utils";
import type { WorkforceDocumentItem } from "@/api/workforceDocuments";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: WorkforceDocumentItem | null;
  onEdit?: (document: WorkforceDocumentItem) => void;
}

const CATEGORY_META: Record<string, { labelAr: string; labelEn: string; icon: any; tone: AppleTone }> = {
  IQAMA: { labelAr: "هوية مقيم / إقامة", labelEn: "Iqama", icon: CreditCard, tone: "blue" },
  PASSPORT: { labelAr: "جواز سفر", labelEn: "Passport", icon: BookUser, tone: "purple" },
  HEALTH_CERTIFICATE: { labelAr: "شهادة صحية", labelEn: "Health Certificate", icon: HeartPulse, tone: "emerald" },
  MEDICAL_INSURANCE: { labelAr: "تأمين طبي", labelEn: "Medical Insurance", icon: ShieldPlus, tone: "cyan" },
  VISA: { labelAr: "تأشيرة", labelEn: "Visa", icon: Stamp, tone: "amber" },
  EXIT_REENTRY_VISA: { labelAr: "تأشيرة خروج وعودة", labelEn: "Exit/Re-entry Visa", icon: Stamp, tone: "amber" },
  FINAL_EXIT_VISA: { labelAr: "تأشيرة خروج نهائي", labelEn: "Final Exit Visa", icon: Stamp, tone: "amber" },
  FLIGHT_TICKET: { labelAr: "تذكرة طيران", labelEn: "Flight Ticket", icon: Plane, tone: "rose" },
};

export function WorkforceDocumentDetailsDialog({ open, onOpenChange, document, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";

  if (!document) return null;

  const rawType = (document.type || (document.iqamaNumber ? "IQAMA" : "PASSPORT")).toUpperCase();
  const meta = CATEGORY_META[rawType] || {
    labelAr: document.name || "وثيقة موظف",
    labelEn: document.name || "Employee Document",
    icon: FileText,
    tone: "blue" as AppleTone,
  };

  const Icon = meta.icon;
  const days = document.expiryDate ? daysUntil(document.expiryDate) : null;
  const docNumber = document.documentNumber || document.iqamaNumber || document.passportNumber;
  const authority = document.issuingAuthority || document.passportCountry;
  const empNameAr = document.fullNameAr || document.employee?.fullNameAr || "—";
  const empNameEn = document.fullNameEn || document.employee?.fullNameEn;
  const empNumber = document.employeeNumber || document.employee?.employeeNumber;
  const empId = document.employeeId || document.employee?.id || document.id;
  const branchName = document.branch?.name || document.employee?.branch?.name;

  function copyText(text?: string | null) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(isAr ? "تم النسخ للحافظة" : "Copied to clipboard");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[92vh] overflow-y-auto border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-3xl p-6">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center gap-3">
            <AppleIcon icon={Icon} tone={meta.tone} size="md" />
            <div className="min-w-0 flex-1">
              <DialogTitle className="text-xl font-bold tracking-tight text-foreground truncate">
                {document.name || (isAr ? meta.labelAr : meta.labelEn)}
              </DialogTitle>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-lg bg-muted text-muted-foreground border border-border/60">
                  {isAr ? meta.labelAr : meta.labelEn}
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
              className={`flex items-center justify-between p-3.5 rounded-2xl border text-xs font-semibold backdrop-blur-md ${
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
              <span className="font-mono font-bold text-xs">
                {formatDate(document.expiryDate)}
              </span>
            </div>
          )}

          {/* Employee Info Card */}
          <div className="rounded-2xl border border-border/70 bg-card/60 p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-primary" />
                {isAr ? "بيانات الموظف" : "Employee Details"}
              </span>
              <Link
                to={`/employees/${empId}`}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1"
                onClick={() => onOpenChange(false)}
              >
                <span>{isAr ? "الملف الشخصي" : "Full Profile"}</span>
                <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 border border-primary/20 text-sm font-bold text-primary">
                {empNameAr.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-foreground truncate">{empNameAr}</span>
                  {empNumber && (
                    <span className="font-mono text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/50">
                      #{empNumber}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground flex items-center gap-3 mt-1">
                  {empNameEn && <span>{empNameEn}</span>}
                  {branchName && (
                    <span className="flex items-center gap-1">
                      <Building className="h-3 w-3" /> {branchName}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Document Properties Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Document Number */}
            {docNumber && (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
                <span className="text-xs font-medium text-muted-foreground block mb-1">
                  {isAr ? "رقم الوثيقة / الهوية" : "Document Number"}
                </span>
                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-sm text-foreground tracking-wide">
                    {docNumber}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyText(docNumber)}
                    className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                    title={isAr ? "نسخ الرقم" : "Copy"}
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Issuing Authority / Country */}
            {authority && (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
                <span className="text-xs font-medium text-muted-foreground block mb-1">
                  {isAr ? "الجهة المصدرة / الدولة" : "Issuing Authority / Country"}
                </span>
                <span className="font-semibold text-sm text-foreground">
                  {authority}
                </span>
              </div>
            )}

            {/* Issue Date */}
            {document.issueDate && (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
                <span className="text-xs font-medium text-muted-foreground block mb-1">
                  {isAr ? "تاريخ الإصدار" : "Issue Date"}
                </span>
                <span className="font-mono font-bold text-sm text-foreground">
                  {formatDate(document.issueDate)}
                </span>
              </div>
            )}

            {/* Expiry Date */}
            {document.expiryDate && (
              <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
                <span className="text-xs font-medium text-muted-foreground block mb-1">
                  {isAr ? "تاريخ الانتهاء" : "Expiry Date"}
                </span>
                <span className="font-mono font-bold text-sm text-foreground">
                  {formatDate(document.expiryDate)}
                </span>
              </div>
            )}
          </div>

          {/* Notes */}
          {document.notes && (
            <div className="rounded-2xl border border-border/70 bg-card/60 p-3.5">
              <span className="text-xs font-medium text-muted-foreground block mb-1">
                {isAr ? "الملاحظات" : "Notes"}
              </span>
              <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                {document.notes}
              </p>
            </div>
          )}

          {/* Attachment Preview / Download */}
          {document.fileId && (
            <div className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 p-3.5">
              <div className="flex items-center gap-2.5">
                <Paperclip className="h-4 w-4 text-primary" />
                <div>
                  <span className="text-xs font-bold text-foreground block">
                    {isAr ? "الملف المرفق متوفر" : "Attached File Available"}
                  </span>
                  <span className="text-[11px] text-muted-foreground">
                    {isAr ? "يمكنك تنزيل الوثيقة للاطلاع عليها" : "Download document copy"}
                  </span>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 rounded-xl border-primary/30 hover:bg-primary hover:text-primary-foreground text-xs"
                onClick={() => filesApi.download(document.fileId!, `${docNumber || "document"}.pdf`)}
              >
                <Download className="h-3.5 w-3.5" />
                {isAr ? "تنزيل المرفق" : "Download"}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 flex items-center justify-between sm:justify-between">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel", { defaultValue: "إغلاق" })}
          </Button>

          {onEdit && (
            <Button
              onClick={() => {
                onOpenChange(false);
                onEdit(document);
              }}
              className="gap-2 shadow-sm rounded-xl"
            >
              <Edit className="h-4 w-4" />
              {isAr ? "تعديل الوثيقة" : "Edit Document"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
