import type { PaymentCategory } from "@prisma/client";
import { isEn } from "@/services/lang";

// Arabic labels for printed reports and exports. Typed against the Prisma
// enum, so adding a category without a label fails to compile. The client's
// grouped list lives in client/src/api/payments.ts.
export const PAYMENT_CATEGORY_LABELS_AR: Record<PaymentCategory, string> = {
  // The categories offered in the payment form
  COMMERCIAL_REGISTRATION: "سجل تجاري",
  MUNICIPAL_LICENSE: "رخصة تجارية",
  CLEANING: "عقد النظافة",
  RENT: "عقد الإيجار",
  TOBACCO_LICENSE: "ترخيص التبغ",
  PERMIT_24H: "تصريح 24 ساعة",
  IQAMA: "إقامة",
  VISA: "تأشيرات",
  SPONSORSHIP_TRANSFER: "نقل كفالة",
  PROFESSION_CHANGE: "تعديل مهنة",
  RENT_PAYMENT: "إيجار",
  INTERNET: "إنترنت",
  ELECTRICITY: "كهرباء",
  WATER: "مياه",
  MAINTENANCE: "صيانة",
  PURCHASES: "مشتريات",
  SUBSCRIPTION: "اشتراك",

  // Older categories no longer offered in the form, kept for existing records
  // السجل التجاري والتراخيص
  COMMERCIAL_REGISTRATION_ISSUE: "إصدار سجل تجاري",
  COMMERCIAL_REGISTRATION_RENEWAL: "تجديد سجل تجاري",
  COMMERCIAL_REGISTRATION_AMENDMENT: "تعديل سجل تجاري",
  COMMERCIAL_REGISTRATION_CANCELLATION: "شطب سجل تجاري",
  MUNICIPAL_LICENSE_ISSUE: "إصدار رخصة تجارية (بلدية)",
  MUNICIPAL_LICENSE_RENEWAL: "تجديد رخصة تجارية (بلدية)",
  MUNICIPAL_LICENSE_AMENDMENT: "تعديل رخصة تجارية (بلدية)",
  MUNICIPAL_LICENSE_CANCELLATION: "إلغاء رخصة تجارية (بلدية)",
  CHAMBER_OF_COMMERCE: "اشتراك الغرفة التجارية",
  CIVIL_DEFENSE: "رخصة الدفاع المدني",
  MUNICIPALITY: "رسوم بلدية أخرى",
  LICENSES: "تراخيص أخرى",

  // الإقامات والتأشيرات
  IQAMA_ISSUE: "إصدار إقامة",
  IQAMA_RENEWAL: "تجديد إقامة",
  WORK_PERMIT: "رسوم رخصة العمل",
  EXPAT_LEVY: "المقابل المالي",
  DEPENDENTS_FEE: "رسوم المرافقين",
  WORK_VISA: "إصدار تأشيرة عمل",
  EXIT_REENTRY_VISA: "تأشيرة خروج وعودة",
  FINAL_EXIT_VISA: "تأشيرة خروج نهائي",
  PASSPORT: "خدمات الجوازات",

  // التأمينات والرسوم الحكومية
  GOSI: "التأمينات الاجتماعية",
  MEDICAL_INSURANCE: "التأمين الطبي",
  ZAKAT_TAX: "الزكاة والضريبة",
  GOVERNMENT_FINES: "غرامات ومخالفات حكومية",
  GOVERNMENT_FEES: "رسوم حكومية أخرى",
  EMPLOYEE_DOCUMENTS: "مستندات الموظفين",

  // مصروفات تشغيلية
  INSURANCE: "تأمين آخر",
  MEDICAL: "فحوصات طبية",
  OTHER: "أخرى",
};

/** English labels, the same as the client's (i18n en.json). */
const PAYMENT_CATEGORY_LABELS_EN: Record<string, string> = {
  COMMERCIAL_REGISTRATION: "Commercial registration",
  MUNICIPAL_LICENSE: "Business license",
  CLEANING: "Cleaning contract",
  RENT: "Lease contract",
  TOBACCO_LICENSE: "Tobacco license",
  PERMIT_24H: "24-hour permit",
  IQAMA: "Iqama",
  VISA: "Visas",
  SPONSORSHIP_TRANSFER: "Sponsorship transfer",
  PROFESSION_CHANGE: "Profession change",
  RENT_PAYMENT: "Rent",
  INTERNET: "Internet",
  ELECTRICITY: "Electricity",
  WATER: "Water",
  MAINTENANCE: "Maintenance",
  PURCHASES: "Purchases",
  SUBSCRIPTION: "Subscription",
  COMMERCIAL_REGISTRATION_ISSUE: "Commercial registration — issue",
  COMMERCIAL_REGISTRATION_RENEWAL: "Commercial registration — renewal",
  COMMERCIAL_REGISTRATION_AMENDMENT: "Commercial registration — amendment",
  COMMERCIAL_REGISTRATION_CANCELLATION: "Commercial registration — cancellation",
  MUNICIPAL_LICENSE_ISSUE: "Municipal business license — issue",
  MUNICIPAL_LICENSE_RENEWAL: "Municipal business license — renewal",
  MUNICIPAL_LICENSE_AMENDMENT: "Municipal business license — amendment",
  MUNICIPAL_LICENSE_CANCELLATION: "Municipal business license — cancellation",
  CHAMBER_OF_COMMERCE: "Chamber of Commerce subscription",
  CIVIL_DEFENSE: "Civil Defense license",
  MUNICIPALITY: "Other municipal fees",
  LICENSES: "Other licenses",
  IQAMA_ISSUE: "Iqama — issue",
  IQAMA_RENEWAL: "Iqama — renewal",
  WORK_PERMIT: "Work permit fee",
  EXPAT_LEVY: "Expat levy",
  DEPENDENTS_FEE: "Dependents fee",
  WORK_VISA: "Work visa issuance",
  EXIT_REENTRY_VISA: "Exit & re-entry visa",
  FINAL_EXIT_VISA: "Final exit visa",
  PASSPORT: "Passport services",
  GOSI: "GOSI (social insurance)",
  MEDICAL_INSURANCE: "Medical insurance",
  ZAKAT_TAX: "Zakat & tax",
  GOVERNMENT_FINES: "Government fines & violations",
  GOVERNMENT_FEES: "Other government fees",
  EMPLOYEE_DOCUMENTS: "Employee documents",
  INSURANCE: "Other insurance",
  MEDICAL: "Medical checkups",
  OTHER: "Other",
};
const PAYMENT_METHOD_LABELS_EN: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};
const SUBTYPE_LABELS_EN: Record<string, string> = {
  ISSUE: "Issue",
  RENEWAL: "Renewal",
  CANCELLATION: "Cancellation",
  AMENDMENT: "Amendment",
  EXIT_REENTRY: "Exit & re-entry",
  FINAL_EXIT: "Final exit",
  WORK_VISA: "Work visa",
};

const PAYMENT_METHOD_LABELS_AR: Record<string, string> = {
  CASH: "نقدًا",
  BANK_TRANSFER: "تحويل بنكي",
  CARD: "بطاقة",
  ONLINE: "دفع إلكتروني",
  OTHER: "أخرى",
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return (isEn() ? PAYMENT_METHOD_LABELS_EN : PAYMENT_METHOD_LABELS_AR)[method] ?? method;
}

/** Sub-types a category requires (stored in Payment.type). Keep in sync with
 * PAYMENT_SUBTYPES in client/src/api/payments.ts. */
export const PAYMENT_SUBTYPES: Partial<Record<PaymentCategory, string[]>> = {
  IQAMA: ["ISSUE", "RENEWAL"],
  COMMERCIAL_REGISTRATION: ["ISSUE", "RENEWAL"],
  MUNICIPAL_LICENSE: ["ISSUE", "RENEWAL", "CANCELLATION", "AMENDMENT"],
  VISA: ["EXIT_REENTRY", "FINAL_EXIT", "WORK_VISA"],
};

const SUBTYPE_LABELS_AR: Record<string, string> = {
  ISSUE: "إصدار",
  RENEWAL: "تجديد",
  CANCELLATION: "إلغاء",
  AMENDMENT: "تعديل",
  EXIT_REENTRY: "خروج وعودة",
  FINAL_EXIT: "خروج نهائي",
  WORK_VISA: "تأشيرة عمل",
};

/** In the current language, e.g. "إقامة — تجديد" / "Iqama — Renewal" or "تأشيرات — خروج وعودة" when the payment has a sub-type. */
export function paymentCategoryLabel(category: string | null | undefined, type?: string | null): string {
  if (!category) return "—";
  const label = (isEn() ? PAYMENT_CATEGORY_LABELS_EN[category] : PAYMENT_CATEGORY_LABELS_AR[category as PaymentCategory]) ?? category;
  const allowed = PAYMENT_SUBTYPES[category as PaymentCategory];
  const sub = type && allowed?.includes(type) ? (isEn() ? SUBTYPE_LABELS_EN : SUBTYPE_LABELS_AR)[type] : undefined;
  return sub ? `${label} — ${sub}` : label;
}
