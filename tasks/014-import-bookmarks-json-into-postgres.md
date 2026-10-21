# Import bookmarks.json into Postgres [DONE]

## Description

Add a one-time import script that loads the existing `bookmarks.json` (500 records) into the `bookmarks` table created in task 013, preserving ids, click counts, and timestamps exactly. The script refuses to run if any bookmark id already exists in the database, as decided: it must abort before inserting anything rather than overwrite or skip silently. `bookmarks.json` remains in place and remains the app's source of truth until the pages are switched over in later tasks.

## Checklist

- [x] Add `src/lib/bookmarks-json.ts` with a `parseBookmarksFile(raw: string): Bookmark[]` helper that:
  - rejects non-array JSON and malformed entries with a message naming the array index;
  - requires a non-empty string `id` and a string `url`;
  - defaults missing `title`, `notes`, and `category` to `''`;
  - defaults missing `tags` to `[]` and rejects non-string-array values;
  - defaults missing `clicks` to `0` and rejects non-integer/negative values;
  - requires valid `created_at`/`updated_at` timestamps (accepts ISO strings stored as `Bookmark` strings);
  - rejects duplicate ids within the file.
- [x] Add `src/lib/bookmarks-json.test.ts` covering the happy path plus each rejection/default case above.
- [x] Add `scripts/import-json.ts`:
  - reads `bookmarks.json` from the project root (optional CLI path argument);
  - parses it with `parseBookmarksFile`;
  - pre-checks `SELECT id FROM bookmarks WHERE id = ANY($1)` and exits with status 1 listing the conflicting id count/ids if any exist, without writing;
  - bulk-inserts all rows with an explicit column list inside one transaction (`id`, `url`, `title`, `notes`, `category`, `tags`, `clicks`, `created_at`, `updated_at`);
  - prints the number of imported rows and closes the client on success/failure.
- [x] Add `"db:import-json": "node --env-file-if-exists=.env scripts/import-json.ts"` to `package.json`.
- [x] Verify against local Postgres: import inserts 500 rows; `SELECT COUNT(*)` matches the JSON length; spot-check tags, clicks, and timestamps for an existing bookmark.
- [x] Verify re-running the script aborts with the conflict message and leaves the row count unchanged.
- [x] Run `node --test src/lib/*.test.ts` and `astro build`.

## Notes

- **Conflict policy:** fail safely. Any pre-existing id aborts the whole import; no partial writes.
- **Do not use `ON CONFLICT`**; the pre-check plus a plain `INSERT` inside a transaction is intentional.
- **Timestamps:** pass the ISO strings straight to `timestamptz`; do not convert to local time.
- **Source of truth during the transition:** the app still reads/writes `bookmarks.json`, so this script is a snapshot. Do not delete the JSON file here; removal happens after all pages use the database. Re-running after new JSON edits will fail on existing ids by design.
- **Out of scope:** switching pages/API to Postgres, `scripts/suggest-todos.ts`, deleting JSON backups, and updating `PLAN.md`.
