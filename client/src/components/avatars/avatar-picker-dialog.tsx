import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SAUDI_AVATARS_LIST } from "./saudi-avatars-data";
import { SaudiAvatar } from "./saudi-avatar";
import { Check, Sparkles } from "lucide-react";

interface AvatarPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedAvatarId?: string | null;
  gender?: "MALE" | "FEMALE" | null;
  onSelectAvatar: (avatarId: string) => void;
  isRtl?: boolean;
}

export function AvatarPickerDialog({
  open,
  onOpenChange,
  selectedAvatarId,
  gender,
  onSelectAvatar,
  isRtl = true,
}: AvatarPickerDialogProps) {
  const [filterGender, setFilterGender] = useState<"ALL" | "MALE" | "FEMALE">(
    gender || "ALL"
  );
  const [theme, setTheme] = useState<"obsidian" | "emerald" | "gold" | "sapphire" | "light">("obsidian");
  const [activeId, setActiveId] = useState<string>(
    selectedAvatarId || (gender === "FEMALE" ? "female-hijab-emerald" : "male-shemagh-red")
  );

  const filteredAvatars = SAUDI_AVATARS_LIST.filter(
    (a) => filterGender === "ALL" || a.gender === filterGender
  );

  const handleConfirm = () => {
    onSelectAvatar(activeId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-3xl p-6 border-border/80 bg-card shadow-2xl">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white text-base shadow-md">
              🇸🇦
            </div>
            <div>
              <DialogTitle className="text-lg font-black text-foreground">
                {isRtl ? "اختيار الأفاتار بالزي السعودي الرسمي" : "Select Saudi Corporate Avatar"}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                {isRtl
                  ? "اختر المظهر المناسب من التشكيلة المعتمدة للموظفين والموظفات"
                  : "Choose from authentic Saudi traditional executive attire for employees"}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Gender Filters & Theme Picker */}
        <div className="space-y-4 pt-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* Gender Filter Buttons */}
            <div className="flex items-center gap-1.5 bg-muted/60 p-1 rounded-2xl border border-border/60">
              <button
                type="button"
                onClick={() => setFilterGender("ALL")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterGender === "ALL"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isRtl ? "كافة النماذج (12)" : "All (12)"}
              </button>
              <button
                type="button"
                onClick={() => setFilterGender("MALE")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterGender === "MALE"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isRtl ? "👔 رجال (6)" : "👔 Male (6)"}
              </button>
              <button
                type="button"
                onClick={() => setFilterGender("FEMALE")}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                  filterGender === "FEMALE"
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isRtl ? "🧕 سيدات (6)" : "🧕 Female (6)"}
              </button>
            </div>

            {/* Backdrop Theme Buttons */}
            <div className="flex items-center gap-1 bg-muted/40 px-2 py-1 rounded-2xl border border-border/50 text-[11px]">
              <span className="text-muted-foreground font-medium me-1">
                {isRtl ? "الخلفية:" : "Theme:"}
              </span>
              {(["obsidian", "emerald", "gold", "sapphire"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`h-5 w-5 rounded-full border transition-all ${
                    t === "obsidian"
                      ? "bg-slate-900"
                      : t === "emerald"
                      ? "bg-emerald-600"
                      : t === "gold"
                      ? "bg-amber-500"
                      : "bg-blue-600"
                  } ${
                    theme === t
                      ? "ring-2 ring-primary ring-offset-2 scale-110"
                      : "opacity-70 hover:opacity-100"
                  }`}
                  title={t}
                />
              ))}
            </div>
          </div>

          {/* Avatars Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-[340px] overflow-y-auto p-1">
            {filteredAvatars.map((item) => {
              const isSelected = item.id === activeId;
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  className={`group relative rounded-2xl p-3 border transition-all cursor-pointer flex flex-col items-center text-center ${
                    isSelected
                      ? "bg-primary/10 border-primary shadow-md ring-2 ring-primary/30"
                      : "bg-muted/30 border-border/60 hover:bg-muted/70 hover:border-border"
                  }`}
                >
                  {/* Selected check badge */}
                  {isSelected && (
                    <div className="absolute top-2 end-2 h-4 w-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-black shadow">
                      <Check className="h-2.5 w-2.5" />
                    </div>
                  )}

                  {/* Avatar Icon */}
                  <SaudiAvatar
                    avatarId={item.id}
                    theme={theme}
                    size="lg"
                    className="my-1 transition-transform group-hover:scale-105"
                  />

                  {/* Title */}
                  <div className="text-[11px] font-bold text-foreground truncate w-full mt-1.5">
                    {isRtl ? item.titleAr : item.titleEn}
                  </div>
                  <div className="text-[9px] text-muted-foreground truncate w-full">
                    {item.tagAr}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <DialogFooter className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between sm:justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>{isRtl ? "الهوية الوطنية المعتمدة" : "Official Saudi Attire"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="rounded-xl">
              {isRtl ? "إلغاء" : "Cancel"}
            </Button>
            <Button onClick={handleConfirm} className="rounded-xl bg-primary gap-1.5 shadow-sm">
              <Check className="h-4 w-4" />
              {isRtl ? "اعتماد الأفاتار" : "Apply Avatar"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
