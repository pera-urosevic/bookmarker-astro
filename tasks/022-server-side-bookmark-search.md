# Server-side Bookmark Search and API [DONE]

## Description

Replace the client-side filtering on `/` (`src/pages/index.astro`) with server-side
search backed by PostgreSQL and a new `GET /api/bookmarks` endpoint.

The search input supports two modes:

1. **Custom SQL mode** — when the trimmed input starts with `WHERE`
   (case-insensitive), run the input as the predicate of
   `SELECT * FROM bookmarks <input>`. The user's query is used verbatim, including
   any `ORDER BY`/`LIMIT`; no app sorting or ordering is added. Embedded
   semicolons are rejected so only a single statement can run.
2. **Plain-text mode** — split the input on whitespace. Every term must appear
   (case-insensitive substring) in at least one of `title`, `category`, `notes`
   (the "description"), `tags`, or `url`. Results are ordered by `clicks`
   descending, then `title` ascending.

An empty input returns all bookmarks in the random order (`ORDER BY RANDOM()`).

The page no longer filters server-rendered items in the browser. It fetches JSON
from the API on load and whenever the query changes, then renders the list from
that response. The newest/oldest sort toggle is removed entirely, along with the
now-unused `parseSortOrder`/`sortByLastEdited` helpers and their tests.

## Checklist

- [x] Add pure search helpers in `src/lib/search.ts`: - `isSqlQuery(input)` — true when the trimmed input starts with `where`
      (case-insensitive). - `searchTerms(input)` — trimmed input split on whitespace, empty terms
      removed. - `escapeLike(term)` — escape `\`, `%`, and `_` for literal `ILIKE`
      substring matching. - `hasStatementSeparator(input)` — true when a custom query contains `;`.
- [x] Add `searchBookmarks(query: string): Promise<Bookmark[]>` to
      `src/lib/bookmarks.ts` (all SQL stays in this module): - Empty query → `SELECT * FROM bookmarks ORDER BY updated_at DESC, id`. - Custom query → reject semicolons, then run
      `SELECT * FROM bookmarks ${unsafe(input)}` with `rowToBookmark` mapping,
      preserving the user's own ordering. - Plain-text query → one `AND`-joined condition per term, where the term
      matches any of `title`, `category`, `notes`, `url`, or
      `array_to_string(tags, ' ')` via `ILIKE` with escaped `%term%` patterns;
      add `ORDER BY updated_at DESC, id`.
- [x] Add `countBookmarks(): Promise<number>` to `src/lib/bookmarks.ts` for the
      unfiltered "X of Y" total.
- [x] Add `GET /api/bookmarks` (`src/pages/api/bookmarks.ts`): - Read `q` from `searchParams` (default `''`). - Return `{ bookmarks, total }` with `countBookmarks()` as `total`. - On an invalid custom query, return `400` with
      `{ error: '<database message>' }` (or the semicolon validation message). - Unexpected failures return `500` with a generic JSON error; add an
      `ALL` handler returning `405`, matching `src/pages/api/clicks.ts`.
- [x] Rewrite `/` rendering in `src/pages/index.astro`: - Remove the SSR bookmark list, `data-search`, `bookmarkSearchText`, and
      the sort head script / toggle / `?sort=` handling. - Render an empty `.bookmark-list` shell plus the existing no-results,
      error, and count elements; fetch on page load. - Keep query persistence in `localStorage` (`bookmarker:search`) and the
      `?q=` URL parameter, restoring either on load. - Debounce input (~200 ms) and abort any in-flight request before firing
      the next one. Show an inline error on non-OK responses and clear it on
      the next successful fetch. - Render each bookmark with safe DOM APIs (`textContent`, no `innerHTML`
      with bookmark data): title link, category, click badge, Edit/Delete
      links, notes, and tag chips, matching the current markup/classes. - Rebuild the keyboard-navigation item list after every render; keep
      Arrow/Enter/E/Escape behavior working on the fresh results. - Count reads `X of Y` using the response's `total`; show
      "No bookmarks yet." when `total === 0` and the query is empty, and
      "No bookmarks match your search." when the query is non-empty and the
      result is empty.
- [x] Delete `parseSortOrder` and `sortByLastEdited` from `src/lib/sort.ts`
      (keep `sortByClicks` for `/home`) and remove their tests/imports from
      `src/lib/sort.test.ts`.
- [x] Add `src/lib/search.test.ts` covering `isSqlQuery`, `searchTerms`,
      `escapeLike`, and `hasStatementSeparator` (whitespace, mixed case, leading
      whitespace, wildcard escaping, empty input).
- [x] Update `PLAN.md` route/frontend sections: server-side search with custom
      `WHERE` SQL mode, the new `/api/bookmarks` endpoint, no sort toggle, and
      `/home` still using client-side filtering.
- [x] Verify with `pnpm test` and the dev server
      (`astro dev --background`): - plain multi-word queries match across fields (including URL and tags); - `WHERE category = 'Dev'` and `WHERE ... ORDER BY title` work verbatim; - an invalid custom query shows the inline error; - clearing the query restores all bookmarks; count and keyboard
      navigation update after each fetch.

## Notes

- "Description" in the request maps to the existing `notes` column.
- URL remains searchable, confirmed by the user.
- Custom SQL is intentionally raw for this local, single-user app. Only append
  the input after `WHERE` and reject `;`; do not attempt to parse or rewrite the
  user's SQL.
- `ILIKE` wildcards in user terms must be escaped so plain-text mode remains a
  literal substring match, matching the old client-side behavior.
- `/home` keeps its client-side launcher filtering; `src/lib/filter.ts` stays.
- `formatVisibleCount` can still be imported by the index client script.
- Follow existing style: tabs, no semicolons, single quotes, `.ts` import
  extensions in tests.
