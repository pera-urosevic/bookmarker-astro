# Switch list and home pages to Postgres [DONE]

## Description

Replace the direct `bookmarks.json` reads in the two read-only pages with the repository from task 015. After this task, `/` and `/home` render data from the `bookmarks` table; every other page and `/api/clicks` still uses JSON until the follow-up tasks.

- `src/pages/index.astro`: drop `fs`, `path`, `bookmarksPath`, and the JSON parsing/catch block; use `await listBookmarks()` and keep `sortByLastEdited` plus the existing sort toggle.
- `src/pages/home.astro`: same replacement, keeping `sortByClicks` and the existing launcher behaviour.

Let database errors propagate (Astro returns a 500) instead of silently rendering an empty list, matching the no-JSON-fallback rule from task 015.

## Checklist

- [x] Update `src/pages/index.astro`: import `listBookmarks` from `../lib/bookmarks.ts`, load with top-level `await`, remove the `node:fs`/`node:path` imports, the `bookmarksPath` constant, and the `try/catch` that defaulted to `[]`.
- [x] Update `src/pages/home.astro` the same way, keeping `sortByClicks` after the fetch.
- [x] Confirm both pages no longer reference `bookmarks.json`.
- [x] Verify against the local Postgres: start `astro dev --background`, load `/` and confirm the count matches `SELECT COUNT(*)` (currently 500) and newest-first order still holds; load `/?sort=oldest` and confirm reversal; load `/home` and confirm titles render with the click-ranked order (compare the first items against `ORDER BY clicks DESC, updated_at DESC`).
- [x] Verify a bookmark created via SQL/repository appears on `/` after reload, then delete it.
- [x] Run `node --test src/lib/*.test.ts` and `astro build`.

## Notes

- `listBookmarks()` already returns `updated_at DESC`; the pages' existing sort helpers still run so `?sort=oldest` and the clicks-first home ranking are unchanged.
- No new lib code or tests are required; this task only rewires two page frontmatters.
- Keep the pages server-rendered; do not add client-side data fetching.
- **Out of scope:** `/new`, `/:id`, `/delete/:id`, `/import`, `/api/clicks`, removing `bookmarks.json`, and updating `PLAN.md`.
