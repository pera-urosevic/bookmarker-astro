# Add PostgreSQL foundation (schema, client, migration runner) [DONE]

## Description

Lay the groundwork for replacing `bookmarks.json` with PostgreSQL, without changing any page or API behaviour yet. This task adds the `postgres` (postgres.js) driver, a checked-in initial migration for a `bookmarks` table, a migration runner exposed as an npm script, and a shared database client module. Existing JSON storage stays in place until the follow-up tasks switch the pages over.

Connection settings come from `DATABASE_URL` (e.g. `postgres://user:pass@localhost:5432/bookmarker`). The app and scripts must fail with a clear message when it is unset; no silent fallback to JSON.

## Checklist

- [x] Add `postgres` as a runtime dependency (`pnpm add postgres`) and regenerate `pnpm-lock.yaml`.
- [x] Create `db/migrations/001_init.sql` with the `bookmarks` table:
  - `id` `text` primary key
  - `url` `text` not null
  - `title`, `notes`, `category` `text` not null default `''`
  - `tags` `text[]` not null default `'{}'`
  - `clicks` `integer` not null default `0` with `CHECK (clicks >= 0)`
  - `created_at`, `updated_at` `timestamptz` not null
  - Indexes for the two list sorts: `(updated_at DESC)` and `(clicks DESC, updated_at DESC)`.
- [x] Add `scripts/migrate.ts`: reads `db/migrations/*.sql` in filename order, creates a `schema_migrations (version text primary key, applied_at timestamptz not null default now())` table, applies only unapplied files (each in a transaction), and logs what ran.
- [x] Add `src/lib/db.ts`: a single `postgres()` client built from `DATABASE_URL`, throwing a clear error when the variable is missing, and exported for server-side imports.
- [x] Add npm scripts: `"db:migrate": "node --env-file-if-exists=.env scripts/migrate.ts"` (update `package.json`).
- [x] Verify against a local Postgres: `pnpm db:migrate` creates the table and indexes; running it a second time applies nothing.
- [x] Run `node --test src/lib/*.test.ts` and `astro build` to confirm the existing app still builds.

## Notes

- **Decisions already made:** postgres.js driver; tags as a `text[]` column; one-time migration of the existing `bookmarks.json`; SQL files plus an npm script rather than runtime auto-create.
- **Schema shape:** `id` stays `text` (not `uuid`) so the existing UUID v7 strings migrate verbatim and non-UUID ids remain possible.
- **Timestamps:** stored as `timestamptz` for correct ordering; the data-access layer added in the next task will convert them to/from ISO strings so `Bookmark` keeps its current shape.
- **Env loading:** scripts use `--env-file-if-exists=.env`; in Astro server code read `import.meta.env.DATABASE_URL` with a `process.env.DATABASE_URL` fallback, since Astro does not populate `process.env` from `.env` automatically.
- **Out of scope for this task:** CRUD/data-access functions, switching pages and `/api/clicks`, importing `bookmarks.json`, deleting the JSON file and backups, and updating `PLAN.md`/docs. Each is a follow-up task.
- `scripts/suggest-todos.ts` currently reads and writes `bookmarks.json`; it must be converted in a later task before the JSON file is removed.
