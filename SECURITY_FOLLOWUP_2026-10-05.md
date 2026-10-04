# Security follow-up — 5 October 2026 (Asia/Riyadh)

Scope: the user authorized items 2–5 from the previous findings. Branch isolation
(item 1) is not implemented or certified by this change.

## 2. Build dependency vulnerability

The seven npm findings shared one root cause: GHSA-vfj7-8cjw-p6xm in braces 3.0.3.
Upstream reported no patched version at review time:
https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.

A local MIT-licensed fork now caps parser nesting and validates direct AST input
iteratively before compile, expand and stringify. Deep trees and cycles fail
with a bounded error. The checked-in tarball is the local-only version 3.0.4,
not an official upstream release. package-lock pins its SHA-512 integrity.
The corresponding source and PATCH.md are retained under vendor/braces.

The full npm audit remains a blocking CI step; no advisory is suppressed.
The installed package is checked against the reviewed source, including all
current glob consumers, with line-ending normalization for Windows/Linux.
Full npm audit reports zero known vulnerabilities. An isolated clean npm ci
also succeeds with zero known vulnerabilities; only the braces lock entry and
its direct dev dependency were changed from the original lock.
Ten dependency-security tests pass. Ordinary ranges, escaping, nested patterns
and normal file glob matching remain compatible; both production builds pass.

## 3. Hosting, database and storage review — partially complete

Confirmed through existing configuration and read-only checks:
- The database connection succeeds with verified certificates using TLS 1.3
  and TLS_AES_256_GCM_SHA384. Production runtime now explicitly forces
  sslmode=verify-full and removes the libpq compatibility downgrade option.
- Production S3 configuration requires HTTPS plus a nonempty endpoint, bucket
  and credentials, failing early on incomplete or insecure settings.
- A selected private object is available with authenticated S3 access and
  refuses unsigned HEAD access with HTTP 403. This is one bounded object check,
  not certification of every bucket policy or stored object.
- The latest recorded backup was READY, completed 4 October 2026 at 00:00:17
  Asia/Riyadh. This does not certify external recovery or storage durability.

**Open provider action:** DATABASE_URL and DIRECT_URL currently identify the
same database role. Its metadata permits role/database creation and bypassing
row-level security. The runtime should have a separate login with only business
DML permissions while migrations retain a separate owner. A reviewed NOLOGIN
permission-group script is prepared in server/prisma/runtime-access.sql; it
has NOT been executed and does not create or disclose a password.

Render/Neon account MFA, team access, credentials, network controls, database
role switching, storage administrator IAM, and external backup recovery require
access to the provider consoles. No authenticated provider console or provider
API credential was available. These controls are not described as completed.
No secret was rotated; backup encryption keys must never be changed blindly.

## 4. Reproducible tax migrations

The complete original tax schema is now recorded in an additive baseline
migration, sorted before the existing owner-name migration. It creates a fresh
table, enums, indexes and four foreign keys, or retains the existing objects
and records. It does not insert demo tax records and does not edit the applied
owner-name migration. TAX_MIGRATIONS.md explains deployment and verification.

The integration check applies the full ordered migration chain to an empty
schema, validates the 32 tax columns and four foreign keys, then replays the
baseline over an existing synthetic record and asserts preservation.

## 5. Authenticated access verification

scripts/security-integration.cjs uses the actual application, signed tokens,
revocable sessions, real routers, real RBAC and a real PostgreSQL database.
CI creates its own disposable PostgreSQL service. The script creates an owned
random test schema and never starts the scheduler, emails or WhatsApp.
It requires SECURITY_TEST_DATABASE_URL explicitly, with no production fallback.

Seven synthetic accounts cover Super Admin, Admin, Accountant, HR, Manager,
Viewer and Employee. Checks cover finance/tax access, backup administration,
self-promotion prevention, wildcard role changes, owner-name persistence,
private attachments and cross-module linking, permission revocation, revoked
and expired sessions, and inactive accounts. They do not verify branch isolation.

Local regression results: 160 server tests, 22 client tests and 10 build-security
tests passed. Client/server production builds passed. The branch CI additionally
ran 38 authenticated and migration integration checks successfully before production merge.
Verified branch run: https://github.com/sanadhub97-maker/sanad-app/actions/runs/37234582953.

## Execution boundaries

Automatic approval review rejected creating a temporary schema within the
production database and extracting a stored GitHub credential for log access.
Neither action was executed. Testing was moved to a separate CI PostgreSQL
service. Diagnostics use public check annotations without obtaining credentials.
