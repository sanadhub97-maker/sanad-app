# Security review — 4 October 2026 (Asia/Riyadh)

This is a source review, dependency audit and bounded runtime verification, not a guarantee that all vulnerabilities have been eliminated. Production data was not deleted or restored; no notifications or emails were sent by the tests.

## Confirmed issues repaired

- Violation payment creation now requires both `violations.pay` and `payments.create`. The finance-role boundary also rejects `violations.pay` and `taxReturns.*` outside administration/accounting, even when a legacy role has wildcard permissions.
- Linked payment identifiers and metadata in violation responses are withheld without `payments.view`.
- Tax and violation attachments are checked for existence, module and access before linking. Tax files use the finance access policy. Existing tax attachment modules were checked read-only; no invalid links were found.
- Notification visibility now recognizes violations and tax returns. Violation reminders check current permissions before selecting recipients and again before device delivery.
- Related-document suggestions in violations respect the source document permissions.
- Tax input validation limits identifiers, references, notes, searches and numeric amounts, rejects non-finite numbers and impossible calendar dates, and retains valid negative VAT refunds.
- The standalone tax demo seed refuses production databases and requires an isolated test target, preventing accidental insertion of fictional financial records.

## Other controls reviewed

Authentication checks revocable database sessions, active accounts, expiry, token signature algorithm, issuer and audience. Password reset/change invalidates sessions; password-reset claims are transactional. Public account registration is absent; role modification is limited to the super administrator and user role assignment checks privilege escalation.

Request controls include trusted origins, API/auth/upload/backup rate limits, bounded body/upload sizes, content-signature checks, safe storage keys, no-store API responses and private file authorization. PDF rendering disables page scripts and restricts outbound resources. Backup operations require super-administrator access and password confirmation; archive limits and encrypted backup handling have regression coverage. Existing SSRF guards, signed push capabilities and spreadsheet/HTML escaping were inspected through source and tests.

Tracked configuration files and application source were checked for common secret/private-key patterns; no matching embedded keys were found in that bounded scan. This does not certify Git history, provider consoles or all secret types.

## Verification

- 154 server tests and 22 client tests passed, including new negative authorization and attachment tests. Client/server production builds passed.
- Live requests to 14 private GET endpoints without credentials plus one malformed bearer-token request returned HTTP 401 with `Cache-Control: no-store`.
- Live HSTS and `X-Content-Type-Options: nosniff` headers were verified.
- `npm audit --omit=dev` reported zero known production dependency vulnerabilities.
- Read-only production role check found one active Super Admin and no active branch-manager account at review time.

## Remaining risks and limits

1. **Branch isolation is not complete.** The model contains branch-manager assignments, but business services do not consistently apply them to every read/export/write. Do not consider a future branch-manager account isolated until that scope is implemented and verified across modules. The current role check does not replace these controls.
2. **Build-tool advisories remain.** Full `npm audit` reported seven high-severity entries propagated from `braces` through build/watch tools. npm reported `3.0.3` as the latest release at review time; the advisory includes that version. No unsafe forced downgrade/major migration was applied. Keep build glob patterns repository-controlled and do not feed them external input. Advisory: https://github.com/advisories/GHSA-vfj7-8cjw-p6xm.
3. **Hosting/database/storage administration was not audited from provider consoles.** IAM, secret rotation, external backups, firewall settings, abuse monitoring and account MFA cannot be certified from this repository review.
4. The tax schema was previously added outside a committed Prisma migration; preserving a reproducible fresh deployment needs a separate reviewed migration. This release does not alter production schema.
5. Historical data/attachments, third-party integrations and all business workflows have not undergone an exhaustive authenticated penetration test. No destructive tests or bulk credential attempts were run against production.

The remaining findings are not described as fixed, and this review should not be presented as “complete protection”.
