# Switch write pages and clicks API to Postgres [DONE]

## Description

Point every remaining bookmark write at the repository from task 015. After this task the full CRUD UI and click tracking run on Postgres: `/new`, `/:id`, `/delete/:id`, and `POST /api/clicks`. Only the HTML import page still reads/writes `bookmarks.json`.

- `src/pages/new.astro`: replace the fs read/append/write with `await createBookmark({ url, title, notes, category, tags })`; drop the `uuid` import, `fs`/`path`, `bookmarksPath`, and the local `Bookmark` construction. The repository already generates the id, sets `clicks` to `0`, and sets both timestamps.
- `src/pages/[id].astro`: load with `await getBookmark(id)` and `redirect('/')` when missing; on POST call `await updateBookmark(id, { url, title, notes, category, tags, clicks })` and redirect to `/` on success. Keep `parseTags`/`parseClicks` for form input.
- `src/pages/delete/[id].astro`: load with `await getBookmark(id)`; on POST call `await deleteBookmark(id)` and redirect to `/`.
- `src/pages/api/clicks.ts`: call `await incrementBookmarkClicks(body.id)`; keep the existing `{ id, clicks }` success payload, `400` for a missing/blank id, `404` for an unknown bookmark, and a JSON `500` when the database call throws.

Do not swallow database errors into a silently re-rendered form. Form-parse errors may keep the old fall-through behaviour, but a failed database write should surface as an error response rather than look like a successful no-op.

## Checklist

- [x] Rewrite `src/pages/new.astro` as above and remove now-unused imports.
- [x] Rewrite `src/pages/[id].astro` as above and remove the fs read/array search/write block.
- [x] Rewrite `src/pages/delete/[id].astro` as above and remove the fs block.
- [x] Rewrite `src/pages/api/clicks.ts` to use `incrementBookmarkClicks`, removing `node:fs`, `node:path`, `Bookmark`, and `incrementClicks`.
- [x] Confirm none of the four files reference `bookmarks.json`.
- [x] Verify against local Postgres with the dev server (`astro dev --background`):
  - create via `POST /new` → 302 to `/`, row count +1, generated id/clicks/timestamps correct;
  - edit that row via `POST /:id` with changed tags and clicks → fields updated, `updated_at` advanced, `created_at` unchanged;
  - `POST /api/clicks` twice → payload clicks increment, `updated_at` unchanged, unknown id → 404, blank body → 400;
  - `POST /delete/:id` → 302, row removed.
  - Clean up all test rows and confirm `COUNT(*)` is back to 500.
- [x] Run `node --test src/lib/*.test.ts` and `astro build`.

## Notes

- The repository handles ids and timestamps, so pages no longer need `uuidv7` or `new Date().toISOString()`.
- `incrementBookmarkClicks` is a single atomic `UPDATE ... SET clicks = clicks + 1`, so the old read-modify-write race is gone.
- `/api/clicks` is fire-and-forget from the client; still return JSON errors so failures are observable in the network tab.
- Task 016 left `/` and `/home` reading from Postgres, so CRUD changes verified through those pages already come from the database.
- **Out of scope:** `/import`, removing `bookmarks.json`, `bookmarks-json.ts`, the `db:import-json` script, and the now-unused `incrementClicks` helper; cleaning those up is a later task once the import page is migrated.
