import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { tr } from "@/i18n";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmployeePicker } from "@/components/common/employee-picker";
import { FileUpload } from "@/components/common/file-upload";
import { getErrorMessage } from "@/lib/api";
import { listActiveBranches } from "@/api/branches";
import { employeesApi } from "@/api/employees";
import { useAuthStore } from "@/stores/authStore";
import { DATE_LOOK, vehiclesApi, type InsuranceType, type Vehicle, type VehicleDate } from "@/api/vehicles";

const day = (v?: string | null) => (v ? v.slice(0, 10) : "");
const plus = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toLocaleDateString("en-CA", { timeZone: "Asia/Riyadh" });
};
const branchName = (b: { name: string; nameEn?: string | null }) => tr(b.name, b.nameEn || b.name);

type Form = {
  plateLetters: string; plateNumber: string; serialNumber: string; ownerName: string; make: string; year: string; color: string;
  branchId: string; driverId?: string; inspectionExpiry: string; insuranceExpiry: string; registrationExpiry: string;
  insurer: string; insuranceType: InsuranceType | ""; notes: string;
  inspectionFileId: string | null; insuranceFileId: string | null; registrationFileId: string | null;
};
const empty = (): Form => ({
  plateLetters: "", plateNumber: "", serialNumber: "", ownerName: "", make: "", year: "", color: "", branchId: "", driverId: undefined,
  inspectionExpiry: "", insuranceExpiry: "", registrationExpiry: "", insurer: "", insuranceType: "COMPREHENSIVE", notes: "",
  inspectionFileId: null, insuranceFileId: null, registrationFileId: null,
});
const REQUIRED: (keyof Form)[] = ["plateLetters", "plateNumber", "make", "inspectionExpiry", "insuranceExpiry"];

/** Adding or editing a car: plate, owner and serial, the car, its establishment and driver, and its three dates with their papers. */
export function VehicleDialog({ open, onOpenChange, vehicle }: { open: boolean; onOpenChange: (o: boolean) => void; vehicle?: Vehicle | null }) {
  const qc = useQueryClient();
  const [f, setF] = useState<Form>(empty());
  const [bad, setBad] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const { data: branches = [] } = useQuery({ queryKey: ["branches", "active"], queryFn: listActiveBranches, enabled: open });
  const { data: employees } = useQuery({ queryKey: ["employees-selector"], queryFn: () => employeesApi.list({ pageSize: 200 }), enabled: open });

  useEffect(() => {
    if (!open) return;
    setBad(new Set());
    setF(vehicle ? {
      plateLetters: vehicle.plateLetters, plateNumber: vehicle.plateNumber, serialNumber: vehicle.serialNumber ?? "", ownerName: vehicle.ownerName ?? "",
      make: vehicle.make, year: vehicle.year ? String(vehicle.year) : "", color: vehicle.color ?? "", branchId: vehicle.branchId ?? "", driverId: vehicle.driverId ?? undefined,
      inspectionExpiry: day(vehicle.inspectionExpiry), insuranceExpiry: day(vehicle.insuranceExpiry), registrationExpiry: day(vehicle.registrationExpiry),
      insurer: vehicle.insurer ?? "", insuranceType: vehicle.insuranceType ?? "", notes: vehicle.notes ?? "",
      inspectionFileId: vehicle.inspectionFileId, insuranceFileId: vehicle.insuranceFileId, registrationFileId: vehicle.registrationFileId,
    } : empty());
  }, [open, vehicle]);

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));
  const cls = (k: keyof Form) => `vh-in${bad.has(k) ? " bad" : ""}`;

  async function save() {
    const missing = REQUIRED.filter((k) => !String(f[k] ?? "").trim());
    if (!/^[0-9٠-٩]{1,4}$/.test(f.plateNumber.trim()) && f.plateNumber.trim()) missing.push("plateNumber");
    setBad(new Set(missing));
    if (missing.length) return toast.error(tr("كمّل الخانات المطلوبة", "Fill in the required fields"));
    setSaving(true);
    const body = {
      ...f,
      year: f.year ? Number(f.year) : ("" as const),
      branchId: f.branchId || undefined,
      insuranceType: f.insuranceType || null,
      registrationExpiry: f.registrationExpiry || undefined,
    };
    try {
      const saved = vehicle ? await vehiclesApi.update(vehicle.id, body) : await vehiclesApi.create(body);
      toast.success(vehicle ? tr("اتحفظت التعديلات", "Changes saved") : tr(`اتضافت ${saved.make}`, `${saved.make} added`));
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const file = (k: "inspectionFileId" | "insuranceFileId" | "registrationFileId", label: string) => (
    <div className="vh-f">
      <label>{label}</label>
      <FileUpload module="vehicle" fileId={f[k]} fileName={f[k] ? tr("المرفق", "Attachment") : null} onUploaded={(id) => set(k, id)} onRemoved={() => set(k, null)} />
    </div>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="vh vh-dlg w-full sm:max-w-3xl max-h-[92vh]">
        <div className="vh-dh">
          <DialogTitle asChild><h2 className="vh-foil">{vehicle ? tr("تعديل السيارة", "Edit vehicle") : tr("إضافة سيارة", "Add a vehicle")}</h2></DialogTitle>
          <DialogDescription asChild><p>{tr("بيانات السيارة، والفحص الدوري، والتأمين، والاستمارة.", "The car, its periodic inspection, insurance and registration.")}</p></DialogDescription>
        </div>
        <div className="vh-db">
          <div className="vh-sec">{tr("اللوحة والسيارة", "Plate and car")}</div>
          <div className="vh-g3">
            <div className="vh-f"><label htmlFor="v-letters">{tr("حروف اللوحة", "Plate letters")} <i>*</i></label><input id="v-letters" className={cls("plateLetters")} value={f.plateLetters} onChange={(e) => set("plateLetters", e.target.value)} placeholder="أ ب ج" maxLength={12} /></div>
            <div className="vh-f"><label htmlFor="v-number">{tr("أرقام اللوحة", "Plate number")} <i>*</i></label><input id="v-number" className={cls("plateNumber")} value={f.plateNumber} onChange={(e) => set("plateNumber", e.target.value)} placeholder="1234" inputMode="numeric" maxLength={4} dir="ltr" /></div>
            <div className="vh-f">
              <label htmlFor="v-branch">{tr("المؤسسة المسجلة عليها", "Establishment")}</label>
              <select id="v-branch" className="vh-in" value={f.branchId} onChange={(e) => set("branchId", e.target.value)}>
                <option value="">{tr("بدون مؤسسة", "No establishment")}</option>
                {branches.map((b) => <option key={b.id} value={b.id}>{branchName(b)}</option>)}
              </select>
            </div>
          </div>
          <div className="vh-g2">
            <div className="vh-f"><label htmlFor="v-owner">{tr("اسم المالك", "Owner name")}</label><input id="v-owner" className="vh-in" value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)} placeholder={tr("زي ما هو مكتوب في الاستمارة", "As on the registration card")} maxLength={200} /></div>
            <div className="vh-f"><label htmlFor="v-serial">{tr("الرقم التسلسلي", "Serial number")}</label><input id="v-serial" className="vh-in" value={f.serialNumber} onChange={(e) => set("serialNumber", e.target.value)} placeholder={tr("من الاستمارة", "From the registration card")} inputMode="numeric" dir="ltr" maxLength={30} /></div>
          </div>
          <div className="vh-g3">
            <div className="vh-f"><label htmlFor="v-make">{tr("النوع والموديل", "Make and model")} <i>*</i></label><input id="v-make" className={cls("make")} value={f.make} onChange={(e) => set("make", e.target.value)} placeholder={tr("تويوتا هايلكس", "Toyota Hilux")} maxLength={120} /></div>
            <div className="vh-f"><label htmlFor="v-year">{tr("سنة الصنع", "Year")}</label><input id="v-year" className="vh-in" type="number" min={1950} max={2100} value={f.year} onChange={(e) => set("year", e.target.value)} dir="ltr" /></div>
            <div className="vh-f"><label htmlFor="v-color">{tr("اللون", "Colour")}</label><input id="v-color" className="vh-in" value={f.color} onChange={(e) => set("color", e.target.value)} maxLength={40} /></div>
          </div>
          <div className="vh-f">
            <label>{tr("السائق", "Driver")}</label>
            <EmployeePicker employees={employees?.data ?? []} value={f.driverId} onChange={(id) => set("driverId", id)} />
          </div>

          <div className="vh-sec">{tr("الفحص الدوري", "Periodic inspection")}</div>
          <div className="vh-g2">
            <div className="vh-f"><label htmlFor="v-insp">{tr("تاريخ انتهاء الفحص", "Inspection expiry")} <i>*</i></label><input id="v-insp" type="date" className={cls("inspectionExpiry")} value={f.inspectionExpiry} onChange={(e) => set("inspectionExpiry", e.target.value)} /></div>
            {file("inspectionFileId", tr("شهادة الفحص", "Inspection certificate"))}
          </div>

          <div className="vh-sec">{tr("التأمين", "Insurance")}</div>
          <div className="vh-g3">
            <div className="vh-f"><label htmlFor="v-ins">{tr("تاريخ انتهاء التأمين", "Insurance expiry")} <i>*</i></label><input id="v-ins" type="date" className={cls("insuranceExpiry")} value={f.insuranceExpiry} onChange={(e) => set("insuranceExpiry", e.target.value)} /></div>
            <div className="vh-f"><label htmlFor="v-insurer">{tr("شركة التأمين", "Insurer")}</label><input id="v-insurer" className="vh-in" value={f.insurer} onChange={(e) => set("insurer", e.target.value)} placeholder={tr("التعاونية", "Tawuniya")} maxLength={120} /></div>
            <div className="vh-f">
              <label htmlFor="v-instype">{tr("نوع التأمين", "Cover")}</label>
              <select id="v-instype" className="vh-in" value={f.insuranceType} onChange={(e) => set("insuranceType", e.target.value as InsuranceType)}>
                <option value="COMPREHENSIVE">{tr("شامل", "Comprehensive")}</option>
                <option value="THIRD_PARTY">{tr("ضد الغير", "Third party")}</option>
              </select>
            </div>
          </div>
          {file("insuranceFileId", tr("وثيقة التأمين", "Insurance policy"))}

          <div className="vh-sec">{tr("الاستمارة", "Registration")}</div>
          <div className="vh-g2">
            <div className="vh-f"><label htmlFor="v-reg">{tr("تاريخ انتهاء الاستمارة", "Registration expiry")}</label><input id="v-reg" type="date" className="vh-in" value={f.registrationExpiry} onChange={(e) => set("registrationExpiry", e.target.value)} /></div>
            {file("registrationFileId", tr("صورة الاستمارة", "Registration card"))}
          </div>
          <div className="vh-f"><label htmlFor="v-notes">{tr("ملاحظات", "Notes")}</label><textarea id="v-notes" className="vh-in" rows={2} value={f.notes} onChange={(e) => set("notes", e.target.value)} maxLength={2000} /></div>
        </div>
        <div className="vh-df">
          <button type="button" className="vh-btn" onClick={() => onOpenChange(false)}>{tr("إلغاء", "Cancel")}</button>
          <button type="button" className="vh-btn gold" disabled={saving} onClick={save}>
            {saving && <Loader2 className="animate-spin" />} {vehicle ? tr("حفظ التعديلات", "Save changes") : tr("إضافة السيارة", "Add the vehicle")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** A new expiry date for one of the car's dates; the old one goes to the history, with an optional payment voucher. */
export function RenewDialog({ vehicle, onOpenChange }: { vehicle: Vehicle | null; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const canPay = useAuthStore((s) => s.hasPermission("payments.create"));
  const [kind, setKind] = useState<VehicleDate>("INSPECTION");
  const [date, setDate] = useState(plus(365));
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("CASH");
  const [fileId, setFileId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!vehicle) return;
    const nearest = ([["INSPECTION", vehicle.inspectionDays], ["INSURANCE", vehicle.insuranceDays], ["REGISTRATION", vehicle.registrationDays ?? Infinity]] as [VehicleDate, number][]).sort((a, b) => a[1] - b[1])[0][0];
    setKind(nearest);
    setDate(plus(365));
    setAmount("");
    setFileId(null);
  }, [vehicle]);

  async function save() {
    if (!vehicle || !date) return;
    setSaving(true);
    try {
      await vehiclesApi.renew(vehicle.id, { kind, date, amount: amount ? Number(amount) : undefined, method, fileId: fileId ?? undefined });
      toast.success(tr("اتسجل التجديد", "Renewal recorded"));
      qc.invalidateQueries({ queryKey: ["vehicles"] });
      if (amount) qc.invalidateQueries({ queryKey: ["payments"] });
      onOpenChange(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const current = vehicle ? (kind === "INSPECTION" ? vehicle.inspectionExpiry : kind === "INSURANCE" ? vehicle.insuranceExpiry : vehicle.registrationExpiry) : null;
  return (
    <Dialog open={Boolean(vehicle)} onOpenChange={onOpenChange}>
      <DialogContent className="vh vh-dlg w-full sm:max-w-lg">
        <div className="vh-dh">
          <DialogTitle asChild><h2 className="vh-foil">{tr("تجديد", "Renew")} {vehicle?.make}</h2></DialogTitle>
          <DialogDescription asChild><p>{tr("اللوحة", "Plate")} {vehicle?.plateLetters} {vehicle?.plateNumber} · {tr("التاريخ القديم هيتحفظ في السجل.", "The old date stays in the history.")}</p></DialogDescription>
        </div>
        <div className="vh-db">
          <div className="vh-f">
            <label htmlFor="r-kind">{tr("إيه اللي اتجدد؟", "What was renewed?")}</label>
            <select id="r-kind" className="vh-in" value={kind} onChange={(e) => setKind(e.target.value as VehicleDate)}>
              {(Object.keys(DATE_LOOK) as VehicleDate[]).map((k) => <option key={k} value={k}>{tr(DATE_LOOK[k].ar, DATE_LOOK[k].en)}</option>)}
            </select>
            <span className="vh-hint">{tr("بينتهي حاليًا:", "Currently ends:")} <span className="n">{current ? day(current).split("-").reverse().join("/") : "—"}</span></span>
          </div>
          <div className="vh-f"><label htmlFor="r-date">{tr("تاريخ الانتهاء الجديد", "New expiry date")}</label><input id="r-date" type="date" className="vh-in" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          <div className="vh-f"><label>{tr("المستند الجديد", "New document")}</label><FileUpload module="vehicle" fileId={fileId} fileName={fileId ? tr("المرفق", "Attachment") : null} onUploaded={(id) => setFileId(id)} onRemoved={() => setFileId(null)} /></div>
          {canPay && (
            <div className="vh-g2">
              <div className="vh-f"><label htmlFor="r-amount">{tr("تكلفة التجديد (ر.س)", "Renewal cost (SAR)")}</label><input id="r-amount" type="number" min={0} step="0.01" dir="ltr" className="vh-in" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={tr("اختياري", "Optional")} /></div>
              <div className="vh-f">
                <label htmlFor="r-method">{tr("طريقة الدفع", "Paid by")}</label>
                <select id="r-method" className="vh-in" value={method} onChange={(e) => setMethod(e.target.value)}>
                  <option value="CASH">{tr("نقدي", "Cash")}</option>
                  <option value="BANK_TRANSFER">{tr("تحويل بنكي", "Bank transfer")}</option>
                  <option value="CARD">{tr("بطاقة", "Card")}</option>
                  <option value="ONLINE">{tr("دفع إلكتروني", "Online")}</option>
                </select>
              </div>
              <span className="vh-hint" style={{ gridColumn: "1 / -1" }}>{tr("لو كتبت التكلفة، هيتسجل سند صرف بيها في المدفوعات.", "With a cost, a payment voucher is recorded in Payments.")}</span>
            </div>
          )}
        </div>
        <div className="vh-df">
          <button type="button" className="vh-btn" onClick={() => onOpenChange(false)}>{tr("إلغاء", "Cancel")}</button>
          <button type="button" className="vh-btn gold" disabled={saving || !date} onClick={save}>{saving && <Loader2 className="animate-spin" />} {tr("حفظ التجديد", "Save renewal")}</button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
