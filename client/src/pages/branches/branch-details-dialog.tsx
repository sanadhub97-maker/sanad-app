import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  Building2,
  MapPin,
  Phone,
  Mail,
  Users,
  Calendar,
  FileText,
  Edit,
  ExternalLink,
} from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AppleIcon } from "@/components/common/apple-icon";
import { EmploymentStatusBadge } from "@/components/common/status-badge";
import { formatDate } from "@/lib/utils";
import type { Branch } from "@/types/models";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branch: Branch | null;
  onEdit?: (branch: Branch) => void;
}

export function BranchDetailsDialog({ open, onOpenChange, branch, onEdit }: Props) {
  const { t, i18n } = useTranslation();
  const isAr = i18n.language === "ar";
  const navigate = useNavigate();

  if (!branch) return null;

  const empCount = branch._count?.employees ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl border-border/80 bg-background/95 backdrop-blur-2xl shadow-2xl rounded-3xl p-6">
        <DialogHeader className="border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AppleIcon icon={Building2} tone="indigo" size="md" />
              <div>
                <DialogTitle className="text-xl font-bold tracking-tight text-foreground">
                  {branch.name}
                </DialogTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-muted text-foreground border border-border/60">
                    {branch.code}
                  </span>
                  <EmploymentStatusBadge status={branch.status} />
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Quick Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* City */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-primary" />
                <span>{t("branches.fields.city")}</span>
              </div>
              <p className="text-sm font-semibold text-foreground">
                {branch.city || "—"}
              </p>
            </div>

            {/* Total Employees */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-indigo-500" />
                  <span>{t("branches.table.employees")}</span>
                </div>
                {empCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      onOpenChange(false);
                      navigate(`/employees?branchId=${branch.id}`);
                    }}
                    className="text-[11px] text-primary hover:underline font-semibold flex items-center gap-0.5"
                  >
                    {isAr ? "عرض القائمة" : "View list"}
                    <ExternalLink className="h-3 w-3" />
                  </button>
                )}
              </div>
              <p className="text-sm font-black font-mono text-foreground">
                {empCount} {isAr ? "موظف مسجل" : "employees"}
              </p>
            </div>

            {/* Phone */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Phone className="h-3.5 w-3.5 text-emerald-500" />
                <span>{t("branches.fields.phone")}</span>
              </div>
              {branch.phone ? (
                <a
                  href={`tel:${branch.phone}`}
                  className="text-sm font-mono font-semibold text-foreground hover:text-primary transition-colors block"
                  dir="ltr"
                >
                  {branch.phone}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>

            {/* Email */}
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Mail className="h-3.5 w-3.5 text-blue-500" />
                <span>{t("branches.fields.email")}</span>
              </div>
              {branch.email ? (
                <a
                  href={`mailto:${branch.email}`}
                  className="text-sm font-semibold text-foreground hover:text-primary transition-colors truncate block"
                >
                  {branch.email}
                </a>
              ) : (
                <p className="text-sm text-muted-foreground">—</p>
              )}
            </div>
          </div>

          {/* Detailed Address */}
          {branch.address && (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t("branches.fields.address")}</span>
              </div>
              <p className="text-xs font-medium text-foreground leading-relaxed">
                {branch.address}
              </p>
            </div>
          )}

          {/* Notes */}
          {branch.notes && (
            <div className="rounded-2xl border border-border/60 bg-card/50 p-3.5 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{t("branches.fields.notes")}</span>
              </div>
              <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed">
                {branch.notes}
              </p>
            </div>
          )}

          {/* Metadata */}
          {branch.createdAt && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground px-1 pt-1">
              <span className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                {isAr ? "تاريخ التسجيل في النظام:" : "Created At:"}
              </span>
              <span className="font-mono">{formatDate(branch.createdAt)}</span>
            </div>
          )}
        </div>

        <DialogFooter className="border-t border-border/50 pt-4 gap-2">
          {onEdit && (
            <Button
              variant="outline"
              onClick={() => {
                onOpenChange(false);
                onEdit(branch);
              }}
              className="rounded-xl gap-1.5"
            >
              <Edit className="h-4 w-4" />
              {t("common.edit")}
            </Button>
          )}

          {empCount > 0 && (
            <Button
              variant="secondary"
              onClick={() => {
                onOpenChange(false);
                navigate(`/employees?branchId=${branch.id}`);
              }}
              className="rounded-xl gap-1.5"
            >
              <Users className="h-4 w-4" />
              {isAr ? "عرض موظفي المنشأة" : "View Employees"}
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
