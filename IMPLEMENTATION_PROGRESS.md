# Requested expansion — 2026-10-02

User selected items 5, 6 and every item 11–61 from the feature catalogue. Payment approvals and integrations 62–67 remain excluded. Existing features must be extended rather than duplicated.

All items below are pending unless explicitly checked. A compiled page alone is not completion: persistence, permissions, validation and appropriate tests are required.

## Workforce and document workflows
- [x] 5 Assets: inventory, assignment, return and printable receipts.
- [x] 6 Offboarding: tracked clearance, outstanding assets, documents and controlled completion.
- [x] 11 Renewal lifecycle.
- [x] 12 Renewal owner and deadline.
- [x] 13 Renewal cost linked to payments.
- [x] 14 Employee/branch document requirements.
- [x] 15 Missing-document follow-up with owners and dates.
- [ ] 16 OCR extraction with human confirmation.
- [ ] 17 Search scanned document text.
- [ ] 18 Compare retained document revisions.
- [ ] 19 Printable reference/QR verification without exposing private data.
- [ ] 20 Employment letters and handover templates.

## Notifications
- [ ] 21 Per-document-type thresholds.
- [ ] 22 Responsible employee/branch recipients.
- [ ] 23 Escalation of overdue follow-up.
- [ ] 24 Snooze with recorded reason.
- [ ] 25 Weekly completion/pending summary.
- [ ] 26 Link alerts, tasks and renewals.
- [ ] 27 Personal preferences.

## Finance
- [x] 28 Employee/branch cost dashboard.
- [x] 29 Period and branch comparisons.
- [ ] 30 Recurring financial obligations.
- [ ] 31 Budgets and overrun alerts.
- [ ] 32 Advances and settlements.
- [x] 33 Duplicate payment findings.
- [ ] 34 Payment/document/renewal relationships.

## Reports
- [ ] 35 Personal dashboard cards.
- [ ] 36 Branch compliance comparisons.
- [ ] 37 Monthly trends.
- [ ] 38 Custom report columns/filters.
- [ ] 39 Saved reports/filters.
- [ ] 40 Scheduled report filters/formats.
- [ ] 41 Exception report.
- [ ] 42 Unified expiry/renewal/task/calendar.

## Data and usability
- [ ] 43 Import before/after review.
- [ ] 44 Similar-name findings.
- [ ] 45 Reviewed audited merge with retained history.
- [ ] 46 Controlled master lists.
- [ ] 47 Form drafts.
- [ ] 48 Record shortcuts.
- [ ] 49 Personal table columns/order.
- [ ] 50 Form guidance.
- [ ] 51 Search filters and attachment text.

## Security and continuity
- [ ] 52 Branch-scoped access on all relevant existing/new endpoints.
- [ ] 53 Sensitive-field permissions across API, files, reports and search.
- [ ] 54 Optional additional verification factor.
- [ ] 55 Unusual sign-in alerts.
- [ ] 56 Administrative session policy.
- [ ] 57 Periodic file/link integrity checks.
- [ ] 58 Isolated backup restoration drills.
- [ ] 59 System health dashboard.
- [ ] 60 Performance/error monitoring and administrative alerts.
- [ ] 61 Retention/archive policies.

## Validation and release
- [ ] Schema migrations complete and verified.
- [ ] Unit/API/security tests.
- [ ] Isolated database end-to-end validation.
- [ ] Arabic/English PDF and ZIP verification.
- [ ] Client/server production builds.
- [ ] Deployment and health/version verification.

Production must never be restored as an automated test. Keep backups encrypted, WhatsApp eligibility limited to sponsored employees and company documents, and excluded features disabled. Do not remove user data during migration or perform destructive merge/archive without a concrete reviewed request.

## Verified first release
The operations migration was successfully applied to production on 2026-10-03. Client/server builds, 133 server tests and 9 client tests passed. Isolated PostgreSQL HTTP tests verified concurrent assignment/renewal/follow-up deduplication, clearance guards, document revision retention, linked task completion, requirements matching, financial totals and access restrictions. An encrypted backup and complete restore were exercised only against the synthetic isolated schema. Ten Arabic/English PDFs contain 12 nonblank A4 pages; a ZIP contains two actual dossier PDFs.

The user confirmed: general administration sees all branches, branch managers see their branch, and financial data is restricted to administration/accounting. The financial role gate is implemented for Super Admin/Admin/Accountant and rechecked by the API and UI. Branch isolation and the remainder of sensitive-field control are still pending; item 53 is not complete. There is no salary/payroll module in the existing schema.

Requirements and follow-up metadata use the existing backed-up Setting model. Missing-document scans batch-fetch documents and page results; they do not run one query per employee. Rules can be disabled instead of deleting their history. Offboarding access/settlement steps are explicit human confirmations, not automatic account revocation or payment execution.
