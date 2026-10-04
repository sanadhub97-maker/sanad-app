# Tax-return migration history and deployment verification

The tax table was originally installed outside Prisma migration history.
`20261004180000_tax_returns_baseline` records its complete original schema,
indexes and four foreign keys. It sorts before `20261004190000_tax_owner_name`
so an empty database can apply the owner-name change successfully.

On an existing database, Prisma deploy applies the previously unrecorded
baseline migration even though the later migration is already marked applied.
The baseline uses IF NOT EXISTS and scoped constraint checks, preserving rows,
owner names and existing schema objects. It never inserts demo declarations.
The previous applied owner-name migration is not edited.

Validation: `scripts/security-integration.cjs` applies the ordered migration
chain in a random, explicitly owned test schema, confirms all 32 tax columns
and four validated foreign keys, replays the baseline over a synthetic record,
and asserts preservation. It then tests authenticated routes using seven
synthetic roles. The application must be built first. The script requires
SECURITY_TEST_DATABASE_URL explicitly; it has no production URL fallback.
CI uses a dedicated PostgreSQL service with disposable fixture credentials.

Production deployment: `npx prisma migrate deploy --config=server/prisma.config.ts`.
Never use migrate reset, db push or demo seeds to reconcile production history.
