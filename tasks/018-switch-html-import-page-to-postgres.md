# Switch HTML import page to Postgres [DONE]

## Description

Move the last JSON consumer — `/import` — onto Postgres. The page keeps the existing merge rules (match by URL, fill blank title/notes/category, preserve tags and clicks) but loads existing rows with `listBookmarks()` and persists only the changed rows (`imported` + `updated`) through a new bulk upsert.

Add `upsertBookmarks(bookmarks: Bookmark[]): Promise<void>` to `src/lib/bookmarks.ts`: a single transaction that inserts the rows and, on id conflict, updates every mutable column except `created_at`. Return early for an empty array. This handles both new rows and merge-updated rows in one round trip.

Then rewrite `src/pages/import.astro` to call `mergeBookmarks(await listBookmarks(), incoming)`, persist `[...merged.imported, ...merged.updated]`, and render the same summary. Remove `fs`, `path`, `bookmarksPath`, `readBookmarks`, and the `Bookmark` import.

## Checklist

- [x] Add `upsertBookmarks` to `src/lib/bookmarks.ts` using `getSql().begin(...)` and the `tx(bookmarks, ...columns)` helper; `ON CONFLICT (id) DO UPDATE` must not overwrite `created_at`.
- [x] Rewrite `src/pages/import.astro` as above, keeping the file size/type validation, error display, and summary markup unchanged.
- [x] Confirm `src/pages/import.astro` no longer references `bookmarks.json` or `node:fs`.
- [x] Verify against local Postgres with the dev server (`astro dev --background`), using a temporary existing row (tags `['keep']`, clicks `2`, blank title/notes/category) and a temporary HTML file that contains that URL (with title/notes/folder) plus one new URL:
  - upload → response shows Imported: 1, Updated: 1, Skipped: 0;
  - existing row: title/notes/category filled, tags and clicks preserved, `created_at` unchanged, `updated_at` advanced;
  - new row: correct url/title/category, `notes` is `#TODO#`, `tags` empty, `clicks` 0;
  - re-upload the same file → Imported: 0, Updated: 0, Skipped: 2, and the database rows are unchanged.
- [x] Delete the temporary rows and confirm `COUNT(*)` is back to 500.
- [x] Run `node --test src/lib/*.test.ts` and `astro build`.

## Notes

- **Merge logic is already covered** by `src/lib/bookmarks-import.test.ts`; `upsertBookmarks` is only a persistence adapter, so this task's testing is the live-DB verification above rather than a new unit test that would require a database in `node --test`.
- `mergeBookmarks` matches by `url`, so a fresh import cannot hit the `id` conflict path unless the same row is both imported and updated — it only upserts `imported` + `updated` to avoid rewriting `skipped` rows.
- `ON CONFLICT (id) DO UPDATE` keeps `created_at` from the existing row and takes `updated_at` from the merge result.
- The page already catches errors and shows the message inline; that stays, so a database failure is visible rather than a silent success. Validation errors still render in the same block.
- **Out of scope:** removing `bookmarks.json`, `src/lib/bookmarks-json.ts`, `scripts/import-json.ts`, `db:import-json`, or the now-unused `incrementClicks` helper. Those are the final cleanup task, along with updating `PLAN.md`.
