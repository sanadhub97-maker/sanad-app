/* (The server prints with the same words: server/src/modules/certificates/money-words.ts.)
   An amount in words, as Saudi letters write it: "فقط ثمانية آلاف وخمسمائة ريال
   سعودي لا غير" / "Eight thousand five hundred Saudi riyals only". */

const ONES = ["", "واحد", "اثنان", "ثلاثة", "أربعة", "خمسة", "ستة", "سبعة", "ثمانية", "تسعة"];
const TEENS = ["عشرة", "أحد عشر", "اثنا عشر", "ثلاثة عشر", "أربعة عشر", "خمسة عشر", "ستة عشر", "سبعة عشر", "ثمانية عشر", "تسعة عشر"];
const TENS = ["", "", "عشرون", "ثلاثون", "أربعون", "خمسون", "ستون", "سبعون", "ثمانون", "تسعون"];
const HUNDREDS = ["", "مائة", "مائتان", "ثلاثمائة", "أربعمائة", "خمسمائة", "ستمائة", "سبعمائة", "ثمانمائة", "تسعمائة"];

/** 0–999 in Arabic words. */
function arBelow1000(n: number) {
  const h = Math.floor(n / 100), r = n % 100;
  const parts: string[] = [];
  if (h) parts.push(HUNDREDS[h]);
  if (r) {
    if (r < 10) parts.push(ONES[r]);
    else if (r < 20) parts.push(TEENS[r - 10]);
    else parts.push(r % 10 ? `${ONES[r % 10]} و${TENS[Math.floor(r / 10)]}` : TENS[Math.floor(r / 10)]);
  }
  return parts.join(" و");
}

/** A count of thousands or millions with its noun in the right form. */
function arScale(n: number, one: string, two: string, few: string, many: string, manyAcc: string) {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${arBelow1000(n)} ${few}`;
  const r = n % 100;
  return `${arBelow1000(n)} ${r >= 11 && r <= 99 ? manyAcc : many}`;
}

export function arabicNumber(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "صفر";
  const m = Math.floor(n / 1_000_000), t = Math.floor((n % 1_000_000) / 1000), r = n % 1000;
  const parts: string[] = [];
  if (m) parts.push(arScale(m, "مليون", "مليونان", "ملايين", "مليون", "مليونًا"));
  if (t) parts.push(arScale(t, "ألف", "ألفان", "آلاف", "ألف", "ألفًا"));
  if (r) parts.push(arBelow1000(r));
  return parts.join(" و");
}

const EN_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
function enBelow1000(n: number) {
  const h = Math.floor(n / 100), r = n % 100;
  const tail = r < 20 ? EN_ONES[r] : `${EN_TENS[Math.floor(r / 10)]}${r % 10 ? `-${EN_ONES[r % 10]}` : ""}`;
  return [h ? `${EN_ONES[h]} hundred` : "", tail].filter(Boolean).join(" ");
}
export function englishNumber(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zero";
  const m = Math.floor(n / 1_000_000), t = Math.floor((n % 1_000_000) / 1000), r = n % 1000;
  return [m ? `${enBelow1000(m)} million` : "", t ? `${enBelow1000(t)} thousand` : "", r ? enBelow1000(r) : ""].filter(Boolean).join(" ");
}

/** "فقط ... ريال سعودي (و ... هللة) لا غير" and its English twin. */
export function amountInWords(amount: number, en: boolean) {
  const riyals = Math.floor(amount + 1e-9);
  const halalas = Math.round((amount - riyals) * 100);
  if (en) {
    const s = `${englishNumber(riyals)} Saudi riyal${riyals === 1 ? "" : "s"}${halalas ? ` and ${englishNumber(halalas)} halala${halalas === 1 ? "" : "s"}` : ""} only`;
    return s.charAt(0).toUpperCase() + s.slice(1);
  }
  return `فقط ${arabicNumber(riyals)} ريال سعودي${halalas ? ` و${arabicNumber(halalas)} هللة` : ""} لا غير`;
}
