import type { PrintThemeId } from "@/api/settings";
import { PRINT_CONCEPTS } from "./print-template-documents";

type Layout =
  | "classic" | "frame" | "band" | "spine-left" | "lattice" | "slant" | "spine-right" | "arch" | "split" | "damask" | "dunes" | "stripe"
  | "ledger" | "blueprint" | "mono" | "ribbon" | "mosaic" | "ocean" | "sadu" | "glass" | "gazette" | "prism"
  | "pearl" | "passport" | "airmail" | "bauhaus" | "palm" | "circuit" | "topo" | "marble" | "ticket" | "calligraphy";

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
  /** One of the ten designs added with the live preview. */
  fresh?: boolean;
}

// Keep in sync with server/src/services/printThemes.ts.
export const DESIGNS: Design[] = [
  ...PRINT_CONCEPTS.map((t): Design => ({ id: `studio_${t.id}` as PrintThemeId, nameAr: `${t.name} — مجموعة الطباعة`, nameEn: `${t.english} — Print Collection`, descAr: t.description, descEn: `${t.english}: reports, employee profiles and payment vouchers.`, paper: "#ffffff", accent: t.color, metal: t.accent, layout: "classic", ink: 1, fresh: true })),
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
  { id: "pearl", nameAr: "لؤلؤ", nameEn: "Pearl", descAr: "مطابق لتصميم الموقع: ورق لؤلؤي وإضاءة باستيل ناعمة وبطاقات زجاجية مستديرة وجدول برأس متدرّج.", descEn: "Matches the SanaD site: pearl paper, soft pastel light, rounded glass cards and a gradient table header.", paper: "#f2f4f9", accent: "#172033", metal: "#0a84c6", layout: "pearl", ink: 2, fresh: true },
  { id: "passport", nameAr: "الجوازي", nameEn: "Passport", descAr: "أخضر رسمي وذهبي، نقش أمان محفور مثل جواز السفر، شريط هولوغرام وسطر مقروء آليًا.", descEn: "Official green and gold: passport-style security engraving, a holographic stripe and a machine-readable line.", paper: "#fbfaf4", accent: "#0d4f3a", metal: "#b8914a", layout: "passport", ink: 2, fresh: true },
  { id: "airmail", nameAr: "البريدي", nameEn: "Airmail", descAr: "حواف البريد الجوي الحمراء والزرقاء على كل صفحة، ختم بريد دائري وطابع مخرّم بشعار الشركة.", descEn: "Red and blue airmail edges on every page, a round postmark and a perforated stamp with your logo.", paper: "#fdfbf6", accent: "#1d3f8f", metal: "#c8102e", layout: "airmail", ink: 2, fresh: true },
  { id: "bauhaus", nameAr: "الباوهاوس", nameEn: "Bauhaus", descAr: "أشكال هندسية بالأحمر والأصفر والأزرق، خطوط سوداء عريضة وشبكة صارمة.", descEn: "Red, yellow and blue geometric shapes, heavy black rules and a strict grid.", paper: "#f7f3ea", accent: "#111111", metal: "#d62828", layout: "bauhaus", ink: 3, fresh: true },
  { id: "palm", nameAr: "النخيل", nameEn: "Palm", descAr: "أخضر مريمي ورملي، سعف نخيل مرسوم بخط رفيع حول العنوان وعنوان بخط الرقعة.", descEn: "Sage green and sand: line-drawn palm fronds around a calligraphic title.", paper: "#fbf8f1", accent: "#3f5b45", metal: "#c9a66b", layout: "palm", ink: 1, fresh: true },
  { id: "circuit", nameAr: "التقني", nameEn: "Circuit", descAr: "لوحة إلكترونية داكنة بمسارات وعقد بلون النعناع، وبيانات بخط برمجي.", descEn: "A dark circuit board with mint traces and nodes, and code-style metadata.", paper: "#ffffff", accent: "#0b2e33", metal: "#2de2b4", layout: "circuit", ink: 3, fresh: true },
  { id: "topo", nameAr: "الطبوغرافي", nameEn: "Topographic", descAr: "خطوط كنتور خريطة طبوغرافية بالتيراكوتا، دبوس موقع وإحداثيات.", descEn: "Terracotta map contour lines, a location pin and coordinates.", paper: "#fffdf9", accent: "#2b2b2b", metal: "#c65d3b", layout: "topo", ink: 2, fresh: true },
  { id: "marble", nameAr: "الرخامي", nameEn: "Marble", descAr: "رخام أبيض بعروق رمادية وخيوط ذهبية، وشعار داخل ميدالية.", descEn: "White marble with grey veins and gold hairlines, the logo in a medallion.", paper: "#ffffff", accent: "#2a2a2e", metal: "#b89a5a", layout: "marble", ink: 2, fresh: true },
  { id: "ticket", nameAr: "التذكرة", nameEn: "Ticket", descAr: "الترويسة على شكل بطاقة صعود طائرة بكعب مقطوع وباركود.", descEn: "The heading as a boarding pass with a torn stub and a barcode.", paper: "#faf8fd", accent: "#3b1d6e", metal: "#f07f2e", layout: "ticket", ink: 2, fresh: true },
  { id: "calligraphy", nameAr: "الخطّاط", nameEn: "Calligraphy", descAr: "ضربة فرشاة حبر عريضة خلف العنوان وختم أحمر باسم الشركة.", descEn: "A broad ink brush stroke behind the title and a red seal with the company name.", paper: "#fbf7ee", accent: "#161616", metal: "#b3261e", layout: "calligraphy", ink: 2, fresh: true },
  { id: "crimson", nameAr: "القرمزي", nameEn: "Crimson", descAr: "قرمزي وجرافيتي، شريط علوي بخطوط مائلة وكتلة عنوان مقسومة بزاوية.", descEn: "Crimson and graphite, a diagonal-striped top bar and an angled split title block.", paper: "#ffffff", accent: "#2b2d31", metal: "#9b1c31", layout: "stripe", ink: 2 },
];
