# Add Postgres-backed bookmarks repository [DONE]

## Description

Add the data-access layer that will replace direct `bookmarks.json` reads and writes. This task only introduces `src/lib/bookmarks.ts` (plus tests) and keeps every page and API route on JSON, so the app keeps working unchanged.

The module owns all SQL against the `bookmarks` table created in task 013 and converts rows to/from the existing `Bookmark` shape in `src/types.ts` (`created_at`/`updated_at` stay ISO strings). Pages in the follow-up task will call these functions instead of touching `fs`.

## Checklist

- [x] Make the database client lazy so tests can import modules that depend on it without `DATABASE_URL` set. Suggested: keep the exported `sql` for existing scripts, add `getSql()` that builds/caches the client on first use, and have the repository call `getSql()`.
- [x] Create `src/lib/bookmarks.ts` exporting:
  - `listBookmarks(): Promise<Bookmark[]>` — `SELECT` all columns `ORDER BY updated_at DESC` (ties broken by `id` for stable output).
  - `getBookmark(id: string): Promise<Bookmark | null>` — single row by id.
  - `createBookmark(input: NewBookmark): Promise<Bookmark>` — generates `id` with `uuidv7()`, sets `created_at` and `updated_at` to the same `toISOString()` value, `clicks` to `0`; returns the stored row.
  - `updateBookmark(id: string, input: BookmarkInput): Promise<Bookmark | null>` — updates `url`, `title`, `notes`, `category`, `tags`, `clicks`, and sets `updated_at` to now; does not touch `created_at`; returns `null` when the id does not exist.
  - `deleteBookmark(id: string): Promise<boolean>` — returns whether a row was deleted.
  - `incrementBookmarkClicks(id: string): Promise<{ id: string; clicks: number } | null>` — `UPDATE ... SET clicks = clicks + 1` that does **not** change `updated_at`; returns `null` when missing.
- [x] Export a pure `rowToBookmark(row)` mapper and use it everywhere; convert `Date` values from `timestamptz` to ISO strings there.
- [x] Add `src/lib/bookmarks.test.ts` covering `rowToBookmark` (Date → ISO, `tags` passthrough) and any pure helpers, without needing a live database.
- [x] Verify each function against the local Postgres from tasks 013/014 using a temporary script (delete it afterwards): list order, get hit/miss, create, update (including `updated_at` change and `created_at` preservation), delete, and clicks increment that leaves `updated_at` untouched.
- [x] Run `node --test src/lib/*.test.ts` (no `DATABASE_URL` required) and `astro build`.

## Notes

- **Schema reference:** `id text PK`, `url text NOT NULL`, `title/notes/category text NOT NULL DEFAULT ''`, `tags text[] NOT NULL DEFAULT '{}'`, `clicks integer NOT NULL DEFAULT 0 CHECK (clicks >= 0)`, `created_at/updated_at timestamptz NOT NULL`.
- **Type shape:** reuse `Bookmark` for stored records; define `NewBookmark` (no `id`/`clicks`/timestamps) and `BookmarkInput` (editable fields including `clicks`) locally or in `src/types.ts`.
- **No JSON fallback:** missing `DATABASE_URL` must still fail with the clear error from `db.ts`; do not catch it or return `[]`.
- **Current behaviour to preserve:** clicks never modify `updated_at`; editing updates `updated_at`; `/` sorts newest-first and `/home` sorts by clicks then `updated_at` in the app layer (`sortByLastEdited` / `sortByClicks`), so the repository only needs `updated_at DESC`.
- **Out of scope:** switching pages (`/`, `/home`, `/new`, `/:id`, `/delete/:id`, `/import`), `/api/clicks`, bulk import/upsert for the HTML import page, deleting `bookmarks.json`, and updating `PLAN.md`. Those are follow-up tasks.
