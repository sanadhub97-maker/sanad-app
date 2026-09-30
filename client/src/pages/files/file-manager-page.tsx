import { fileTypeLabel } from "@/lib/names";
import { useRef, useState, type DragEvent } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, FileImage, FileSpreadsheet, FileText, Folder, IdCard, Loader2, Palette, Receipt, Search, Upload } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/common/confirm-dialog";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { filesApi, type FileMetaWithUploader } from "@/api/files";
import { FileDetailsDialog, fixFileName } from "@/pages/files/file-details-dialog";
import { getErrorMessage } from "@/lib/api";
import { useAuthStore } from "@/stores/authStore";
import { cn } from "@/lib/utils";
import { tr } from "@/i18n";
import { DayHeader, groupByDay, type Tone } from "@/components/royal/rp";

/* The file manager in the Royal design, as in the approved preview: a drop
   area to upload, a folder per section, and the files by the day they came in. */

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FolderKey = "all" | "company" | "employees" | "payments" | "brand" | "other";
const FOLDERS: { key: FolderKey; ar: string; en: string; icon: LucideIcon; tone: Tone }[] = [
  { key: "all", ar: "كل الملفات", en: "All files", icon: Folder, tone: "pri" },
  { key: "company", ar: "مستندات الشركة", en: "Company documents", icon: Building2, tone: "teal" },
  { key: "employees", ar: "مستندات الموظفين", en: "Employee documents", icon: IdCard, tone: "vio" },
  { key: "payments", ar: "سندات الصرف", en: "Payment vouchers", icon: Receipt, tone: "gold" },
  { key: "brand", ar: "هوية المنشأة", en: "Branding", icon: Palette, tone: "sky" },
  { key: "other", ar: "ملفات أخرى", en: "Other files", icon: FileText, tone: "mut" },
];
/** Which folder a file's section puts it in. */
function folderOf(module?: string | null): FolderKey {
  const m = (module || "").toLowerCase();
  if (m.startsWith("company-document")) return "company";
  if (m.startsWith("employee")) return "employees";
  if (m.startsWith("payment")) return "payments";
  if (m.startsWith("company-") || m.startsWith("signature")) return "brand";
  return "other";
}
/** The picture and colour of a file's type. */
function kindOf(mime: string): { icon: LucideIcon; ext: string; tone: string } {
  const m = mime.toLowerCase();
  if (m === "application/pdf") return { icon: FileText, ext: "PDF", tone: "var(--l-rose)" };
  if (m.startsWith("image/")) return { icon: FileImage, ext: m.slice(6).toUpperCase().replace("JPEG", "JPG"), tone: "var(--l-teal)" };
  if (/sheet|excel|csv/.test(m)) return { icon: FileSpreadsheet, ext: "XLSX", tone: "var(--l-green)" };
  return { icon: FileText, ext: "FILE", tone: "var(--l-sky)" };
}

export default function FileManagerPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState<FolderKey>("all");
  const [over, setOver] = useState(false);
  const [uploading, setUploading] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileMetaWithUploader | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FileMetaWithUploader | null>(null);
  const pick = useRef<HTMLInputElement>(null);
  const canUpload = hasPermission("files.upload");

  // The newest 200 files, sorted into folders and days here.
  const { data, isLoading } = useQuery({
    queryKey: ["files", { page: 1, search, pageSize: 200 }],
    queryFn: () => filesApi.list({ page: 1, pageSize: 200, q: search || undefined }),
  });
  const all = data?.data ?? [];
  const shown = folder === "all" ? all : all.filter((f) => folderOf(f.module) === folder);
  const days = groupByDay(shown, (f) => f.createdAt);
  const bytes = all.reduce((n, f) => n + (f.size || 0), 0);

  async function upload(files: FileList | File[] | null) {
    const list = Array.from(files ?? []);
    if (!list.length || !canUpload) return;
    setUploading(list.length);
    let ok = 0;
    for (const f of list) {
      try {
        await filesApi.upload(f);
        ok++;
      } catch (err) {
        toast.error(`${f.name}: ${getErrorMessage(err)}`);
      }
    }
    setUploading(0);
    if (ok) {
      toast.success(tr(`تم رفع ${ok} ملف`, `${ok} file${ok === 1 ? "" : "s"} uploaded`));
      queryClient.invalidateQueries({ queryKey: ["files"] });
    }
  }
  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void upload(e.dataTransfer.files);
  };

  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      await filesApi.remove(deleteTarget.id);
      toast.success(t("common.deletedSuccess"));
      queryClient.invalidateQueries({ queryKey: ["files"] });
      setDeleteTarget(null);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  }

  return (
    <div className="rp">
      <PageHeader
        title={t("files.title")}
        description={tr(`${data?.meta.total ?? all.length} ملف · ${formatSize(bytes)} · مرتبة باليوم`, `${data?.meta.total ?? all.length} files · ${formatSize(bytes)} · by day`)}
        actions={
          canUpload && (
            <Button onClick={() => pick.current?.click()} disabled={Boolean(uploading)}>
              <Upload className="h-4 w-4" /> {tr("رفع ملف", "Upload file")}
            </Button>
          )
        }
      />

      {canUpload && (
        <div
          className={cn("rp-drop rp-rise no-print", over && "over")}
          style={{ ["--i" as string]: 1 }}
          onDragEnter={(e) => (e.preventDefault(), setOver(true))}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={() => setOver(false)}
          onDrop={onDrop}
        >
          <span className="rp-ico" style={{ width: 52, height: 52, borderRadius: 16 }}>
            {uploading ? <Loader2 className="animate-spin" /> : <Upload />}
          </span>
          <div className="min-w-0 flex-1">
            <b>{uploading ? tr(`جاري رفع ${uploading} ملف…`, `Uploading ${uploading} file(s)…`) : tr("اسحب الملفات هنا للرفع", "Drop files here to upload")}</b>
            <small>{tr("PDF أو صور أو Excel أو Word — وتقدر تربطها بموظف أو مستند من صفحته", "PDF, images, Excel or Word — link them to an employee or document from its page")}</small>
          </div>
          <button type="button" className="rp-chip rp-pri" aria-pressed="true" onClick={() => pick.current?.click()} disabled={Boolean(uploading)}>
            <Upload className="h-4 w-4" /> {tr("اختيار ملفات", "Choose files")}
          </button>
          <input ref={pick} type="file" multiple hidden accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx" onChange={(e) => (void upload(e.target.files), (e.target.value = ""))} />
        </div>
      )}

      <div className="rp-fgrid rp-rise no-print" style={{ ["--i" as string]: 2 }}>
        {FOLDERS.map((f) => {
          const n = f.key === "all" ? all.length : all.filter((x) => folderOf(x.module) === f.key).length;
          if (!n && f.key !== "all" && folder !== f.key) return null;
          return (
            <button key={f.key} type="button" className="rp-card rp-fold rp-lift" aria-pressed={folder === f.key} onClick={() => setFolder(f.key)}>
              <span className={cn("rp-ico", `rp-${f.tone}`)}>
                <f.icon />
              </span>
              <span>
                <b>{tr(f.ar, f.en)}</b>
                <small>{tr(`${n} ملف`, `${n} files`)}</small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="rp-tools rp-rise no-print" style={{ ["--i" as string]: 3 }}>
        <label className="rp-search">
          <Search />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder={tr("اسم الملف", "File name")} aria-label={tr("بحث", "Search")} />
        </label>
      </div>

      {isLoading ? (
        <div className="rp-card rp-empty">
          <Loader2 className="mx-auto h-5 w-5 animate-spin" />
        </div>
      ) : days.length === 0 ? (
        <div className="rp-card rp-empty rp-rise">
          <b>{t("files.emptyTitle")}</b>
        </div>
      ) : (
        days.map((g, j) => (
          <section key={g.day.toISOString()} className="rp-card rp-rise overflow-hidden" style={{ ["--i" as string]: Math.min(4 + j, 12) }}>
            <DayHeader
              day={g.day}
              right={
                <>
                  <b>{g.items.length}</b>
                  {tr("ملف", g.items.length === 1 ? "file" : "files")}
                </>
              }
            />
            <div className="p-4">
              <div className="rp-fgrid">
                {g.items.map((f) => {
                  const k = kindOf(f.mimeType);
                  const name = fixFileName(f.originalName);
                  return (
                    <button key={f.id} type="button" className="rp-card rp-file rp-lift" onClick={() => setSelectedFile(f)} title={name}>
                      <span className="thumb" style={{ ["--c" as string]: k.tone }}>
                        {k.ext === "PDF" || k.ext === "FILE" ? (
                          <span className="lines">
                            <i />
                            <i />
                            <i />
                          </span>
                        ) : (
                          <k.icon />
                        )}
                        <span className="ext">{k.ext}</span>
                      </span>
                      <span className="min-w-0">
                        <b dir="auto">{name}</b>
                        <small>
                          {fileTypeLabel(f.mimeType)} · {formatSize(f.size)}
                          {f.uploadedBy?.fullName ? ` · ${f.uploadedBy.fullName}` : ""}
                        </small>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>
        ))
      )}

      <FileDetailsDialog open={Boolean(selectedFile)} file={selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)} onDelete={(f) => setDeleteTarget(f)} />
      <ConfirmDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)} title={t("files.deleteConfirmTitle")} onConfirm={handleDelete} />
    </div>
  );
}
