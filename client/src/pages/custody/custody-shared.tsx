import type { CSSProperties, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import { tr } from "@/i18n";
import { listActiveBranches } from "@/api/branches";
import { employeesApi } from "@/api/employees";
import type { CustodyEmployee } from "@/api/custody";
import { BranchMedal } from "@/pages/branches/branch-logo";
import "@/styles/custody.css";

/* The pieces both custody pages share, in the approved royal look. */

export const todayRiyadh = () => new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
export const dmy = (v?: string | null) => (v ? v.slice(0, 10).split("-").reverse().join("/") : "—");
export const money = (n: number) => Number(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const empName = (e?: { fullNameAr: string; fullNameEn?: string | null } | null) => (e ? tr(e.fullNameAr, e.fullNameEn || e.fullNameAr) : "—");
export const branchName = (b?: { name: string; nameEn?: string | null } | null) => (b ? tr(b.name, b.nameEn || b.name) : "");

export function CuHero({ icon: Icon, eyebrow, title, sub, actions }: { icon: LucideIcon; eyebrow: string; title: string; sub: string; actions?: ReactNode }) {
  return (
    <header className="cu-hero">
      <span className="icon"><Icon /></span>
      <div className="tt">
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="cu-foil">{title}</h1>
        <p>{sub}</p>
      </div>
      {actions && <div className="acts">{actions}</div>}
      <span className="fl" />
    </header>
  );
}

export function CuKpis({ items }: { items: { label: string; value: ReactNode; sub?: ReactNode; color?: string; onClick?: () => void; active?: boolean }[] }) {
  return (
    <div className="cu-kpis">
      {items.map((k) =>
        k.onClick ? (
          <button key={k.label} type="button" className="cu-kpi" style={k.color ? ({ "--c": k.color } as CSSProperties) : undefined} onClick={k.onClick} aria-pressed={k.active}>
            <span>{k.label}</span>
            <b>{k.value}</b>
            {k.sub && <small>{k.sub}</small>}
          </button>
        ) : (
          <div key={k.label} className="cu-kpi" style={k.color ? ({ "--c": k.color } as CSSProperties) : undefined}>
            <span>{k.label}</span>
            <b>{k.value}</b>
            {k.sub && <small>{k.sub}</small>}
          </div>
        )
      )}
    </div>
  );
}

export function CuSeg<T extends string>({ items, value, onChange }: { items: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="cu-seg" role="group">
      {items.map((i) => (
        <button key={i.value} type="button" aria-pressed={value === i.value} onClick={() => onChange(i.value)}>
          {i.label}
        </button>
      ))}
    </div>
  );
}

export function CuPill({ color, children }: { color: string; children: ReactNode }) {
  return <span className="cu-pill" style={{ "--c": color } as CSSProperties}>{children}</span>;
}

/** Employees for the pickers, and the establishments with their logos. */
export function usePickerData(enabled: boolean) {
  const employees = useQuery({ queryKey: ["employees-selector"], queryFn: () => employeesApi.list({ pageSize: 200 }), enabled });
  const branches = useQuery({ queryKey: ["branches", "active"], queryFn: listActiveBranches, enabled });
  return { employees: employees.data?.data ?? [], branches: branches.data ?? [] };
}

/** Which letterhead the document will print with: the employee's establishment. */
export function PrintsAs({ branch }: { branch?: { id: string; name: string; nameEn?: string | null; logoFileId?: string | null } | null }) {
  if (!branch) {
    return (
      <div className="cu-prints-as">
        <BranchMedal name="؟" />
        <div>
          <b>{tr("هيتطبع باسم الشركة", "Prints under the company")}</b>
          <small>{tr("الموظف مش مسجل على منشأة، فهيتطبع بشعار الشركة الأساسي.", "The employee is not on an establishment, so the company's main logo is used.")}</small>
        </div>
      </div>
    );
  }
  return (
    <div className="cu-prints-as">
      <BranchMedal fileId={branch.logoFileId} name={branchName(branch)} />
      <div>
        <b>{tr("هيتطبع باسم: ", "Prints as: ")}{branchName(branch)}</b>
        <small>{branch.logoFileId ? tr("بشعار المنشأة ولونها.", "With the establishment's logo and colour.") : tr("المنشأة مالهاش شعار لسه، فهيتطبع بشعار الشركة الأساسي. تقدر ترفعه من صفحة المؤسسات والشركات.", "This establishment has no logo yet, so the company's main logo is used. Upload one on the establishments page.")}</small>
      </div>
    </div>
  );
}

export function EmployeeCell({ e }: { e: CustodyEmployee }) {
  return (
    <>
      <BranchMedal fileId={e.branch?.logoFileId} name={branchName(e.branch) || empName(e)} />
      <div className="who">
        <b>{empName(e)}</b>
        <small>{[e.employeeNumber, branchName(e.branch)].filter(Boolean).join(" · ")}</small>
      </div>
    </>
  );
}
