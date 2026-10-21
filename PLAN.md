# Bookmarker — High-Level Plan

An Astro-based bookmarks manager with Ollama-powered tagging suggestions and click-based popularity ranking.

## Project Structure

Astro application with server output (`@astrojs/node`, standalone). Pages under `src/pages`, interactive React islands under `src/components`, reusable logic and tests under `src/lib`, shared styling in `public/style.css`, and fixture data under `fixtures/`. Wallpapers live in `public/wallpapers` (a symlink to the local pictures folder); `scripts/wallpapers.ts` can regenerate `public/wallpapers.json` with the current image list.

## Tech Stack

- Node.js >= 22
- Astro 7 with TypeScript (strict)
- React 19 via `@astrojs/react` for interactive islands
- PostgreSQL via the `postgres` (postgres.js) driver
- `ollama`, `uuid`, and `node-html-parser`
- Tests run with `node --test src/lib/*.test.ts` (66 passing)

## Data Model

A bookmark record with: `id` (UUID v7), `url`, `title`, `notes`, `category` (single string, empty when unset), `tags` (lowercased string array), `clicks` (non-negative integer), `created_at`, `updated_at`.

## Storage

Bookmarks live in PostgreSQL, in the `bookmarks` table created by `db/migrations/001_init.sql`. The connection string comes from `DATABASE_URL`; migrations run with `pnpm db:migrate`.

`src/lib/db.ts` provides a lazily created shared postgres.js client (`getSql()`), and `src/lib/bookmarks.ts` owns all SQL: list (newest edited first), count, search, get, create, update, delete, and the clicks increment that never touches `updated_at`. Rows are mapped to the `Bookmark` shape with ISO-string timestamps.

All routes, including the HTML import, read and write PostgreSQL. No JSON data files or JSON import tooling remain.

## Click Tracking

Each bookmark carries a `clicks` counter, initialized to `0` (existing records were backfilled). `/home` increments it through `POST /api/clicks` (JSON `{ id }`) when the user opens a bookmark with Enter or a plain left-click. The client sends the request with `keepalive` and does not wait for it before navigating; failures are silent. Incrementing clicks never changes `updated_at`. `/home` orders results by clicks descending, then `updated_at` descending. `/` displays the count as a badge next to each title, and `/:id` provides a numeric field for manual edits.

## Ollama Integration

Tagging is stateless via `POST /api/suggest`. The endpoint accepts JSON `{ url, title }` and returns `{ tags, notes }`; it does not modify stored bookmarks. Chat uses the installed `ollama` package, reads `OLLAMA_MODEL` (default `qwen3.5:9b`), gives the model a DuckDuckGo Instant Answer `web_search` tool (8s timeout), runs up to five tool rounds, and requests structured JSON output. Suggestions and tags are normalized and lowercased. The "AI" button on the add/edit forms fills tags and notes only, leaving user-entered values intact.

## Routes/Pages

- `/` by default lists 10 random bookmarks. If search terms provided, finds bookmarks server-side through `/api/bookmarks`. A query starting with `WHERE` is appended to `SELECT * FROM bookmarks` verbatim as a single statement; otherwise every whitespace-separated term must appear in the title, category, notes, tags, or URL, and results are ranked by clicks (descending) then title. Each title shows its click count as a badge.
- `/home` is a launcher page with a random photo background and an autofocused search box. The background is picked by `pickWallpaper()` from the images in `public/wallpapers/`; when none are available, the remote `static.photos` CSS background is used. Results stay hidden until the user types, are sorted by clicks (descending) then `updated_at`, show titles only, and auto-select the first match. Enter or a plain left-click opens the selected bookmark in the current tab and increments its click count; with no results, Enter searches Google. Escape hides the results without clearing the query.
- `/new` creates a bookmark.
- `/:id` edits a bookmark, including its click count.
- `/delete/:id` deletes a bookmark.
- `/import` uploads and merges a Netscape `bookmarks.html` file, deriving categories from the folder hierarchy (browser container folders are skipped) while preserving existing tags and non-empty categories.
- `/export` downloads every bookmark as `bookmarks-YYYY-MM-DD.html`, rebuilding categories as nested folders and preserving notes.
- `/api/suggest` generates tag/notes suggestions, `/api/clicks` increments a bookmark's click count, and `/api/bookmarks?q=` returns `{ bookmarks, total }` for server-side search. Bookmark create/update/delete flow through form POSTs on the pages.

## Frontend

Server-rendered Astro with React islands, hydrated with `client:load`. `src/components/BookmarkSearch.tsx` owns the `/` header, search input, results, count, error states, and keyboard navigation, fetching `/api/bookmarks` on load and on Enter. `src/components/HomeLauncher.tsx` owns the launcher input and client-side filtering, keyboard selection, click tracking, and Google fallback; Astro still renders the wallpaper and `.home` wrapper around it. `src/components/SuggestionButton.tsx` is shared by `/new` and `/:id` and fills tags/notes through `/api/suggest`. Each component imports its own CSS file. Layouts, static pages, forms, redirects, and all POST handling remain in Astro, so forms still work without JavaScript. Minimal base CSS lives in `public/style.css`.

## Conventions and Helpers

`src/lib` contains: `tags`, `suggest`, `web-search`, `apply-suggestions`, `bookmarks-import`, `bookmarks-export`, `filter`, `search`, `navigation`, `sort` (click-based ranking), `clicks` (normalization, form parsing), and `wallpaper` (cached random wallpaper picker), each with a matching `*.test.ts` file. `db` holds the lazy postgres.js client and `bookmarks` the SQL repository (with tests).

## Out of Scope

Authentication, multi-user support, sharing, browser extension, and mobile clients are not in scope.
