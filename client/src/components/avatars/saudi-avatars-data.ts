export interface SaudiAvatarItem {
  id: string;
  gender: "MALE" | "FEMALE";
  titleAr: string;
  titleEn: string;
  tagAr: string;
  tagColor: "amber" | "emerald" | "slate" | "rose" | "cyan" | "blue" | "teal";
}

export const DEFAULT_MALE_AVATAR_ID = "male-shemagh-red";
export const DEFAULT_FEMALE_AVATAR_ID = "female-hijab-emerald";

export const SAUDI_AVATARS_LIST: SaudiAvatarItem[] = [
  // 👔 Male Avatars (6)
  {
    id: "male-shemagh-red",
    gender: "MALE",
    titleAr: "الشماغ الأحمر الملكي",
    titleEn: "Royal Red Shemagh",
    tagAr: "كلاسيكي • الأكثر شعبية",
    tagColor: "amber",
  },
  {
    id: "male-ghutra-white",
    gender: "MALE",
    titleAr: "الغترة البيضاء الدبلوماسية",
    titleEn: "Diplomatic White Ghutra",
    tagAr: "دبلوماسي • وقور",
    tagColor: "emerald",
  },
  {
    id: "male-bisht-royal",
    gender: "MALE",
    titleAr: "البشت الملكي المذهب",
    titleEn: "Royal Bisht with Gold Zari",
    tagAr: "قيادي • كبار الشخصيات",
    tagColor: "amber",
  },
  {
    id: "male-bisht-brown",
    gender: "MALE",
    titleAr: "البشت النجفي البني",
    titleEn: "Camel Brown Bisht",
    tagAr: "أصيل • نجفي فاخر",
    tagColor: "amber",
  },
  {
    id: "male-shemagh-glasses",
    gender: "MALE",
    titleAr: "مهندس / تقني بنظارات وشماغ",
    titleEn: "Tech Executive with Glasses",
    tagAr: "تقني • هندسي",
    tagColor: "cyan",
  },
  {
    id: "male-ghutra-young",
    gender: "MALE",
    titleAr: "شاب مهني طموح بالغترة",
    titleEn: "Young Professional Ghutra",
    tagAr: "عصري • إداري",
    tagColor: "teal",
  },

  // 🧕 Female Avatars (6)
  {
    id: "female-hijab-black",
    gender: "FEMALE",
    titleAr: "الحجاب والعباية السوداء الملكية",
    titleEn: "Executive Black Hijab & Abaya",
    tagAr: "كلاسيكي • تنفيذي",
    tagColor: "slate",
  },
  {
    id: "female-hijab-emerald",
    gender: "FEMALE",
    titleAr: "الحجاب الزمردي التنفيذي",
    titleEn: "Emerald & Navy Corporate Hijab",
    tagAr: "زمردي • شركات",
    tagColor: "emerald",
  },
  {
    id: "female-hijab-rosegold",
    gender: "FEMALE",
    titleAr: "حجاب الورد الترابي المعاصر",
    titleEn: "Dusty Rose Modern Hijab",
    tagAr: "عصري • إداري",
    tagColor: "rose",
  },
  {
    id: "female-niqab-modest",
    gender: "FEMALE",
    titleAr: "النقاب السعودي الرسمي المعتمد",
    titleEn: "Modest Saudi Niqab",
    tagAr: "أصيل • محتشم",
    tagColor: "slate",
  },
  {
    id: "female-hijab-glasses",
    gender: "FEMALE",
    titleAr: "طبيبة / استشارية بنظارات وحجاب",
    titleEn: "Consultant / Eyewear & Hijab",
    tagAr: "طبي • استشاري",
    tagColor: "cyan",
  },
  {
    id: "female-hijab-sapphire",
    gender: "FEMALE",
    titleAr: "حجاب السفير النيلي الملكي",
    titleEn: "Royal Sapphire Navy Hijab",
    tagAr: "قيادي • أزرق ملكي",
    tagColor: "blue",
  },
];

export function resolveAvatarId(avatarId?: string | null, gender?: "MALE" | "FEMALE" | null): string {
  if (avatarId && SAUDI_AVATARS_LIST.some((a) => a.id === avatarId)) {
    return avatarId;
  }
  if (gender === "FEMALE") {
    return DEFAULT_FEMALE_AVATAR_ID;
  }
  return DEFAULT_MALE_AVATAR_ID;
}
