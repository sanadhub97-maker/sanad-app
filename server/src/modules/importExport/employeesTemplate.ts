import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getPrintLogoPng } from "@/services/branding";
import { addLogoToSheet } from "@/services/excel";
import { L, isEn } from "@/services/lang";

/* The template comes in the interface language: English headers, hints and
   example on English, Arabic ones on Arabic. The importer reads either. */
const headerOf = (c: TemplateColumn) => (isEn() ? `${c.required ? "* " : ""}${c.headerEn}` : c.headerAr);

export interface TemplateColumn {
  key: string;
  headerAr: string;
  headerEn: string;
  width: number;
  required?: boolean;
  group: "identity" | "personal" | "job" | "documents" | "notes";
  noteAr?: string;
  exampleVal: string;
  noteEn?: string;
  exampleEn?: string;
}

const TEMPLATE_COLUMNS: TemplateColumn[] = [
  // 1. Core Identity (إلزامية)
  {
    key: "employeeNumber",
    headerAr: "* رقم الموظف",
    headerEn: "Employee Number",
    width: 22,
    required: true,
    group: "identity",
    noteAr: "رقم فريد غير مكرر لكل موظف (مثل: EMP-001)",
    exampleVal: "EMP-0001",
    noteEn: "A unique number for each employee (e.g. EMP-001)",
    exampleEn: "EMP-0001",
  },
  {
    key: "fullNameAr",
    headerAr: "* الاسم الكامل (عربي)",
    headerEn: "Full Name (Arabic)",
    width: 30,
    required: true,
    group: "identity",
    noteAr: "الاسم الرباعي أو الثلاثي باللغة العربية",
    exampleVal: "عبدالله بن محمد العتيبي",
    noteEn: "The full name in Arabic",
    exampleEn: "عبدالله بن محمد العتيبي",
  },
  {
    key: "fullNameEn",
    headerAr: "الاسم الكامل (إنجليزي)",
    headerEn: "Full Name (English)",
    width: 30,
    group: "identity",
    noteAr: "الاسم باللغة الإنجليزية كما في الجواز أو الإقامة",
    exampleVal: "Abdullah Mohammed Al-Otaibi",
    noteEn: "The name in English as on the passport or iqama",
    exampleEn: "Abdullah Mohammed Al-Otaibi",
  },

  // 2. Personal & Contact
  {
    key: "nationality",
    headerAr: "الجنسية",
    headerEn: "Nationality",
    width: 20,
    group: "personal",
    noteAr: "الجنسية (مثال: سعودي / مصري / أردني...)",
    exampleVal: "سعودي",
    noteEn: "Nationality (e.g. Saudi / Egyptian / Jordanian…)",
    exampleEn: "Saudi",
  },
  {
    key: "gender",
    headerAr: "الجنس",
    headerEn: "Gender",
    width: 18,
    group: "personal",
    noteAr: "الاختيار من القائمة: MALE أو FEMALE (أو: ذكر / أنثى)",
    exampleVal: "MALE",
    noteEn: "Pick from the list: MALE or FEMALE",
    exampleEn: "MALE",
  },
  {
    key: "dateOfBirth",
    headerAr: "تاريخ الميلاد",
    headerEn: "Date of Birth",
    width: 20,
    group: "personal",
    noteAr: "صيغة التاريخ: YYYY-MM-DD (سنة-شهر-يوم)",
    exampleVal: "1992-05-14",
    noteEn: "Date format: YYYY-MM-DD",
    exampleEn: "1992-05-14",
  },
  {
    key: "mobile",
    headerAr: "رقم الجوال",
    headerEn: "Mobile Number",
    width: 20,
    group: "personal",
    noteAr: "رقم الاتصال المباشر (مثل: 0501234567)",
    exampleVal: "0501234567",
    noteEn: "Direct contact number (e.g. 0501234567)",
    exampleEn: "0501234567",
  },
  {
    key: "email",
    headerAr: "البريد الإلكتروني",
    headerEn: "Email Address",
    width: 28,
    group: "personal",
    noteAr: "البريد الإلكتروني الرسمي أو الشخصي",
    exampleVal: "a.alotaibi@example.com",
    noteEn: "Work or personal email",
    exampleEn: "a.alotaibi@example.com",
  },

  // 3. Job & Branch
  {
    key: "jobTitle",
    headerAr: "المسمى الوظيفي",
    headerEn: "Job Title",
    width: 24,
    group: "job",
    noteAr: "المسمى الوظيفي المعتمد في العقد",
    exampleVal: "مدير الموارد البشرية",
    noteEn: "The job title in the contract",
    exampleEn: "HR Manager",
  },
  {
    key: "department",
    headerAr: "القسم / الإدارة",
    headerEn: "Department",
    width: 22,
    group: "job",
    noteAr: "الإدارة التابع لها الموظف",
    exampleVal: "الموارد البشرية",
    noteEn: "The employee's department",
    exampleEn: "Human Resources",
  },
  {
    key: "branchCode",
    headerAr: "رمز الفرع",
    headerEn: "Branch Code",
    width: 18,
    group: "job",
    noteAr: "كود الفرع المسجل بالنظام (يتم اختياره من القائمة)",
    exampleVal: "",
    noteEn: "The establishment's code in the system (pick from the list)",
    exampleEn: "",
  },
  {
    key: "joiningDate",
    headerAr: "تاريخ الالتحاق",
    headerEn: "Joining Date",
    width: 20,
    group: "job",
    noteAr: "تاريخ المباشرة بصيغة: YYYY-MM-DD",
    exampleVal: "2023-01-01",
    noteEn: "Start date: YYYY-MM-DD",
    exampleEn: "2023-01-01",
  },
  {
    key: "employmentStatus",
    headerAr: "الحالة الوظيفية",
    headerEn: "Employment Status",
    width: 20,
    group: "job",
    noteAr: "ACTIVE (نشط) / INACTIVE (غير نشط) / ON_LEAVE (إجازة) / TERMINATED (منتهي)",
    exampleVal: "ACTIVE",
    noteEn: "ACTIVE / INACTIVE / ON_LEAVE / TERMINATED",
    exampleEn: "ACTIVE",
  },

  // 4. Official Documents
  {
    key: "iqamaNumber",
    headerAr: "رقم الإقامة / الهوية",
    headerEn: "Iqama Number",
    width: 22,
    group: "documents",
    noteAr: "رقم الهوية الوطنية أو الإقامة المكون من 10 أرقام",
    exampleVal: "1023456789",
    noteEn: "The 10-digit national ID or iqama number",
    exampleEn: "1023456789",
  },
  {
    key: "iqamaIssueDate",
    headerAr: "تاريخ إصدار الإقامة",
    headerEn: "Iqama Issue Date",
    width: 20,
    group: "documents",
    noteAr: "صيغة التاريخ: YYYY-MM-DD",
    exampleVal: "2023-01-01",
    noteEn: "Date format: YYYY-MM-DD",
    exampleEn: "2023-01-01",
  },
  {
    key: "iqamaExpiryDate",
    headerAr: "تاريخ انتهاء الإقامة",
    headerEn: "Iqama Expiry Date",
    width: 20,
    group: "documents",
    noteAr: "مهم جداً لنظام التنبيهات والرادار: YYYY-MM-DD",
    exampleVal: "2026-12-31",
    noteEn: "Needed for the expiry alerts: YYYY-MM-DD",
    exampleEn: "2026-12-31",
  },
  {
    key: "passportNumber",
    headerAr: "رقم جواز السفر",
    headerEn: "Passport Number",
    width: 20,
    group: "documents",
    noteAr: "رقم جواز السفر للموظف",
    exampleVal: "G98765432",
    noteEn: "The employee's passport number",
    exampleEn: "G98765432",
  },
  {
    key: "passportCountry",
    headerAr: "دولة إصدار الجواز",
    headerEn: "Passport Country",
    width: 20,
    group: "documents",
    noteAr: "الدولة المصدرة للجواز",
    exampleVal: "المملكة العربية السعودية",
    noteEn: "The country that issued the passport",
    exampleEn: "Saudi Arabia",
  },
  {
    key: "passportIssueDate",
    headerAr: "تاريخ إصدار الجواز",
    headerEn: "Passport Issue Date",
    width: 20,
    group: "documents",
    noteAr: "صيغة التاريخ: YYYY-MM-DD",
    exampleVal: "2022-05-10",
    noteEn: "Date format: YYYY-MM-DD",
    exampleEn: "2022-05-10",
  },
  {
    key: "passportExpiryDate",
    headerAr: "تاريخ انتهاء الجواز",
    headerEn: "Passport Expiry Date",
    width: 20,
    group: "documents",
    noteAr: "صيغة التاريخ: YYYY-MM-DD",
    exampleVal: "2032-05-09",
    noteEn: "Date format: YYYY-MM-DD",
    exampleEn: "2032-05-09",
  },

  // 5. Notes
  {
    key: "notes",
    headerAr: "ملاحظات إضافية",
    headerEn: "Notes",
    width: 32,
    group: "notes",
    noteAr: "أي ملاحظات إضافية خاصة بالموظف",
    exampleVal: "نموذج استرشادي توضيحي (يرجى حذفه أو استبداله)",
    noteEn: "Any other notes about the employee",
    exampleEn: "Example row (delete or replace it)",
  },
];

const GROUP_COLORS: Record<string, { bg: string; border: string }> = {
  identity: { bg: "FF1E3A8A", border: "FF172554" }, // Royal Deep Navy (Required)
  personal: { bg: "FF1E293B", border: "FF0F172A" }, // Corporate Slate
  job: { bg: "FF0F4C5C", border: "FF082F49" },      // Deep Ocean Emerald / Teal
  documents: { bg: "FF312E81", border: "FF1E1B4B" },// Royal Midnight Indigo
  notes: { bg: "FF475569", border: "FF334155" },    // Executive Steel
};

export async function buildEmployeesImportTemplate(): Promise<Buffer> {
  const branches = await prisma.branch.findMany({
    where: { deletedAt: null },
    select: { code: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  const branchCodes = branches.map((b) => b.code);
  const defaultBranch = branchCodes[0] ?? "";

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "SanaD Enterprise HR & Compliance Suite";
  workbook.lastModifiedBy = "SanaD Automated System";
  workbook.created = new Date();
  workbook.modified = new Date();

  // -------------------------------------------------------------
  // 📄 ورقة العمل 1: بيانات الموظفين (RTL)
  // -------------------------------------------------------------
  const sheet = workbook.addWorksheet(L("بيانات الموظفين", "Employees"), {
    views: [{ state: "frozen", ySplit: 4, rightToLeft: !isEn() }],
  });

  // تعيين عروض الأعمدة
  sheet.columns = TEMPLATE_COLUMNS.map((c) => ({
    key: c.key,
    width: c.width,
  }));

  const totalCols = TEMPLATE_COLUMNS.length;

  // 🏛️ الصف 1: الترويسة الرئيسية للنظام (Executive Brand Banner)
  sheet.mergeCells(1, 1, 1, totalCols);
  const row1 = sheet.getRow(1);
  const logo = await getPrintLogoPng();
  row1.height = logo ? 48 : 36;
  if (logo) addLogoToSheet(workbook, sheet, logo);
  const cell1 = sheet.getCell(1, 1);
  cell1.value = L("🏢 نظام SanaD لإدارة الموارد البشرية والامتثال الحكومي", "🏢 SanaD HR & Compliance");
  cell1.font = { name: "Cairo", size: 13, bold: true, color: { argb: "FFFFFFFF" } };
  cell1.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  cell1.alignment = { vertical: "middle", horizontal: "center" };

  // 📋 الصف 2: عنوان الغرض من القالب
  sheet.mergeCells(2, 1, 2, totalCols);
  const row2 = sheet.getRow(2);
  row2.height = 28;
  const cell2 = sheet.getCell(2, 1);
  cell2.value = L("📋 قالب استيراد وتحديث بيانات الموظفين المعتمد", "📋 Employee import template");
  cell2.font = { name: "Cairo", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  cell2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
  cell2.alignment = { vertical: "middle", horizontal: "center" };

  // 💡 الصف 3: الإرشادات والتنبيهات السريعة
  sheet.mergeCells(3, 1, 3, totalCols);
  const row3 = sheet.getRow(3);
  row3.height = 24;
  const cell3 = sheet.getCell(3, 1);
  cell3.value = L(
    "💡 تنبيه: الحقول ذات النجمة (*) إلزامية. التواريخ بصيغة (YYYY-MM-DD). الصف 5 نموذج توضيحي يمكن حذفه أو استبداله. راجع ورقة 'التعليمات' لمزيد من التفاصيل.",
    "💡 Fields marked * are required. Dates are YYYY-MM-DD. Row 5 is an example you can delete or replace. See the 'Guide' sheet for details."
  );
  cell3.font = { name: "Cairo", size: 9.5, italic: true, bold: true, color: { argb: "FF1E293B" } };
  cell3.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  cell3.alignment = { vertical: "middle", horizontal: "center" };
  cell3.border = {
    bottom: { style: "medium", color: { argb: "FF94A3B8" } },
  };

  // 🏷️ الصف 4: عناوين الأعمدة المنسقة والملونة بالأقسام
  const headerRow = sheet.getRow(4);
  headerRow.height = 44;

  TEMPLATE_COLUMNS.forEach((col, idx) => {
    const colNum = idx + 1;
    const cell = sheet.getCell(4, colNum);
    // ثنائي اللغة: العربي في الأعلى والإنجليزية في الأسفل
    cell.value = headerOf(col);
    const grp = GROUP_COLORS[col.group] ?? GROUP_COLORS.personal;

    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: grp.bg } };
    cell.font = { name: "Cairo", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "medium", color: { argb: "FF0F172A" } },
      bottom: { style: "medium", color: { argb: "FF0F172A" } },
      left: { style: "thin", color: { argb: "33FFFFFF" } },
      right: { style: "thin", color: { argb: "33FFFFFF" } },
    };
  });

  // 🌟 الصف 5: الصف النموذجي الاسترشادي (Example Row)
  const exampleValues = TEMPLATE_COLUMNS.map((c) => {
    if (c.key === "branchCode") return defaultBranch;
    return isEn() ? c.exampleEn ?? c.exampleVal : c.exampleVal;
  });

  const exampleRow = sheet.getRow(5);
  exampleRow.values = exampleValues;
  exampleRow.height = 26;

  TEMPLATE_COLUMNS.forEach((_, idx) => {
    const colNum = idx + 1;
    const cell = sheet.getCell(5, colNum);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF0FDF4" } }; // Soft light mint tint
    cell.font = { name: "Cairo", size: 9.5, italic: true, color: { argb: "FF334155" } };
    cell.alignment = { vertical: "middle", horizontal: idx < 3 ? (isEn() ? "left" : "right") : "center" };
    cell.border = {
      top: { style: "thin", color: { argb: "FFCBD5E1" } },
      bottom: { style: "thin", color: { argb: "FFCBD5E1" } },
      left: { style: "thin", color: { argb: "FFCBD5E1" } },
      right: { style: "thin", color: { argb: "FFCBD5E1" } },
    };
  });

  // 📝 تهيئة حدود وتنسيقات الصفوف المتبقية (Rows 6 to 100)
  for (let r = 6; r <= 100; r++) {
    const dataRow = sheet.getRow(r);
    dataRow.height = 23;
    const isEven = r % 2 === 0;
    const bgArgb = isEven ? "FFFFFFFF" : "FFF8FAFC"; // Ultra-subtle zebra striping

    for (let c = 1; c <= totalCols; c++) {
      const cell = sheet.getCell(r, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      cell.font = { name: "Cairo", size: 10, color: { argb: "FF0F172A" } };
      cell.alignment = { vertical: "middle", horizontal: c === 2 || c === 3 || c === 21 ? (isEn() ? "left" : "right") : "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };
    }
  }

  // تفعيل التصفية التلقائية في الترويسة (Row 4)
  sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: 4, column: totalCols } };

  // 🎯 قوائم الاختيار والتحقق من صحة البيانات (Data Validation Dropdowns)
  const genderCol = TEMPLATE_COLUMNS.findIndex((c) => c.key === "gender") + 1;
  const statusCol = TEMPLATE_COLUMNS.findIndex((c) => c.key === "employmentStatus") + 1;
  const branchCol = TEMPLATE_COLUMNS.findIndex((c) => c.key === "branchCode") + 1;

  for (let row = 5; row <= 500; row++) {
    // قائمة الجنس
    sheet.getCell(row, genderCol).dataValidation = {
      type: "list",
      formulae: ['"MALE,FEMALE"'],
      allowBlank: true,
      error: L("يرجى اختيار MALE أو FEMALE من القائمة", "Pick MALE or FEMALE from the list"),
      errorTitle: L("قيمة غير صحيحة للجنس", "Invalid gender"),
    };

    // قائمة الحالة الوظيفية
    sheet.getCell(row, statusCol).dataValidation = {
      type: "list",
      formulae: ['"ACTIVE,INACTIVE,ON_LEAVE,TERMINATED"'],
      allowBlank: true,
      error: L("يرجى اختيار إحدى الحالات المعتمدة: ACTIVE / INACTIVE / ON_LEAVE / TERMINATED", "Pick one of: ACTIVE / INACTIVE / ON_LEAVE / TERMINATED"),
      errorTitle: L("حالة وظيفية غير معتمدة", "Invalid employment status"),
    };

    // قائمة الفروع النشطة
    if (branchCodes.length) {
      sheet.getCell(row, branchCol).dataValidation = {
        type: "list",
        formulae: [`"${branchCodes.join(",")}"`],
        allowBlank: true,
        error: L(`يرجى اختيار كود فرع صحيح من الفروع المسجلة: (${branchCodes.join(", ")})`, `Pick a registered establishment code: (${branchCodes.join(", ")})`),
        errorTitle: L("كود فرع غير مسجل", "Unknown establishment code"),
      };
    }
  }

  // -------------------------------------------------------------
  // 📖 ورقة العمل 2: دليل التعليمات والإرشادات (Instructions Sheet)
  // -------------------------------------------------------------
  const instructions = workbook.addWorksheet(L("دليل التعليمات", "Guide"), {
    views: [{ state: "frozen", ySplit: 3, rightToLeft: !isEn() }],
  });

  instructions.columns = [
    { header: L("اسم الحقل", "Field"), width: 26 },
    { header: L("الاسم في القالب", "Column in the template"), width: 24 },
    { header: L("درجة الإلزامية", "Required"), width: 16 },
    { header: L("الصيغة المعتمدة", "Format"), width: 22 },
    { header: L("إرشادات وتوجيهات الاستخدام", "How to fill it"), width: 60 },
  ];

  // ترويسة دليل التعليمات
  instructions.mergeCells(1, 1, 1, 5);
  const insTitle = instructions.getCell(1, 1);
  insTitle.value = L("📖 دليل وضوابط تعبئة قالب استيراد وتحديث بيانات الموظفين", "📖 How to fill in the employee import template");
  insTitle.font = { name: "Cairo", size: 12, bold: true, color: { argb: "FFFFFFFF" } };
  insTitle.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F172A" } };
  insTitle.alignment = { vertical: "middle", horizontal: "center" };
  instructions.getRow(1).height = 32;

  instructions.mergeCells(2, 1, 2, 5);
  const insSub = instructions.getCell(2, 1);
  insSub.value = L("يرجى قراءة التعليمات والالتزام بالصيغ المحددة لضمان اكتمال الاستيراد بنجاح وبدون أي أخطاء نظامية.", "Follow the formats below so the import goes through without errors.");
  insSub.font = { name: "Cairo", size: 10, italic: true, color: { argb: "FF334155" } };
  insSub.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };
  insSub.alignment = { vertical: "middle", horizontal: "center" };
  instructions.getRow(2).height = 24;

  const insHeader = instructions.getRow(3);
  insHeader.height = 30;
  for (let c = 1; c <= 5; c++) {
    const cell = instructions.getCell(3, c);
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E3A8A" } };
    cell.font = { name: "Cairo", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }

  // ملء بيانات الأعمدة في ورقة التعليمات
  TEMPLATE_COLUMNS.forEach((col, idx) => {
    const r = idx + 4;
    const row = instructions.getRow(r);
    row.height = 24;
    const isReq = Boolean(col.required);

    row.values = [
      isEn() ? col.headerEn : col.headerAr.replace("* ", ""),
      headerOf(col),
      isReq ? L("إلزامي *", "Required *") : L("اختياري", "Optional"),
      col.key.toLowerCase().includes("date") ? L("تاريخ (YYYY-MM-DD)", "Date (YYYY-MM-DD)") : col.key === "gender" || col.key === "employmentStatus" || col.key === "branchCode" ? L("قائمة منسدلة", "Drop-down list") : L("نص / أرقام", "Text / numbers"),
      (isEn() ? col.noteEn : col.noteAr) ?? "—",
    ];

    const isEven = idx % 2 === 0;
    const bgArgb = isEven ? "FFFFFFFF" : "FFF8FAFC";

    for (let c = 1; c <= 5; c++) {
      const cell = instructions.getCell(r, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgArgb } };
      cell.font = { name: "Cairo", size: 9.5, color: { argb: "FF0F172A" } };
      cell.alignment = { vertical: "middle", horizontal: c === 1 || c === 5 ? (isEn() ? "left" : "right") : "center" };
      cell.border = {
        top: { style: "thin", color: { argb: "FFE2E8F0" } },
        bottom: { style: "thin", color: { argb: "FFE2E8F0" } },
        left: { style: "thin", color: { argb: "FFE2E8F0" } },
        right: { style: "thin", color: { argb: "FFE2E8F0" } },
      };

      if (c === 3 && isReq) {
        cell.font = { name: "Cairo", size: 9.5, bold: true, color: { argb: "FF16A34A" } }; // Green for required
      }
    }
  });

  // إضافة صندوق القواعد الذهبية لنجاح الاستيراد في نهاية ورقة التعليمات
  const startRuleRow = TEMPLATE_COLUMNS.length + 6;

  instructions.mergeCells(startRuleRow, 1, startRuleRow, 5);
  const ruleHeader = instructions.getCell(startRuleRow, 1);
  ruleHeader.value = L("⭐ القواعد والضوابط الذهبية لضمان نجاح الاستيراد الفوري:", "⭐ Rules for a clean import:");
  ruleHeader.font = { name: "Cairo", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
  ruleHeader.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F4C5C" } };
  ruleHeader.alignment = { vertical: "middle", horizontal: isEn() ? "left" : "right" };
  instructions.getRow(startRuleRow).height = 28;

  const RULES = isEn()
    ? [
        "1. Do not delete, rename or reorder the column headers in row 4 of the Employees sheet.",
        "2. Each employee needs a unique employee number; a number already in the system updates that employee.",
        "3. Every date is year-month-day, e.g. 2026-05-15.",
        "4. Use the drop-down choices for gender, employment status and establishment code.",
        "5. You can delete the example in row 5 before uploading, or leave it: it is skipped.",
        "6. Save the file as Excel (.xlsx) before uploading it on the Import & Export page.",
      ]
    : [
    "1. عدم حذف أو تعديل أو إعادة ترتيب عناوين الأعمدة في الصف رقم 4 من ورقة 'بيانات الموظفين'.",
    "2. رقم الموظف يجب أن يكون فريداً لكل موظف - في حال تكرار رقم موجود بالنظام سيتم تحديث بياناته تلقائياً.",
    "3. جميع التواريخ يجب أن تكون بالصيغة القياسية (سنة-شهر-يوم) مثل: 2026-05-15.",
    "4. يُرجى الالتزام بالخيارات المتاحة في القوائم المنسدلة لحقول (الجنس، الحالة الوظيفية، رمز الفرع).",
    "5. يمكنك حذف الصف النموذجي رقم 5 قبل الرفع، أو تركه وسيتم معالجته أو تجاوزه بأمان.",
    "6. يجب حفظ الملف بصيغة Excel القياسية (.xlsx) قبل رفعه إلى النظام عبر صفحة 'استيراد وتصدير البيانات'.",
      ];

  RULES.forEach((rule, rIdx) => {
    const r = startRuleRow + 1 + rIdx;
    instructions.mergeCells(r, 1, r, 5);
    const cell = instructions.getCell(r, 1);
    cell.value = rule;
    cell.font = { name: "Cairo", size: 9.5, bold: rIdx === 0 || rIdx === 1, color: { argb: "FF1E293B" } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
    cell.alignment = { vertical: "middle", horizontal: isEn() ? "left" : "right" };
    instructions.getRow(r).height = 22;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
