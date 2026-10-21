# Remove legacy JSON storage and import tooling [DONE]

## Description

The app now reads and writes PostgreSQL everywhere, so remove the JSON leftovers in one cleanup: the runtime file, the parser and its tests, the one-time import script and npm entry, the unused in-memory click helper, and the related `.gitignore`/`PLAN.md` references.

Before deleting anything, confirm `SELECT COUNT(*) FROM bookmarks` is **500** (the number of records originally imported) so the database is the complete source of truth. This permanently deletes the local `bookmarks.json`; there are no `.bak` files.

Specific removals:

- Delete `bookmarks.json` (root, gitignored).
- Delete `src/lib/bookmarks-json.ts` and `src/lib/bookmarks-json.test.ts`.
- Delete `scripts/import-json.ts`.
- Remove `"db:import-json"` from `package.json` scripts.
- Remove `incrementClicks` from `src/lib/clicks.ts` (unused since `/api/clicks` moved to `incrementBookmarkClicks`) along with its import of `Bookmark` and its three tests in `src/lib/clicks.test.ts`. Keep `normalizeClicks` and `parseClicks`, which are still used.
- Remove the `bookmarks.json` / `bookmarks.json*.bak` entries from `.gitignore`.
- Update `PLAN.md`: drop the one-time JSON import mention and historical note in **Storage**, change the Ollama line from "does not modify `bookmarks.json`" to "does not modify stored bookmarks", remove `bookmarks-json` and "increment" from **Conventions and Helpers**, and update the passing test count.

## Checklist

- [x] Verify `SELECT COUNT(*) FROM bookmarks` is 500.
- [x] Delete `bookmarks.json`, `src/lib/bookmarks-json.ts`, `src/lib/bookmarks-json.test.ts`, and `scripts/import-json.ts`.
- [x] Remove the `db:import-json` script from `package.json`.
- [x] Remove `incrementClicks` and its tests, keeping the rest of `src/lib/clicks.ts` intact.
- [x] Remove the JSON entries from `.gitignore`.
- [x] Update `PLAN.md` (Storage, Ollama, Conventions, test count).
- [x] Confirm `grep -rn "bookmarks-json\|bookmarks\\.json\|import-json\|incrementClicks" src scripts package.json PLAN.md .gitignore` returns nothing.
- [x] Run `node --test src/lib/*.test.ts` (expect **58** passing) and `astro build`.
- [x] Start `astro dev --background` and confirm `/` still lists 500 bookmarks, `/home` renders, and `/import` loads; then stop the server.

## Notes

- The database remains untouched; this task only deletes files and dead code.
- Keep `scripts/migrate.ts`, `db:migrate`, the `fixtures/` HTML fixture, `src/lib/bookmarks-import.ts` (HTML merge), and `src/types.ts`.
- `package.json` also has a `"suggest-todos": "node scripts/suggest-todos.ts"` entry whose file does not exist. It is unrelated to the JSON migration and out of scope here.
- `bookmarks.json` is gitignored, so deleting it will not show in `git status`; it is a local data file, not a tracked artifact.
