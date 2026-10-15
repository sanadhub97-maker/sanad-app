import { useState, type ReactNode } from "react";
import { Building2 } from "lucide-react";
import { tr } from "@/i18n";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BranchMedal } from "@/pages/branches/branch-logo";
import { PrintsAs } from "@/pages/custody/custody-shared";
import "@/styles/experience.css";

/* What the experience and salary certificates share: whose letterhead they
   print on (the employee's establishment or a name typed by hand), a framed
   section of the form, and the head of the sheet beside it. */

export type LetterMode = "employee" | "manual";
export type ManualEst = { name: string; nameEn: string; cr: string; city: string };
type Branch = { id: string; name: string; nameEn?: string | null; logoFileId?: string | null } | null;

export function useLetterhead(branch: Branch) {
  const [mode, setMode] = useState<LetterMode>("employee");
  const [est, setEst] = useState<ManualEst>({ name: "", nameEn: "", cr: "", city: "" });
  const name = mode === "manual" ? est.name.trim() : branch ? tr(branch.name, branch.nameEn || branch.name) : tr("الشركة", "The company");
  const params = mode === "manual" ? { establishment: mode, estName: est.name, estNameEn: est.nameEn, estCr: est.cr, estCity: est.city } : { establishment: mode };
  const problem = mode === "manual" && !est.name.trim() ? tr("اكتب اسم المنشأة.", "Type the establishment's name.") : null;
  return { mode, setMode, est, setEst, name, params, problem, branch };
}
export type Letterhead = ReturnType<typeof useLetterhead>;

export function Sec({ i, icon: Icon, title, children }: { i: number; icon: typeof Building2; title: string; children: ReactNode }) {
  return (
    <section className="xp-sec" style={{ ["--i" as string]: i }}>
      <h3>
        <span className="ic"><Icon /></span>
        {title}
      </h3>
      {children}
    </section>
  );
}

export function LetterheadSection({ i, lh, hasEmployee }: { i: number; lh: Letterhead; hasEmployee: boolean }) {
  const { mode, setMode, est, setEst } = lh;
  return (
    <Sec i={i} icon={Building2} title={tr("المنشأة اللي هتطبع باسمها", "The letterhead")}>
      <div className="xp-seg" role="radiogroup">
        <button type="button" role="radio" aria-checked={mode === "employee"} className={mode === "employee" ? "on" : ""} onClick={() => setMode("employee")}>
          {tr("منشأة الموظف", "The employee's establishment")}
        </button>
        <button type="button" role="radio" aria-checked={mode === "manual"} className={mode === "manual" ? "on" : ""} onClick={() => setMode("manual")}>
          {tr("اسم منشأة يدوي", "A name typed by hand")}
        </button>
      </div>
      {mode === "employee" ? (
        hasEmployee ? <PrintsAs branch={lh.branch} /> : <p className="xp-hint">{tr("اختار الموظف، وهتتطبع باسم منشأته وشعارها ولونها.", "Choose the employee; it prints on their establishment's letterhead.")}</p>
      ) : (
        <div className="xp-fields">
          <div className="wide">
            <Label>{tr("اسم المنشأة بالعربي", "Name in Arabic")} *</Label>
            <Input value={est.name} onChange={(e) => setEst({ ...est, name: e.target.value })} placeholder={tr("مثلًا: مؤسسة الأفق للمقاولات", "e.g. Al Ofuq Contracting Est.")} />
          </div>
          <div className="wide">
            <Label>{tr("اسم المنشأة بالإنجليزي", "Name in English")}</Label>
            <Input dir="ltr" value={est.nameEn} onChange={(e) => setEst({ ...est, nameEn: e.target.value })} />
          </div>
          <div>
            <Label>{tr("السجل التجاري", "Commercial registration")}</Label>
            <Input dir="ltr" value={est.cr} onChange={(e) => setEst({ ...est, cr: e.target.value })} />
          </div>
          <div>
            <Label>{tr("المدينة", "City")}</Label>
            <Input value={est.city} onChange={(e) => setEst({ ...est, city: e.target.value })} />
          </div>
          <p className="xp-hint wide">{tr("الاسم المكتوب يدوي بيتطبع بأول حرف منه في الدايرة، من غير شعار أي منشأة تانية.", "A typed name prints with its initial in the medallion, never another establishment's logo.")}</p>
        </div>
      )}
    </Sec>
  );
}

/** The head of the sheet: the establishment's band, its medallion and the letter's title. */
export function SheetHead({ lh, title, sub }: { lh: Letterhead; title: string; sub: string }) {
  return (
    <>
      <div className="band">
        <b>{lh.name || "…"}</b>
        {lh.mode === "manual" && lh.est.nameEn && <small dir="ltr">{lh.est.nameEn}</small>}
      </div>
      <div className="medal">
        {lh.mode === "employee" && lh.branch ? <BranchMedal fileId={lh.branch.logoFileId} name={lh.name} /> : <span className="ini">{(lh.name || "؟").charAt(0)}</span>}
      </div>
      <div className="ttl">
        <h2>{title}</h2>
        <small>{sub}</small>
      </div>
    </>
  );
}

/** The two signatures at the foot of the sheet, the last under the seal. */
export function SheetSigs({ hrName, gmName, estName }: { hrName: string; gmName: string; estName: string }) {
  return (
    <div className="sigs">
      <div><i /><b>{tr("مدير الموارد البشرية", "HR manager")}</b><small>{hrName || " "}</small></div>
      <div><span className="seal" /><i /><b>{tr("المدير العام", "General manager")}</b><small>{gmName || estName || " "}</small></div>
    </div>
  );
}
