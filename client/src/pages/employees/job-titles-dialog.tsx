import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api, getErrorMessage } from "@/lib/api";
import { employeesApi } from "@/api/employees";
import { useDomesticProfessions } from "@/lib/domestic";

/** Fill in the profession of employees who have none, many at once. A domestic
 * profession links their medical insurance to the iqama. */
export function JobTitlesDialog({ open, onOpenChange, isAr }: { open: boolean; onOpenChange: (o: boolean) => void; isAr: boolean }) {
  const queryClient = useQueryClient();
  const domestic = useDomesticProfessions(open);
  const { data, isLoading } = useQuery({ queryKey: ["employees", "no-job-title", "list"], queryFn: () => employeesApi.list({ noJobTitle: true, pageSize: 100 }), enabled: open });
  const rows = data?.data ?? [];
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) {
      setSelected(new Set());
      setTitle("");
    }
  }, [open]);

  const toggle = (id: string, on: boolean) => setSelected((prev) => {
    const next = new Set(prev);
    if (on) next.add(id);
    else next.delete(id);
    return next;
  });

  async function save() {
    setBusy(true);
    try {
      const ids = [...selected];
      await api.post("/employees/job-title", { ids, jobTitle: title.trim() });
      toast.success(isAr ? `اتحددت مهنة ${ids.length} موظف` : `Profession set for ${ids.length} employees`);
      setSelected(new Set());
      setTitle("");
      await Promise.all([queryClient.invalidateQueries({ queryKey: ["employees"] }), queryClient.invalidateQueries({ queryKey: ["workforce-documents-unified"] }), queryClient.invalidateQueries({ queryKey: ["dashboard"] })]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto rounded-3xl">
        <DialogHeader>
          <DialogTitle>{isAr ? "تحديد المهن" : "Fill in professions"}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          {isAr ? "اختار الموظفين واكتب مهنتهم. لو المهنة منزلية (زي سائق خاص أو عاملة منزلية)، تأمينهم الطبي هيترَبط بالإقامة تلقائيًا." : "Choose employees and their profession. A domestic profession (private driver, housemaid…) links their medical insurance to the iqama."}
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <label className="grid flex-1 gap-1 text-sm">
            {isAr ? "المهنة" : "Profession"}
            <Input list="job-titles-dialog-list" maxLength={150} value={title} onChange={(e) => setTitle(e.target.value)} placeholder={isAr ? "مثال: سائق خاص" : "e.g. Private driver"} />
            <datalist id="job-titles-dialog-list">
              {domestic.arabic.map((p) => (
                <option key={p} value={p} />
              ))}
            </datalist>
          </label>
          <Button onClick={save} disabled={busy || !title.trim() || selected.size === 0}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {isAr ? `حفظ (${selected.size})` : `Save (${selected.size})`}
          </Button>
        </div>
        {domestic.isDomestic(title) && <p className="text-xs text-sky-700 dark:text-sky-300">{isAr ? "مهنة منزلية: التأمين الطبي هيمشي مع الإقامة." : "Domestic profession: the medical insurance will follow the iqama."}</p>}
        <div className="rounded-2xl border">
          <label className="flex items-center gap-3 border-b px-3 py-2 text-sm font-semibold">
            <input type="checkbox" checked={rows.length > 0 && selected.size === rows.length} onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((r) => r.id)) : new Set())} />
            {isAr ? `اختار الكل (${rows.length})` : `Select all (${rows.length})`}
          </label>
          {isLoading && <p className="p-3 text-sm text-muted-foreground">{isAr ? "جاري التحميل…" : "Loading…"}</p>}
          {!isLoading && rows.length === 0 && <p className="p-3 text-sm text-muted-foreground">{isAr ? "كل الموظفين ليهم مهنة." : "Every employee has a profession."}</p>}
          {rows.map((r) => (
            <label key={r.id} className="flex items-center gap-3 border-b px-3 py-2 text-sm last:border-0">
              <input type="checkbox" checked={selected.has(r.id)} onChange={(e) => toggle(r.id, e.target.checked)} />
              <span className="flex-1">{r.fullNameAr}</span>
              <span className="text-xs text-muted-foreground" dir="ltr">{r.employeeNumber}</span>
            </label>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
