import { Suspense, lazy } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthInitializer } from "@/components/providers/auth-initializer";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { LuluInstall } from "@/components/lulu/lulu-install";
import { RoyalAuthLayout } from "@/layouts/royal-auth-layout";
import { RequireAuth } from "@/routes/require-auth";
import { RequirePermission } from "@/routes/require-permission";

import LoginPage from "@/pages/auth/login";
import ForgotPasswordPage from "@/pages/auth/forgot-password";
import ResetPasswordPage from "@/pages/auth/reset-password";
import VerifyEmailPage from "@/pages/auth/verify-email";
import NotFoundPage from "@/pages/errors/not-found";
import ForbiddenPage from "@/pages/errors/forbidden";
import ServerErrorPage from "@/pages/errors/server-error";

const DashboardPage = lazy(() => import("@/pages/dashboard/dashboard-lulu"));
const LuluShell = lazy(() => import("@/components/lulu/lulu-shell").then(m => ({ default: m.LuluShell })));
const PrintTemplatesPreview = lazy(() => import("@/pages/preview/print-templates-preview"));
const EmployeesListPage = lazy(() => import("@/pages/employees/employees-list-page"));
const EmployeeProfilePage = lazy(() => import("@/pages/employees/employee-profile-page"));
const EmployeeDocumentsPage = lazy(() => import("@/pages/workforce/employee-documents-page"));
const EmployeeDocumentDetailsPage = lazy(() => import("@/pages/workforce/employee-document-details-page"));
const CompanyDocumentDetailsPage = lazy(() => import("@/pages/companyDocuments/company-document-details-page"));
const BranchDetailsPage = lazy(() => import("@/pages/branches/branch-details-page"));
const CompanyDocumentsPage = lazy(() => import("@/pages/companyDocuments/company-documents-page"));
const BranchesPage = lazy(() => import("@/pages/branches/branches-page"));
const DailyTasksPage = lazy(() => import("@/pages/tasks/daily-tasks-page"));
const PaymentsPage = lazy(() => import("@/pages/payments/payments-page"));
const NotificationsPage = lazy(() => import("@/pages/notifications/notifications-page"));
const ReportsPage = lazy(() => import("@/pages/reports/reports-page"));
const ImportExportPage = lazy(() => import("@/pages/importExport/import-export-page"));
const FileManagerPage = lazy(() => import("@/pages/files/file-manager-page"));
const UsersPage = lazy(() => import("@/pages/users/users-page"));
const RolesPage = lazy(() => import("@/pages/roles/roles-page"));
const AuditLogsPage = lazy(() => import("@/pages/auditLogs/audit-logs-page"));
const SettingsPage = lazy(() => import("@/pages/settings/settings-page"));
const ProfilePage = lazy(() => import("@/pages/profile/profile-page"));
const MaintenancePage = lazy(() => import("@/pages/maintenance/maintenance-page"));
const ProductivityPage = lazy(() => import("@/pages/productivity/productivity-page"));
const AndroidAppPage = lazy(() => import("@/pages/android/android-app-page"));

function PageFallback() {
  return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
    </div>
  );
}

export default function App() {
  const location = useLocation();
  if (/^\/print-templates\/?$/.test(location.pathname)) {
    return <Suspense fallback={<PageFallback />}><PrintTemplatesPreview /></Suspense>;
  }
  return (
    <AuthInitializer>
      <ThemeProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            <Route element={<RoyalAuthLayout />}>
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
            </Route>

            {/* The Android app: open to anyone, so the link can be shared. */}
            <Route path="/android" element={<AndroidAppPage />} />

            <Route element={<RequireAuth />}>
              <Route element={<LuluShell />}>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/profile" element={<ProfilePage />} />
                <Route path="/maintenance" element={<MaintenancePage />} />
                <Route path="/work-tools" element={<ProductivityPage />} />

                <Route element={<RequirePermission permission="employees.create" />}>
                  <Route path="/employees/new" element={<Navigate to="/employees?new=true" replace />} />
                </Route>
                <Route element={<RequirePermission permission="employees.edit" />}>
                  <Route path="/employees/:id/edit" element={<Navigate to="/employees/:id" replace />} />
                </Route>
                <Route element={<RequirePermission permission="employees.view" />}>
                  <Route path="/employees" element={<EmployeesListPage />} />
                  <Route path="/employees/:id" element={<EmployeeProfilePage />} />
                  <Route path="/employee-documents" element={<EmployeeDocumentsPage />} />
                  <Route path="/employee-documents/:employeeId/:docKey" element={<EmployeeDocumentDetailsPage />} />
                  <Route path="/workforce/iqamas" element={<Navigate to="/employee-documents?category=IQAMA" replace />} />
                  <Route path="/workforce/passports" element={<Navigate to="/employee-documents?category=PASSPORT" replace />} />
                  <Route path="/workforce/health-certificates" element={<Navigate to="/employee-documents?category=HEALTH_CERTIFICATE" replace />} />
                  <Route path="/workforce/medical-insurance" element={<Navigate to="/employee-documents?category=MEDICAL_INSURANCE" replace />} />
                  <Route path="/workforce/visas" element={<Navigate to="/employee-documents?category=VISA" replace />} />
                  <Route path="/workforce/flight-tickets" element={<Navigate to="/employee-documents?category=FLIGHT_TICKET" replace />} />
                  <Route path="/iqamas" element={<Navigate to="/employee-documents?category=IQAMA" replace />} />
                  <Route path="/passports" element={<Navigate to="/employee-documents?category=PASSPORT" replace />} />
                </Route>

                <Route element={<RequirePermission permission="companyDocuments.view" />}>
                  <Route path="/company-documents" element={<CompanyDocumentsPage />} />
                  <Route path="/company-documents/:id" element={<CompanyDocumentDetailsPage />} />
                </Route>
                <Route path="/licenses" element={<Navigate to="/company-documents" replace />} />
                <Route element={<RequirePermission permission="tasks.view" />}>
                  <Route path="/daily-tasks" element={<DailyTasksPage />} />
                </Route>
                <Route element={<RequirePermission permission="branches.view" />}>
                  <Route path="/branches" element={<BranchesPage />} />
                  <Route path="/branches/:id" element={<BranchDetailsPage />} />
                </Route>
                <Route element={<RequirePermission permission="payments.view" />}>
                  <Route path="/payments" element={<PaymentsPage />} />
                </Route>
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route element={<RequirePermission permission="reports.view" />}>
                  <Route path="/reports" element={<ReportsPage />} />
                </Route>
                <Route element={<RequirePermission permission="importExport.import" />}>
                  <Route path="/import-export" element={<ImportExportPage />} />
                </Route>
                <Route element={<RequirePermission permission="files.view" />}>
                  <Route path="/files" element={<FileManagerPage />} />
                </Route>
                <Route element={<RequirePermission permission="users.view" />}>
                  <Route path="/users" element={<UsersPage />} />
                </Route>
                <Route element={<RequirePermission permission="roles.view" />}>
                  <Route path="/roles" element={<RolesPage />} />
                </Route>
                <Route element={<RequirePermission permission="auditLogs.view" />}>
                  <Route path="/audit-logs" element={<AuditLogsPage />} />
                </Route>
                <Route element={<RequirePermission permission="settings.view" />}>
                  <Route path="/settings/*" element={<SettingsPage />} />
                </Route>
              </Route>
            </Route>


            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/500" element={<ServerErrorPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
        <LuluInstall />
      </ThemeProvider>
    </AuthInitializer>
  );
}
