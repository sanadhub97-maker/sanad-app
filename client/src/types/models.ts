export type DocumentStatus = "VALID" | "EXPIRING_SOON" | "EXPIRED";
export type EmploymentStatus = "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
export type Gender = "MALE" | "FEMALE";

export interface PaginatedMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface Paginated<T> {
  data: T[];
  meta: PaginatedMeta;
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  city?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  managerId?: string | null;
  manager?: { id: string; fullName: string } | null;
  status: "ACTIVE" | "INACTIVE";
  notes?: string | null;
  _count?: { employees: number };
  createdAt: string;
}

export interface EmployeeDocument {
  id: string;
  employeeId: string;
  type: string;
  name?: string | null;
  documentNumber?: string | null;
  issuingAuthority?: string | null;
  issueDate?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  status?: DocumentStatus | null;
  fileId?: string | null;
  notes?: string | null;
}

export interface Employee {
  id: string;
  employeeNumber: string;
  fullNameAr: string;
  fullNameEn?: string | null;
  nationality?: string | null;
  gender?: Gender | null;
  dateOfBirth?: string | null;
  mobile?: string | null;
  email?: string | null;
  address?: string | null;
  city?: string | null;
  jobTitle?: string | null;
  department?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string; code: string } | null;
  joiningDate?: string | null;
  employmentStatus: EmploymentStatus;
  notes?: string | null;
  iqamaNumber?: string | null;
  iqamaIssueDate?: string | null;
  iqamaExpiryDate?: string | null;
  iqamaFileId?: string | null;
  iqamaStatus?: DocumentStatus | null;
  passportNumber?: string | null;
  passportCountry?: string | null;
  passportIssueDate?: string | null;
  passportExpiryDate?: string | null;
  passportFileId?: string | null;
  passportStatus?: DocumentStatus | null;
  documents?: EmployeeDocument[];
  createdAt: string;
}

export interface CompanyDocument {
  id: string;
  category: string;
  name: string;
  documentNumber?: string | null;
  licenseNumber?: string | null;
  issuingAuthority?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string; code: string } | null;
  city?: string | null;
  issueDate?: string | null;
  startDate?: string | null;
  expiryDate?: string | null;
  status?: DocumentStatus | null;
  fileId?: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface Payment {
  id: string;
  paymentNumber: string;
  paymentDate: string;
  type?: string | null;
  category: string;
  description?: string | null;
  amount: number;
  vat: number;
  total: number;
  method: string;
  paidBy?: string | null;
  branchId?: string | null;
  branch?: { id: string; name: string; code: string } | null;
  employeeId?: string | null;
  employee?: { id: string; employeeNumber: string; fullNameAr: string; fullNameEn?: string | null } | null;
  supplierName?: string | null;
  referenceNumber?: string | null;
  fileId?: string | null;
  notes?: string | null;
  createdBy?: { id: string; fullName: string };
  createdAt: string;
}

export interface AppUser {
  id: string;
  fullName: string;
  email: string;
  phone?: string | null;
  isActive: boolean;
  emailVerifiedAt?: string | null;
  lastLoginAt?: string | null;
  roles: { id: string; name: string }[];
  createdAt: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string | null;
  isSystem: boolean;
  userCount: number;
  permissionKeys: string[];
}

export interface NotificationItem {
  id: string;
  severity: "CRITICAL" | "WARNING" | "INFO";
  title: string;
  message: string;
  relatedType?: string | null;
  relatedId?: string | null;
  isRead: boolean;
  createdAt: string;
}

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  recordId?: string | null;
  description?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
  user?: { id: string; fullName: string; email: string } | null;
}

export interface FileMeta {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  createdAt: string;
}
