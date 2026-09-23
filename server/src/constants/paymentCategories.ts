import type { PaymentCategory } from "@prisma/client";

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

const PAYMENT_METHOD_LABELS_AR: Record<string, string> = {
  CASH: "نقدًا",
  BANK_TRANSFER: "تحويل بنكي",
  CARD: "بطاقة",
  ONLINE: "دفع إلكتروني",
  OTHER: "أخرى",
};

export function paymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "—";
  return PAYMENT_METHOD_LABELS_AR[method] ?? method;
}

export function paymentCategoryLabel(category: string | null | undefined): string {
  if (!category) return "—";
  return PAYMENT_CATEGORY_LABELS_AR[category as PaymentCategory] ?? category;
}
