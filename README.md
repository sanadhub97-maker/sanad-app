# SanaD Documents & Licenses Management System

A full-stack enterprise platform for managing employees, employee/company documents, licenses, branches, payments, expiration tracking, notifications, Excel import/export, PDF/A4 printing, reports, RBAC, audit logs, and system settings.

This is a real, database-backed application — every button in the UI calls a real API endpoint that reads/writes PostgreSQL. Nothing is mocked.

## Architecture

```
/server   Node + TypeScript + Express + Prisma + PostgreSQL (REST API)
/client   React + TypeScript + Vite + Tailwind + shadcn-style components (SPA)
```

**Backend**: Express, Prisma ORM, PostgreSQL (Neon), Zod validation, JWT access tokens + rotating opaque refresh tokens (hashed in DB), bcrypt password hashing, RBAC middleware, pino logging, helmet/cors/rate-limiting, node-cron for the daily expiration scan, Puppeteer for PDF generation, ExcelJS for Excel import/export.

**Frontend**: Vite + React 18, Tailwind CSS with hand-authored shadcn-style Radix UI primitives (`src/components/ui`), TanStack Query (server state) + TanStack Table, React Hook Form + Zod, react-router-dom, react-i18next (English/Arabic, RTL/LTR), Recharts, Framer Motion, Zustand.

### Key architecture decisions

- **Company Documents vs. Licenses**: the spec's "Company Documents" and "Licenses" modules use near-identical categories and fields. Both are served by **one `CompanyDocument` Prisma model** (`server/src/modules/companyDocuments`); the frontend renders `/company-documents` (all categories) and `/licenses` (scoped to license-like categories) as two views over the same API, via `makeCompanyDocumentsRouter(scope, permissionModule)`.
- **Employee Iqama/Passport vs. Employee Documents**: `Employee` has first-class `iqamaNumber/iqamaExpiryDate/iqamaFileId` and `passportNumber/passportExpiryDate/passportFileId` fields (shown in the employee list/profile), while the separate `EmployeeDocument` table covers every other document type (health certificate, medical insurance, contract, visa, driving license, other) plus historical Iqama/Passport records. To avoid double-counting the same document in dashboards/notifications, the shared `getTrackableItems()` helper (`server/src/services/expiringItems.ts`) excludes `EmployeeDocument` rows of type `IQAMA`/`PASSPORT` and instead reads those two from the `Employee` fields directly.
- **Audit logging**: a single Express middleware (`middleware/audit.ts`) wraps `res.json` on mutating routes and writes an `AuditLog` row automatically — no hand-written logging calls scattered through controllers.
- **Expiration engine**: `services/expiration.ts` exposes a pure `computeStatus(expiryDate, rules)` function (>threshold days = Valid, 1..threshold = Expiring Soon, ≤0 = Expired). Thresholds are configurable at runtime via Settings → Expiration Rules (stored in the generic `Setting` key-value table).
- **Notifications idempotency**: the daily cron job (`jobs/expirationScan.ts`) computes a `dedupeKey` per (document, day-threshold, channel) and only sends if no `NotificationLog` row exists for that key yet — so restarting the server or re-running the job never re-notifies for something already sent.

## Folder structure

```
server/src/
  config/        env loading + validation (Zod)
  lib/            prisma client, logger, jwt, crypto, password hashing, local file storage
  middleware/     auth, rbac, validation, error handling, audit logging
  constants/      permission catalogue + default role→permission mapping
  modules/        one folder per feature: auth, users, roles, branches, employees,
                  employeeDocuments, companyDocuments, payments, files, notifications,
                  settings, auditLogs, reports, importExport, pdf, dashboard, search
  services/       expiration engine, email (nodemailer), whatsapp (Cloud API client),
                  excel (ExcelJS helpers), pdf (Puppeteer), branding, settingsStore
  jobs/           expirationScan.ts + node-cron scheduler
  routes/         aggregates every module router under /api

client/src/
  api/            one file per resource — typed functions calling the REST API
  components/ui/  hand-authored Radix + Tailwind primitives (button, dialog, table, ...)
  components/     layout (sidebar/topbar/app shell), common (data table, file upload, ...), providers
  pages/          one folder per module, mirroring the sidebar navigation
  stores/         zustand auth + UI-preference stores
  i18n/           en/ar translation resources + RTL switching
```

## Database schema (Prisma)

See `server/prisma/schema.prisma` for the full, authoritative schema. Highlights:

- **Identity/RBAC**: `User`, `Role`, `Permission`, `UserRole`, `RolePermission`, `Session` (refresh tokens), `PasswordResetToken`, `EmailVerificationToken`.
- **Domain**: `Branch`, `Employee`, `EmployeeDocument`, `CompanyDocument`, `Payment`.
- **Notifications**: `Notification` (in-app), `NotificationLog` (idempotent send ledger).
- **Settings**: `Setting` (generic key-value: expiration rules, appearance), `CompanySettings`, `EmailSettings`, `WhatsappSettings` (secrets encrypted at rest with AES-256-GCM).
- **Files**: `File` (metadata; content lives on local disk under `server/uploads`, behind an auth-checked download endpoint — never a public static path).
- **Operational**: `AuditLog`, `ImportJob`, `ImportError`.

Soft-delete (`deletedAt`) is used on Employee, Branch, CompanyDocument, Payment, EmployeeDocument, and User so records can be restored/audited rather than being destroyed.

## Getting started

### 1. Prerequisites

- Node.js 20+ and npm
- A PostgreSQL database — this project was set up against **[Neon](https://neon.tech)** (free managed Postgres, no local install needed). Any Postgres 14+ works.

### 2. Database setup (Neon)

1. Sign up at [neon.tech](https://neon.tech) and create a project.
2. Copy the connection string from the project dashboard (starts with `postgresql://...sslmode=require`).
3. Paste it into `server/.env` as `DATABASE_URL`.

### 3. Install dependencies

```bash
cd server && npm install
cd ../client && npm install
```

The server install downloads a bundled Chromium for Puppeteer (PDF generation) — first install is larger (~300MB) but only happens once.

### 4. Configure environment variables

Copy `.env.example` to `server/.env` and fill in real values. At minimum, set:

- `DATABASE_URL` — your Neon connection string
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `SETTINGS_ENCRYPTION_KEY` — generate each with:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
  ```
- `SEED_SUPERADMIN_EMAIL` / `SEED_SUPERADMIN_PASSWORD` — used only by the seed script to create the first Super Admin account.

See `.env.example` for every variable, grouped and commented (server, auth, file storage, email, WhatsApp, scheduled jobs).

### 5. Run migrations and seed

```bash
cd server
npm run prisma:migrate   # creates tables in your Neon database
npm run prisma:seed      # seeds permissions, default roles, and the Super Admin account
```

The seed script creates **only** roles, permissions, and one Super Admin user — no fake employees, documents, or payments (the app shows proper empty states on first launch).

### 6. Run the app

```bash
# terminal 1
cd server && npm run dev     # http://localhost:4000

# terminal 2
cd client && npm run dev     # http://localhost:5173
```

Log in with the seeded Super Admin email/password, then use Users & Roles to invite the real team and Settings → Company to brand the app.

### Production build

```bash
cd server && npm run build && npm start
cd client && npm run build   # outputs client/dist — serve behind any static host / reverse proxy to the API
```

## API overview

All endpoints are mounted under `/api` and (except `/api/health` and the public `/api/auth/*` endpoints) require a `Bearer` access token plus the relevant permission:

```
/api/auth            register, login, refresh, logout, forgot/reset-password, verify-email, change-password, me
/api/users           CRUD + role assignment
/api/roles           CRUD + /roles/permissions (catalogue)
/api/branches        CRUD + /branches/active
/api/employees       CRUD + /employees/:id/pdf
/api/employees/:employeeId/documents   nested CRUD
/api/company-documents, /api/licenses  two views over the same table (see architecture notes)
/api/payments        CRUD + /payments/:id/receipt.pdf
/api/files           upload, metadata, download, delete
/api/notifications   list, mark read / all read, delete
/api/settings         /company, /appearance, /expiration-rules, /email(+/test), /whatsapp(+/test)
/api/audit-logs      read-only, filterable
/api/dashboard       /summary, /expiration-widget, /charts, /recent-activity
/api/reports         /employees, /documents, /payments, /activity — each supports ?format=json|xlsx|csv|pdf
/api/import-export   /employees/template, /employees/import, /jobs, /jobs/:id/errors.xlsx
/api/search          global search across employees/documents/payments/branches
```

Every list endpoint supports `page`, `pageSize`, `sortBy`, `sortDir`, `q` (search), plus module-specific filters.

## Permissions (RBAC)

Permission keys follow `<module>.<action>` (see `server/src/constants/permissions.ts` for the full catalogue and the default role → permission mapping). Default roles: **Super Admin** (bypasses all permission checks by role name), **Admin**, **Manager**, **HR**, **Accountant**, **Employee**, **Viewer**. Super Admin can create custom roles with any combination of permissions from Users & Roles → Roles & Permissions.

## Configuring integrations

### Email (SMTP)

Settings → Email, or the `EMAIL_*` env vars for a first-boot default. Nothing sends until `enabled` is true and a host/from-address are set — registration, password reset, and expiration alerts all call the same `sendMail()` service, which safely no-ops (and logs) when email isn't configured yet. Use the "Send Test" button after saving to confirm delivery.

### WhatsApp (Business Cloud API)

Settings → WhatsApp. This integrates with the **official WhatsApp Business Cloud API only** — a plain HTTPS POST to `{apiUrl}/{phoneNumberId}/messages` with a Bearer token — never WhatsApp Web automation. You'll need a Meta Business account, a WhatsApp Business phone number, and a permanent access token. Nothing sends until configured; use "Send Test" to confirm.

### File storage

Local disk under `server/uploads` by default (`STORAGE_DRIVER=local`), behind the `StorageDriver` interface in `server/src/lib/storage.ts`. `STORAGE_DRIVER=s3` is reserved for a future S3-compatible driver — not implemented in this build.

## Excel import/export

- **Templates**: Import & Export → Download Template generates a real `.xlsx` (ExcelJS) with a frozen header row, dropdown validation for enum columns, an example row, and an Instructions sheet.
- **Import flow**: upload → the server auto-maps columns by header name → validates every row (required fields, duplicate employee numbers, date/email format, branch code lookup) → supports a `dryRun` preview before committing → on confirm, creates/updates records and returns a summary (imported/updated/skipped/failed) plus a downloadable `Import Errors.xlsx`.
- **Exports**: every report (`/api/reports/*`) and several list views support `?format=xlsx|csv|pdf`, respecting active filters.

## PDF / A4 printing

Puppeteer renders real HTML/CSS to A4 PDFs (`server/src/services/pdf.ts` + `server/src/modules/pdf/templates.ts`): Employee Profile, Payment Receipt, and a generic tabular Report template — all with the company logo/name (pulled live from Settings → Company), a reference number, generation date, and real page numbers (via Puppeteer's own header/footer template, not CSS).

## Security

- Passwords hashed with bcrypt (cost 12).
- Access tokens are short-lived JWTs; refresh tokens are opaque random values, hashed before storage, rotated on every refresh, and revocable (logout, password reset revokes all sessions).
- SMTP/WhatsApp secrets encrypted at rest (AES-256-GCM) — never returned to the frontend.
- Helmet, CORS locked to `CLIENT_URL`, rate limiting (global + tighter on auth endpoints), Zod validation on every input, Prisma parameterized queries (no raw SQL string interpolation), file upload type/size validation.
- RBAC enforced server-side on every route; the frontend also hides unauthorized UI, but the API is the actual authority.

## Testing

```bash
cd server && npm test
```

Covers the expiration engine (§20 status calculation) end-to-end. Given the scope of this system, this build does not include exhaustive coverage of every module — RBAC enforcement and Excel import validation are the next highest-value additions.

## Known scope cuts (documented, not hidden)

- **Backup/restore automation** and a **CI/CD pipeline** are not built in this pass.
- **Print-template builder UI** (DB-editable templates) is deferred; the three PDF templates shipped are fixed, high-quality HTML/CSS.
- **i18n coverage**: navigation, common actions, and status labels are fully bilingual (English/Arabic with RTL layout switching); many deep form-field labels are English-first, since translating every field across ~15 modules was out of scope for this pass.
- **Global search** (`/api/search`) covers employees, company documents, payments, and branches; it does not yet index every EmployeeDocument sub-record individually.
