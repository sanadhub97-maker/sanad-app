import { isRtlLanguage } from "@/i18n";
import i18n from "@/i18n";

/** Arabic for the server's English messages. The API speaks English; the UI
 * shows these in toasts and form errors, so they follow the UI language here.
 * Keep in sync when a server message is added or reworded — an unmapped
 * message is shown as is. */
const EXACT: Record<string, string> = {
  "A branch with this code already exists.": "توجد مؤسسة مسجلة بنفس الرمز.",
  "A payment with this number already exists.": "توجد دفعة مسجلة بنفس الرقم.",
  "A record with this value already exists.": "يوجد سجل بنفس القيمة مسبقاً.",
  "A role with this name already exists.": "يوجد دور بنفس الاسم مسبقاً.",
  "Account is inactive or no longer exists": "الحساب غير نشط أو لم يعد موجوداً.",
  "All notifications marked as read.": "تم تعليم كل الإشعارات كمقروءة.",
  "An account with this email already exists.": "يوجد حساب مسجل بنفس البريد الإلكتروني.",
  "An employee with this Iqama number already exists.": "يوجد موظف مسجل بنفس رقم الإقامة.",
  "An employee with this employee number already exists.": "يوجد موظف مسجل بنفس الرقم الوظيفي.",
  "Appearance settings saved.": "تم حفظ إعدادات المظهر.",
  "Branch not found": "المؤسسة غير موجودة.",
  "Built-in roles cannot be deleted.": "لا يمكن حذف الأدوار الأساسية للنظام.",
  "Built-in roles cannot be renamed.": "لا يمكن تغيير اسم الأدوار الأساسية للنظام.",
  "Cannot delete a branch that still has employees assigned to it.": "لا يمكن حذف مؤسسة ما زال بها موظفون.",
  "Cannot delete a role that is still assigned to users.": "لا يمكن حذف دور ما زال مُسنداً لمستخدمين.",
  "Choose the employee": "اختر الموظف",
  "Choose the transaction type": "اختر نوع العملية",
  "Company settings saved.": "تم حفظ بيانات الشركة.",
  "Current password is incorrect.": "كلمة المرور الحالية غير صحيحة.",
  "Document deleted successfully.": "تم حذف الوثيقة بنجاح.",
  "Document not found": "الوثيقة غير موجودة.",
  "Document saved successfully.": "تم حفظ الوثيقة بنجاح.",
  "Document type is required to delete this record": "نوع الوثيقة مطلوب لحذف هذا السجل.",
  "Document updated successfully.": "تم تحديث الوثيقة بنجاح.",
  "Email is not configured yet — save SMTP settings first.": "البريد الإلكتروني غير مُعد بعد — احفظ إعدادات SMTP أولاً.",
  "Email settings saved.": "تم حفظ إعدادات البريد الإلكتروني.",
  "Email verified successfully.": "تم تأكيد البريد الإلكتروني بنجاح.",
  "Employee deleted successfully.": "تم حذف الموظف بنجاح.",
  "Employee not found": "الموظف غير موجود.",
  "Employee saved successfully.": "تم حفظ الموظف بنجاح.",
  "Employee updated successfully.": "تم تحديث بيانات الموظف بنجاح.",
  "Expiration rules saved.": "تم حفظ قواعد التنبيه بالانتهاء.",
  "File deleted successfully.": "تم حذف الملف بنجاح.",
  "File not found": "الملف غير موجود.",
  "File uploaded successfully.": "تم رفع الملف بنجاح.",
  Forbidden: "ليس لديك صلاحية لهذا الإجراء.",
  "If an account exists for this email, a reset link has been sent.":
    "إذا كان هناك حساب بهذا البريد، فقد أرسلنا إليه رابط إعادة تعيين كلمة المرور.",
  "Import job not found": "عملية الاستيراد غير موجودة.",
  "Internal server error": "حدث خطأ داخلي في الخادم.",
  "Invalid email or password": "البريد الإلكتروني أو كلمة المرور غير صحيحة.",
  "Invalid or expired access token": "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.",
  "Logged out": "تم تسجيل الخروج.",
  "Missing access token": "يرجى تسجيل الدخول أولاً.",
  "New password must be different from the current password": "يجب أن تختلف كلمة المرور الجديدة عن الحالية.",
  "No file was uploaded.": "لم يتم رفع أي ملف.",
  "No refresh token provided": "يرجى تسجيل الدخول أولاً.",
  "Not found": "غير موجود.",
  "Notification deleted.": "تم حذف الإشعار.",
  "Notification not found": "الإشعار غير موجود.",
  "One or more roles are invalid.": "دور واحد أو أكثر غير صالح.",
  "Password changed successfully.": "تم تغيير كلمة المرور بنجاح.",
  "Password has been reset. Please log in.": "تمت إعادة تعيين كلمة المرور. يرجى تسجيل الدخول.",
  "Payment deleted successfully.": "تم حذف الدفعة بنجاح.",
  "Payment not found": "الدفعة غير موجودة.",
  "Payment saved successfully.": "تم حفظ الدفعة بنجاح.",
  "Payment updated successfully.": "تم تحديث الدفعة بنجاح.",
  "Please upload an Excel (.xlsx) file.": "يرجى رفع ملف Excel بصيغة ‎.xlsx.",
  "Record not found.": "السجل غير موجود.",
  "Role created successfully.": "تم إنشاء الدور بنجاح.",
  "Role deleted successfully.": "تم حذف الدور بنجاح.",
  "Role not found": "الدور غير موجود.",
  "Role updated successfully.": "تم تحديث الدور بنجاح.",
  "Selected branch does not exist.": "المؤسسة المختارة غير موجودة.",
  "Session expired, please log in again.": "انتهت صلاحية الجلسة، يرجى تسجيل الدخول مجدداً.",
  "The same number is listed more than once": "الرقم نفسه مُدرج أكثر من مرة.",
  "This account has been deactivated.": "تم إيقاف هذا الحساب.",
  "This file is not publicly accessible.": "هذا الملف غير متاح للعرض العام.",
  "This reset link is invalid or has expired.": "رابط إعادة التعيين غير صالح أو منتهي الصلاحية.",
  "This verification link is invalid or has expired.": "رابط التحقق غير صالح أو منتهي الصلاحية.",
  "Too many attempts. Please wait a few minutes and try again.": "محاولات كثيرة. يرجى الانتظار بضع دقائق ثم المحاولة مجدداً.",
  "Too many requests": "طلبات كثيرة، يرجى المحاولة بعد قليل.",
  "Too many requests. Please slow down and try again shortly.": "طلبات كثيرة، يرجى المحاولة بعد قليل.",
  Unauthorized: "يرجى تسجيل الدخول أولاً.",
  "User created successfully.": "تم إنشاء المستخدم بنجاح.",
  "User deleted successfully.": "تم حذف المستخدم بنجاح.",
  "User not found": "المستخدم غير موجود.",
  "User updated successfully.": "تم تحديث بيانات المستخدم بنجاح.",
  "Validation failed": "البيانات المدخلة غير صحيحة، يرجى مراجعة الحقول.",
  "WhatsApp is not configured yet — save the WhatsApp settings first.": "واتساب غير مُعد بعد — احفظ إعدادات واتساب أولاً.",
  "WhatsApp settings saved.": "تم حفظ إعدادات واتساب.",
  "You cannot delete your own account.": "لا يمكنك حذف حسابك الشخصي.",
};

/** Messages with a variable tail: [English prefix, Arabic prefix]. */
const PREFIXES: [string, string][] = [
  ["Missing permission: ", "ليس لديك الصلاحية المطلوبة: "],
  ["Unknown permission keys: ", "صلاحيات غير معروفة: "],
  ["Test WhatsApp message sent to ", "تم إرسال رسالة واتساب تجريبية إلى "],
  ["Test email sent to ", "تم إرسال بريد تجريبي إلى "],
  ["WhatsApp send failed: ", "تعذر إرسال رسالة واتساب: "],
  ["Unsupported file type: ", "نوع الملف غير مدعوم: "],
];

export function localizeServerMessage(message: string): string;
export function localizeServerMessage(message: string | undefined): string | undefined;
export function localizeServerMessage(message: string | undefined): string | undefined {
  if (!message || !isRtlLanguage(i18n.language)) return message;
  if (EXACT[message]) return EXACT[message];
  for (const [en, ar] of PREFIXES) {
    if (message.startsWith(en)) return ar + message.slice(en.length).replace(". Allowed:", "، المسموح:").replace(/\.$/, "");
  }
  return message;
}
