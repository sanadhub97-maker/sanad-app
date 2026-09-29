import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Check, ImagePlus, Loader2, Sparkles, Type } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SAUDI_AVATARS_LIST } from "@/components/avatars/saudi-avatars-data";
import { SaudiAvatar } from "@/components/avatars/saudi-avatar";
import { UserAvatar } from "@/components/lulu/user-avatar";
import { setAvatar, uploadAvatarPhoto, type AvatarUser } from "@/api/auth";
import { useAuthStore } from "@/stores/authStore";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

/* Choosing your own avatar: a photo (cropped to a square on this device
   before it is sent), one of the ready-made SanaD avatars, or your initials. */

const OPEN = "sanad:avatar";
export const openAvatarEditor = () => window.dispatchEvent(new Event(OPEN));

type Tab = "photo" | "ready" | "initials";

/** Centre-crops an image file to a square JPEG of `size` px. */
async function squareJpeg(file: File, size = 360): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("bad image"));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("encode"))), "image/jpeg", 0.88));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function AvatarEditor() {
  const { i18n } = useTranslation();
  const isAr = (i18n.language || "ar").startsWith("ar");
  const user = useAuthStore((s) => s.user) as AvatarUser | null;
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("ready");
  const [key, setKey] = useState<string | null>(null);
  const [photo, setPhoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(OPEN, on);
    return () => window.removeEventListener(OPEN, on);
  }, []);
  useEffect(() => {
    if (!open || !user) return;
    setKey(user.avatarKey ?? null);
    setTab(user.avatarFileId ? "photo" : user.avatarKey ? "ready" : "initials");
    setPhoto(null);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo.url);
    },
    [photo]
  );

  if (!user) return null;

  async function pick(file?: File | null) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return toast.error(isAr ? "اختر صورة JPG أو PNG" : "Choose a JPG or PNG image");
    try {
      const blob = await squareJpeg(file);
      setPhoto({ blob, url: URL.createObjectURL(blob) });
      setTab("photo");
    } catch {
      toast.error(isAr ? "تعذّرت قراءة الصورة" : "Couldn't read that image");
    }
  }

  async function save() {
    setBusy(true);
    try {
      let next: AvatarUser;
      if (tab === "photo") {
        if (!photo) {
          setOpen(false);
          return;
        }
        next = await uploadAvatarPhoto(photo.blob);
      } else {
        next = await setAvatar(tab === "ready" ? key : null);
      }
      useAuthStore.setState({ user: next });
      toast.success(isAr ? "تم تحديث صورتك" : "Your picture is updated");
      setOpen(false);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const preview =
    tab === "photo"
      ? { fileId: photo ? null : user.avatarFileId, previewUrl: photo?.url ?? null, avatarKey: null }
      : tab === "ready"
        ? { fileId: null, previewUrl: null, avatarKey: key }
        : { fileId: null, previewUrl: null, avatarKey: null };
  const tabs: [Tab, string, typeof ImagePlus, string][] = [
    ["photo", isAr ? "صورة شخصية" : "Photo", ImagePlus, "sky"],
    ["ready", isAr ? "أفاتار جاهز" : "Ready-made", Sparkles, "violet"],
    ["initials", isAr ? "الأحرف الأولى" : "Initials", Type, "teal"],
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-xl rounded-[28px]">
        <DialogHeader>
          <DialogTitle className="font-head">{isAr ? "صورتك في SanaD" : "Your picture in SanaD"}</DialogTitle>
          <DialogDescription>{isAr ? "تظهر في القائمة الجانبية وفي المهام وقائمة المستخدمين." : "Shown in the sidebar, in tasks and in the users list."}</DialogDescription>
        </DialogHeader>

        <div className="lu-ave-hero">
          <UserAvatar name={user.fullName} size={76} ring {...preview} />
          <div className="min-w-0">
            <b className="truncate">{user.fullName}</b>
            <small>{user.email}</small>
          </div>
        </div>

        <div className="lu-ave-tabs">
          {tabs.map(([t, label, Icon, tone]) => (
            <button key={t} type="button" className={cn("lu-fchip", `lt-${tone}`, tab === t && "on")} onClick={() => (t === "photo" && !photo && !user.avatarFileId ? input.current?.click() : setTab(t))}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </div>

        {tab === "photo" && (
          <button
            type="button"
            className={cn("lu-ave-drop", over && "over")}
            onClick={() => input.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              void pick(e.dataTransfer.files?.[0]);
            }}
          >
            <ImagePlus />
            <b>{photo || user.avatarFileId ? (isAr ? "اختر صورة أخرى" : "Choose another photo") : isAr ? "اختر صورة من جهازك" : "Choose a photo from your device"}</b>
            <span className="text-xs">{isAr ? "أو اسحبها هنا — تُقصّ مربّعة تلقائيًا (JPG أو PNG)" : "or drop it here — cropped to a square (JPG or PNG)"}</span>
          </button>
        )}

        {tab === "ready" && (
          <div className="lu-ave-grid">
            {SAUDI_AVATARS_LIST.map((a) => (
              <button key={a.id} type="button" className={cn("lu-ave-opt", key === a.id && "on")} onClick={() => setKey(a.id)} aria-pressed={key === a.id}>
                {key === a.id && (
                  <span className="tick">
                    <Check />
                  </span>
                )}
                <SaudiAvatar avatarId={a.id} className="!h-14 !w-14 rounded-full" />
                <span>{isAr ? a.titleAr : a.titleEn}</span>
              </button>
            ))}
          </div>
        )}

        {tab === "initials" && (
          <div className="lu-ave-drop" style={{ cursor: "default" }}>
            <UserAvatar name={user.fullName} size={64} />
            <b>{isAr ? "الأحرف الأولى من اسمك" : "Your initials"}</b>
            <span className="text-xs">{isAr ? "بلون ثابت خاص باسمك" : "On a colour that is always yours"}</span>
          </div>
        )}

        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => void pick(e.target.files?.[0])} />

        <div className="mt-2 flex gap-2">
          <Button className="h-11 flex-1 rounded-[14px]" onClick={save} disabled={busy || (tab === "ready" && !key)}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} {isAr ? "حفظ" : "Save"}
          </Button>
          <Button variant="outline" className="h-11 rounded-[14px]" onClick={() => setOpen(false)}>
            {isAr ? "إلغاء" : "Cancel"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
