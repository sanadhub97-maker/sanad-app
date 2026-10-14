import type { PrintThemeId } from "@/api/settings";

interface Design {
  id: PrintThemeId;
  nameAr: string;
  nameEn: string;
  descAr: string;
  descEn: string;
  paper: string;
  accent: string;
  metal: string;
  ink: 1 | 2 | 3;
}

// Keep in sync with server/src/services/printThemes.ts (the three house designs of printThemeMalaki.ts).
export const DESIGNS: Design[] = [
  { id: "malaki", nameAr: "الملكي", nameEn: "Royal", descAr: "حبر غامق ودهب قديم، إطار دهبي مزدوج بجواهر على الزوايا، جيوشيه ورا العنوان، وعلامة مائية في كل صفحة. الأهدى والأوفر في الحبر.", descEn: "Deep ink and old gold: a double gold frame with jewelled corners, guilloche behind the title and a watermark on every page.", paper: "#ffffff", accent: "#1a1610", metal: "#9a7433", ink: 1 },
  { id: "zumurrudi", nameAr: "الزمردي الإمبراطوري", nameEn: "Imperial emerald", descAr: "زمردي غامق ودهب، والترويسة على شريط زمردي بإطار دهبي، ورأس الجداول ولوحة المبالغ بالزمردي.", descEn: "Deep emerald and gold, the letterhead on an emerald band, emerald table heads and totals.", paper: "#ffffff", accent: "#0e2b23", metal: "#987232", ink: 2 },
  { id: "aqiq", nameAr: "العقيق", nameEn: "Garnet", descAr: "عقيقي غامق ودهب، وإطار من نجوم إسلامية ثمانية حوالين الصفحة، والترويسة على شريط عقيقي. الأفخم والأكثر زخرفة.", descEn: "Deep garnet and gold in a border of eight-pointed stars, the letterhead on a garnet band.", paper: "#ffffff", accent: "#3e0f1a", metal: "#9a7433", ink: 3 },
];
