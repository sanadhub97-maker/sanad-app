import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Eye, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AppleIcon } from "@/components/common/apple-icon";
import { settingsApi, type PrintThemeId } from "@/api/settings";
import { openPdfInNewTab } from "@/lib/download";
import { getErrorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PrintSignaturesCard } from "./print-signatures-card";

type Layout =
  | "classic" | "frame" | "band" | "spine-left" | "lattice" | "slant" | "spine-right" | "arch" | "split" | "damask" | "dunes" | "stripe"
  | "ledger" | "blueprint" | "mono" | "ribbon" | "mosaic" | "ocean" | "sadu" | "glass" | "gazette" | "prism";

interface Design {
  id: PrintThemeId;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  paper: string;
  accent: string;
  metal: string;
  layout: Layout;
  ink: 1 | 2 | 3;
}

// Keep in sync with server/src/services/printThemes.ts.
const DESIGNS: Design[] = [
  { id: "classic", nameAr: "الكلاسيكي", nameEn: "Classic", descAr: "التصميم الأصلي: رأس بسيط وجدول كحلي، مناسب للاستخدام اليومي.", descEn: "The original design: a simple header and navy table, for everyday use.", paper: "#ffffff", accent: "#1e293b", metal: "#c59a45", layout: "classic", ink: 1 },
  { id: "royal", nameAr: "الملكي", nameEn: "Royal", descAr: "كحلي ليلي وذهبي، إطار ذهبي مزدوج على كل صفحة، نقش أمان وعلامة مائية.", descEn: "Midnight navy and gold, a double gold frame on every page, security pattern and watermark.", paper: "#fbf8f1", accent: "#0a1a33", metal: "#b08d4c", layout: "frame", ink: 3 },
  { id: "emerald", nameAr: "الزمردي", nameEn: "Emerald", descAr: "أخضر زمردي وذهبي شمباني بزخرفة النجمة الثمانية الإسلامية.", descEn: "Emerald green and champagne gold with the eight-point Islamic star.", paper: "#fdfcf8", accent: "#0b3b33", metal: "#c2a062", layout: "band", ink: 2 },
  { id: "executive", nameAr: "التنفيذي الأسود", nameEn: "Black Executive", descAr: "أسود فحمي وشمباني، عمود جانبي بنقش أمان ورقم كبير ذهبي.", descEn: "Charcoal and champagne, a patterned side column and a large gold figure.", paper: "#ffffff", accent: "#121110", metal: "#c8ab74", layout: "spine-left", ink: 3 },
  { id: "burgundy", nameAr: "العنابي", nameEn: "Burgundy", descAr: "عنابي وذهبي عتيق، شرائط زخرفة متشابكة وميدالية مركزية للشعار.", descEn: "Wine and antique gold, interlaced lattice strips and a centred logo medallion.", paper: "#fcf9f3", accent: "#561022", metal: "#b3924f", layout: "lattice", ink: 2 },
  { id: "sapphire", nameAr: "الياقوتي", nameEn: "Sapphire", descAr: "أزرق ياقوتي وفضي بلاتيني، رأس مائل بشبكة ماسية وبطاقة عنوان عائمة.", descEn: "Sapphire blue and platinum, a slanted diamond-lattice header and a floating title card.", paper: "#ffffff", accent: "#0d2a63", metal: "#aeb7c4", layout: "slant", ink: 3 },
  { id: "bronze", nameAr: "البرونزي", nameEn: "Bronze", descAr: "بني قهوة وبرونزي، عمود مشربية جانبي وشعار في ميدالية برونزية.", descEn: "Espresso and bronze, a mashrabiya side column and a bronze logo medallion.", paper: "#faf6f0", accent: "#2e2019", metal: "#a8683c", layout: "spine-right", ink: 2 },
  { id: "turquoise", nameAr: "الفيروزي", nameEn: "Turquoise", descAr: "فيروزي ونحاسي، الشعار داخل قوس محراب، وزوايا نحاسية على كل صفحة.", descEn: "Turquoise and copper, the logo inside a mihrab arch, copper corners on every page.", paper: "#fbfaf6", accent: "#0e5e63", metal: "#b87333", layout: "arch", ink: 1 },
  { id: "slate", nameAr: "الأردوازي", nameEn: "Slate", descAr: "رمادي أردوازي وذهبي وردي، رأس مقسوم بلونين وجداول خفيفة بخطوط رفيعة.", descEn: "Slate and rose gold, a split two-tone header and light hairline tables.", paper: "#ffffff", accent: "#2f3e4e", metal: "#b76e79", layout: "split", ink: 1 },
  { id: "amethyst", nameAr: "الأرجواني", nameEn: "Amethyst", descAr: "أرجواني ملكي وذهبي، نقش دمشقي خفيف على الصفحة كلها وشريط مائل على الزاوية.", descEn: "Royal purple and gold, a faint damask across the page and a corner sash.", paper: "#fdfbf7", accent: "#3b1f4e", metal: "#b8954f", layout: "damask", ink: 2 },
  { id: "olive", nameAr: "الزيتوني", nameEn: "Olive", descAr: "زيتوني ورملي، عنوان كبير بخط الرقعة وشريط كثبان رملية أسفل كل صفحة.", descEn: "Olive and desert sand, a large calligraphic title and a sand-dune band on every page.", paper: "#fbf8f0", accent: "#4a5a2a", metal: "#c8a86b", layout: "dunes", ink: 2 },
  { id: "ledger", nameAr: "المحاسبي", nameEn: "Ledger", descAr: "أخضر غامق وأحمر محاسبي، ورق دفتر بهامش أحمر مزدوج ومربع رقم المستند، وجدول بسطور مسطّرة.", descEn: "Forest green and ledger red: ledger paper with a red double margin, a document-number box and ruled rows.", paper: "#fbfaf3", accent: "#1f4d3a", metal: "#b3261e", layout: "ledger", ink: 1 },
  { id: "blueprint", nameAr: "المعماري", nameEn: "Blueprint", descAr: "أزرق هندسي وسماوي، رأس بشبكة المخططات الهندسية ومربع بيانات معماري، وجدول بشبكة خلايا كاملة.", descEn: "Blueprint blue and cyan: an engineering-grid header with an architectural title block and fully ruled tables.", paper: "#ffffff", accent: "#0b3d91", metal: "#5ec8f2", layout: "blueprint", ink: 3 },
  { id: "mono", nameAr: "النقي", nameEn: "Mono", descAr: "أسود وأصفر، تصميم بسيط بعنوان ضخم مع قلم تحديد أصفر وخط أسود عريض، وجداول خفيفة بدون خلفيات.", descEn: "Black and highlighter yellow: a minimal layout, an oversized highlighted title and hairline tables.", paper: "#ffffff", accent: "#111111", metal: "#f2c230", layout: "mono", ink: 1 },
  { id: "ribbon", nameAr: "الشريطي", nameEn: "Ribbon", descAr: "تركوازي ومرجاني، شريط علامة كتاب نازل من أعلى الصفحة فيه الشعار، وصفوف الجدول كروت مستديرة.", descEn: "Teal and coral: a bookmark ribbon with the logo hangs from the top; table rows are rounded cards.", paper: "#fffdf9", accent: "#125b67", metal: "#e07a5f", layout: "ribbon", ink: 2 },
  { id: "mosaic", nameAr: "الفسيفسائي", nameEn: "Mosaic", descAr: "كوبالت وتيراكوتا وزعفراني، شريط زليج مغربي أعلى وأسفل كل صفحة، وشعار داخل مثمن.", descEn: "Cobalt, terracotta and saffron: a Moroccan zellige tile band on every page and an octagonal logo.", paper: "#fdfaf4", accent: "#1c3f94", metal: "#e0a526", layout: "mosaic", ink: 2 },
  { id: "ocean", nameAr: "البحري", nameEn: "Ocean", descAr: "أزرق محيطي وفيروزي، رأس متدرّج بحافة موجة، وجدول برأس فاتح.", descEn: "Ocean blue and turquoise: a gradient header with a wave edge and light aqua tables.", paper: "#ffffff", accent: "#0a4d68", metal: "#05bfdb", layout: "ocean", ink: 3 },
  { id: "sadu", nameAr: "السدو", nameEn: "Sadu", descAr: "أحمر وأسود وعاجي، نقشة السدو النجدية على جانب كل صفحة وأعلاها، وعنوان بخط الرقعة.", descEn: "Sadu red, black and ivory: the Najdi Al-Sadu weave down the side of every page, and a calligraphic title.", paper: "#f7f0e1", accent: "#1a1a1a", metal: "#8e1b1b", layout: "sadu", ink: 2 },
  { id: "glass", nameAr: "الزجاجي", nameEn: "Glass", descAr: "جرافيتي ونيلي، كارت عصري مستدير بتوهج ناعم، وجدول مستدير برأس فاتح.", descEn: "Graphite and indigo: a modern rounded card with a soft glow and a rounded table with a light header.", paper: "#f6f8fb", accent: "#334155", metal: "#6366f1", layout: "glass", ink: 1 },
  { id: "gazette", nameAr: "الصحفي", nameEn: "Gazette", descAr: "أسود وأحمر داكن، ترويسة جريدة بخط نسخ كبير، وجداول بثلاث خطوط فقط على الطريقة الصحفية.", descEn: "Ink black and dark red: a newspaper masthead in serif type and three-rule tables.", paper: "#fbf9f4", accent: "#1a1a1a", metal: "#8b0000", layout: "gazette", ink: 1 },
  { id: "prism", nameAr: "الماسي", nameEn: "Prism", descAr: "أسود وفضي وأزرق ثلجي، رأس بقصّات ماسية متعددة الأوجه، وشعار داخل سداسي فضي.", descEn: "Black, silver and ice blue: a faceted, crystal-cut header and a silver hexagon logo.", paper: "#ffffff", accent: "#1c1c1e", metal: "#7dd3fc", layout: "prism", ink: 3 },
  { id: "crimson", nameAr: "القرمزي", nameEn: "Crimson", descAr: "قرمزي وجرافيتي، شريط علوي بخطوط مائلة وكتلة عنوان مقسومة بزاوية.", descEn: "Crimson and graphite, a diagonal-striped top bar and an angled split title block.", paper: "#ffffff", accent: "#2b2d31", metal: "#9b1c31", layout: "stripe", ink: 2 },
];

/** A small drawing of the page layout in the design's colours. */
function Thumb({ d }: { d: Design }) {
  const rows = Array.from({ length: 7 });
  const table = (
    <div className="space-y-[3px]">
      <div className="h-[7px] rounded-[1px]" style={{ background: d.accent }} />
      {rows.map((_, i) => (
        <div key={i} className="h-[5px] rounded-[1px]" style={{ background: i % 2 ? `${d.metal}22` : "#00000010" }} />
      ))}
    </div>
  );
  const title = <div className="mx-auto h-[6px] w-1/2 rounded-full" style={{ background: d.accent, opacity: 0.85 }} />;
  const sigs = (
    <div className="flex items-end justify-between gap-2 pt-1">
      <div className="h-[2px] flex-1" style={{ background: d.accent }} />
      <div className="h-4 w-4 rounded-full border-2" style={{ borderColor: d.metal }} />
      <div className="h-[2px] flex-1" style={{ background: d.accent }} />
    </div>
  );
  return (
    <div
      className="relative mx-auto aspect-[210/297] w-full max-w-[150px] overflow-hidden rounded-sm shadow-md ring-1 ring-black/10"
      style={{ background: d.paper }}
      aria-hidden
    >
      {d.layout === "frame" && <div className="absolute inset-[5px] border-[3px] border-double" style={{ borderColor: d.metal }} />}
      {d.layout === "spine-left" && <div className="absolute inset-y-0 left-0 w-[9px]" style={{ background: d.accent, boxShadow: `inset -1px 0 0 ${d.metal}` }} />}
      {d.layout === "spine-right" && <div className="absolute inset-y-0 right-0 w-[13px]" style={{ background: d.accent, boxShadow: `inset 1px 0 0 ${d.metal}` }} />}
      {d.layout === "damask" && (
        <>
          <div className="absolute inset-0 opacity-[.08]" style={{ backgroundImage: `radial-gradient(${d.accent} 1.2px, transparent 1.5px)`, backgroundSize: "9px 9px" }} />
          <div className="absolute -right-[14px] top-[10px] h-[7px] w-[60px] rotate-45" style={{ background: d.accent, borderBlock: `1px solid ${d.metal}` }} />
          <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: d.accent }} />
          <div className="absolute inset-x-0 bottom-0 h-[6px]" style={{ background: d.accent }} />
        </>
      )}
      {d.layout === "arch" && (
        <>
          <div className="absolute left-[4px] top-[4px] h-[8px] w-[12px] border-l-2 border-t-2" style={{ borderColor: d.metal }} />
          <div className="absolute right-[4px] top-[4px] h-[8px] w-[12px] border-r-2 border-t-2" style={{ borderColor: d.metal }} />
          <div className="absolute bottom-[4px] left-[4px] h-[8px] w-[12px] border-b-2 border-l-2" style={{ borderColor: d.metal }} />
          <div className="absolute bottom-[4px] right-[4px] h-[8px] w-[12px] border-b-2 border-r-2" style={{ borderColor: d.metal }} />
        </>
      )}
      {d.layout === "dunes" && (
        <div className="absolute inset-x-0 bottom-0 h-[16px]" style={{ background: `repeating-radial-gradient(ellipse at 50% 140%, ${d.metal}55 0 2px, #efe3c4 2px 5px)`, borderTop: `1px solid ${d.accent}` }} />
      )}
      {d.layout === "stripe" && (
        <div className="absolute inset-x-0 top-0 h-[5px]" style={{ background: d.accent }}>
          <div className="h-full w-2/5" style={{ background: `repeating-linear-gradient(-45deg, ${d.metal} 0 3px, ${d.accent} 3px 6px)` }} />
        </div>
      )}
      {d.layout === "ledger" && (
        <div className="absolute inset-y-0 right-[14px] w-[4px] border-x" style={{ borderColor: d.metal }} />
      )}
      {d.layout === "ribbon" && (
        <div className="absolute right-[6px] top-0 h-[40px] w-[16px]" style={{ background: d.accent, clipPath: "polygon(0 0,100% 0,100% 100%,50% 82%,0 100%)" }} />
      )}
      {d.layout === "mosaic" && (
        <>
          <div className="absolute inset-x-0 top-0 h-[7px]" style={{ background: `repeating-linear-gradient(90deg, ${d.accent} 0 5px, #e0a526 5px 7px, #c1502e 7px 10px)` }} />
          <div className="absolute inset-x-0 bottom-0 h-[5px]" style={{ background: `repeating-linear-gradient(90deg, ${d.accent} 0 5px, #e0a526 5px 7px, #c1502e 7px 10px)` }} />
        </>
      )}
      {d.layout === "sadu" && (
        <div className="absolute inset-y-0 left-0 w-[8px]" style={{ background: `repeating-linear-gradient(180deg, ${d.metal} 0 5px, #1a1a1a 5px 8px, #c8963e 8px 9px)` }} />
      )}
      {d.layout === "lattice" && (
        <>
          <div className="absolute inset-x-0 top-0 h-[6px]" style={{ background: d.accent, borderBottom: `1px solid ${d.metal}` }} />
          <div className="absolute inset-x-0 bottom-0 h-[6px]" style={{ background: d.accent, borderTop: `1px solid ${d.metal}` }} />
        </>
      )}
      <div
        className={cn(
          "absolute inset-0 flex flex-col gap-[6px] p-[12px]",
          d.layout === "spine-left" && "pl-[16px]",
          d.layout === "spine-right" && "pr-[20px]"
        )}
      >
        {d.layout === "classic" && (
          <>
            <div className="h-[2px]" style={{ background: `linear-gradient(90deg, ${d.accent}, ${d.metal}, ${d.accent})` }} />
            <div className="flex items-center justify-between">
              <div className="h-[5px] w-1/2 rounded-full" style={{ background: d.accent }} />
              <div className="h-[9px] w-[18px] rounded-[2px] border" style={{ borderColor: "#cbd5e1" }} />
            </div>
            <div className="h-[10px] rounded-[2px] border" style={{ borderColor: "#cbd5e1", background: "#f1f5f9" }} />
          </>
        )}
        {(d.layout === "frame" || d.layout === "spine-left" || d.layout === "slant") && (
          <div
            className={cn("-mx-[12px] -mt-[12px] h-[34px]", d.layout === "frame" && "mx-[-4px] mt-[-4px]", d.layout === "spine-left" && "-ml-[7px]")}
            style={{
              background: d.layout === "slant" ? `linear-gradient(135deg, #081a3f, ${d.accent})` : d.accent,
              clipPath: d.layout === "slant" ? "polygon(0 0,100% 0,100% 75%,0 100%)" : undefined,
              borderBottom: d.layout === "frame" ? `2px solid ${d.metal}` : undefined,
            }}
          >
            <div className="flex h-full items-center justify-end gap-1.5 px-2">
              <div className="h-[4px] w-10 rounded-full" style={{ background: d.metal }} />
              <div className="h-3.5 w-3.5 rounded-full" style={{ background: d.metal }} />
            </div>
          </div>
        )}
        {d.layout === "band" && (
          <div className="-mx-[12px] -mt-[12px] flex h-[38px] flex-col items-center justify-center gap-1" style={{ background: d.accent, borderBottom: `2px solid ${d.metal}` }}>
            <div className="h-3 w-3 rotate-45 border" style={{ borderColor: d.metal }} />
            <div className="h-[3px] w-12 rounded-full" style={{ background: d.metal }} />
          </div>
        )}
        {d.layout === "lattice" && (
          <div className="mt-[4px] flex flex-col items-center gap-1">
            <div className="h-5 w-5 rounded-full border-[3px]" style={{ borderColor: d.metal }} />
            <div className="h-[4px] w-14 rounded-full" style={{ background: d.accent }} />
          </div>
        )}
        {d.layout === "arch" && (
          <div className="flex flex-col items-center gap-1">
            <div className="h-[22px] w-[18px] rounded-t-full border-2" style={{ background: d.accent, borderColor: d.metal }} />
            <div className="h-[8px] w-full" style={{ background: `${d.accent}14`, borderBlock: `1px solid ${d.accent}33` }} />
          </div>
        )}
        {d.layout === "split" && (
          <div className="-mx-[12px] -mt-[12px] grid h-[36px] grid-cols-[1fr_38%]">
            <div className="flex flex-col justify-end gap-1 p-2">
              <div className="h-[4px] w-2/3 self-end rounded-full" style={{ background: d.accent }} />
              <div className="h-[2px] w-1/3 self-end rounded-full" style={{ background: d.metal }} />
            </div>
            <div className="order-first flex items-center justify-center" style={{ background: d.accent }}>
              <div className="h-[8px] w-[14px] rounded-sm" style={{ background: d.metal }} />
            </div>
          </div>
        )}
        {d.layout === "damask" && (
          <div className="flex flex-col items-center gap-1">
            <div className="h-5 w-5 rounded-full border-[3px]" style={{ borderColor: d.metal }} />
            <div className="h-[4px] w-14 rounded-full" style={{ background: d.accent }} />
          </div>
        )}
        {d.layout === "dunes" && (
          <div className="flex flex-col items-end gap-1 border-r-[3px] pr-1.5" style={{ borderColor: d.metal }}>
            <div className="h-[7px] w-3/4 rounded-full" style={{ background: d.accent }} />
            <div className="h-[2px] w-1/3 rounded-full" style={{ background: d.metal }} />
          </div>
        )}
        {d.layout === "stripe" && (
          <div className="-mx-[12px] h-[20px]" style={{ background: `linear-gradient(105deg, ${d.accent} 0 30%, ${d.metal} 30%)` }} />
        )}
        {d.layout === "ledger" && (
          <div className="flex items-start justify-between border-b-[3px] border-double pb-1 pr-[10px]" style={{ borderColor: d.accent }}>
            <div className="h-[16px] w-[26px] border" style={{ borderColor: d.accent }}><div className="h-[4px]" style={{ background: d.accent }} /></div>
            <div className="h-[6px] w-1/2 rounded-full" style={{ background: d.accent }} />
          </div>
        )}
        {d.layout === "blueprint" && (
          <div
            className="-mx-[12px] -mt-[12px] flex h-[36px] items-end justify-between p-2"
            style={{ background: `linear-gradient(rgba(255,255,255,.18) 1px, transparent 1px) 0 0/8px 8px, linear-gradient(90deg, rgba(255,255,255,.18) 1px, transparent 1px) 0 0/8px 8px, ${d.accent}` }}
          >
            <div className="h-[16px] w-[26px] border border-white/80" />
            <div className="h-[5px] w-1/2 rounded-full bg-white" />
          </div>
        )}
        {d.layout === "mono" && (
          <div className="border-b-[4px] pb-1" style={{ borderColor: d.accent }}>
            <div className="ml-auto h-[9px] w-3/4" style={{ background: `linear-gradient(transparent 55%, ${d.metal} 55%)` }}>
              <div className="h-[6px] w-full rounded-sm" style={{ background: d.accent, opacity: 0.85 }} />
            </div>
          </div>
        )}
        {d.layout === "ribbon" && (
          <div className="flex flex-col items-end gap-1 pr-[22px]">
            <div className="h-[6px] w-2/3 rounded-full" style={{ background: d.accent }} />
            <div className="flex gap-1"><span className="h-[5px] w-[14px] rounded-full border" style={{ borderColor: d.metal }} /><span className="h-[5px] w-[14px] rounded-full border" style={{ borderColor: d.metal }} /></div>
          </div>
        )}
        {d.layout === "mosaic" && (
          <div className="mt-[4px] flex flex-col items-center gap-1">
            <div className="h-5 w-5" style={{ background: d.accent, clipPath: "polygon(30% 0,70% 0,100% 30%,100% 70%,70% 100%,30% 100%,0 70%,0 30%)" }} />
            <div className="h-[4px] w-14 rounded-full" style={{ background: "#c1502e" }} />
          </div>
        )}
        {d.layout === "ocean" && (
          <div className="relative -mx-[12px] -mt-[12px] h-[38px] overflow-hidden" style={{ background: `linear-gradient(120deg, ${d.accent}, ${d.metal})` }}>
            <div className="absolute right-2 top-3 h-[5px] w-1/2 rounded-full bg-white" />
            <div className="absolute -bottom-[10px] -left-[10%] h-[20px] w-[120%] rounded-[50%] bg-white" />
          </div>
        )}
        {d.layout === "sadu" && (
          <div className="grid grid-cols-[1fr_40%] gap-1.5 pl-[8px]">
            <div className="flex flex-col items-end gap-1"><div className="h-[7px] w-full rounded-full" style={{ background: d.metal }} /></div>
            <div className="order-first h-[20px]" style={{ background: d.accent, borderBottom: `2px solid ${d.metal}` }} />
          </div>
        )}
        {d.layout === "glass" && (
          <div className="relative overflow-hidden rounded-[6px] bg-white p-1.5 shadow-sm">
            <div className="absolute -left-3 -top-4 h-10 w-10 rounded-full" style={{ background: `radial-gradient(circle, ${d.metal}55, transparent 70%)` }} />
            <div className="ml-auto h-[6px] w-2/3 rounded-full" style={{ background: d.accent }} />
            <div className="mt-1 ml-auto h-[4px] w-1/3 rounded-full" style={{ background: d.metal }} />
          </div>
        )}
        {d.layout === "gazette" && (
          <div className="flex flex-col items-center gap-[3px]">
            <div className="h-px w-full" style={{ background: d.accent }} />
            <div className="h-[8px] w-3/4 rounded-sm" style={{ background: d.accent }} />
            <div className="h-[3px] w-full border-y" style={{ borderColor: d.accent }} />
            <div className="ml-auto h-[3px] w-1/4" style={{ background: d.metal }} />
          </div>
        )}
        {d.layout === "prism" && (
          <div
            className="-mx-[12px] -mt-[12px] flex h-[36px] items-end justify-end p-2"
            style={{ background: `linear-gradient(135deg, #2b2c31 25%, #1c1c1e 25% 50%, #3d4047 50% 60%, ${d.metal}55 60% 66%, #232327 66%)` }}
          >
            <div className="h-[5px] w-1/2 rounded-full" style={{ background: "#c0c4cc" }} />
          </div>
        )}
        {d.layout === "spine-right" && (
          <div className="flex items-center justify-between border-b pb-1" style={{ borderColor: `${d.metal}55` }}>
            <div className="h-[5px] w-12 rounded-full" style={{ background: d.accent }} />
            <div className="h-[3px] w-6 rounded-full" style={{ background: d.metal }} />
          </div>
        )}
        {d.layout !== "classic" && title}
        {table}
        <div className="flex-1" />
        {sigs}
      </div>
    </div>
  );
}

export function PrintDesignsTab({ canEdit, isRtl }: { canEdit: boolean; isRtl: boolean }) {
  const queryClient = useQueryClient();
  const { data: current, isLoading } = useQuery({ queryKey: ["settings", "print-theme"], queryFn: settingsApi.getPrintTheme });
  const [previewing, setPreviewing] = useState<PrintThemeId | null>(null);

  const save = useMutation({
    mutationFn: (theme: PrintThemeId) => settingsApi.updatePrintTheme(theme),
    onSuccess: (res) => {
      queryClient.setQueryData(["settings", "print-theme"], res.data.theme);
      const d = DESIGNS.find((x) => x.id === res.data.theme);
      toast.success(isRtl ? `تم اعتماد تصميم الطباعة: ${d?.nameAr}` : `Print design set: ${d?.nameEn}`);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  async function preview(id: PrintThemeId) {
    setPreviewing(id);
    try {
      await openPdfInNewTab("/settings/print-theme/preview", { theme: id }, `print-design-${id}.pdf`);
    } catch {
      // openPdfInNewTab already reported it
    } finally {
      setPreviewing(null);
    }
  }

  return (
    <div className="space-y-6">
    <Card className="rounded-2xl border border-border/80 shadow-sm">
      <CardHeader className="space-y-1">
        <div className="flex items-center gap-3">
          <AppleIcon icon={Printer} tone="indigo" size="sm" />
          <div>
            <CardTitle className="text-lg font-bold">{isRtl ? "تصميم الطباعة" : "Print Design"}</CardTitle>
            <CardDescription className="text-xs">
              {isRtl
                ? "اختر شكل كل المطبوعات الرسمية: التقارير وسند الصرف وملف الموظف. كل التصميمات A4 طولي، وزر المعاينة يطبع تقرير المؤسسات الفعلي بالتصميم."
                : "Choose the look of every official print: reports, payment vouchers and employee profiles. All designs are A4 portrait; Preview prints your real establishments report in that design."}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {DESIGNS.map((d) => {
              const selected = current === d.id;
              return (
                <div
                  key={d.id}
                  className={cn(
                    "relative flex flex-col gap-3 rounded-2xl border bg-card p-4 transition-shadow",
                    selected ? "border-primary ring-2 ring-primary/30 shadow-md" : "border-border/80 hover:shadow-sm"
                  )}
                >
                  {selected && (
                    <span className="absolute top-3 end-3 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                      <Check className="h-3 w-3" />
                      {isRtl ? "المعتمد" : "In use"}
                    </span>
                  )}
                  <div className="rounded-xl bg-muted/40 py-4">
                    <Thumb d={d} />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-bold text-sm">{isRtl ? d.nameAr : d.nameEn}</h3>
                      <div className="flex gap-1" aria-hidden>
                        {[d.accent, d.metal, d.paper].map((c) => (
                          <span key={c} className="h-3.5 w-3.5 rounded-full ring-1 ring-black/10" style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">{isRtl ? d.descAr : d.descEn}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {isRtl ? "استهلاك الحبر: " : "Ink use: "}
                      <span className="font-semibold text-foreground">
                        {isRtl ? ["منخفض", "متوسط", "عالي"][d.ink - 1] : ["Low", "Medium", "High"][d.ink - 1]}
                      </span>
                    </p>
                  </div>
                  <div className="mt-auto flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-xl text-xs"
                      disabled={previewing !== null}
                      onClick={() => preview(d.id)}
                    >
                      {previewing === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
                      {isRtl ? "معاينة PDF" : "Preview PDF"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 gap-1.5 rounded-xl text-xs"
                      disabled={!canEdit || selected || save.isPending}
                      onClick={() => save.mutate(d.id)}
                    >
                      {save.isPending && save.variables === d.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                      {selected ? (isRtl ? "مستخدم حالياً" : "In use") : isRtl ? "اعتماد التصميم" : "Use this design"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
    <PrintSignaturesCard canEdit={canEdit} isRtl={isRtl} />
    </div>
  );
}
