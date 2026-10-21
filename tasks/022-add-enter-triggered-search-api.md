# Add Enter-triggered search with SQL passthrough

## Description

Replace the live, client-side filtering on `src/pages/index.astro` with a
server-side search request that runs when the user presses Enter. Plain text
continues to match title/url/notes/tags, but a query whose first non-whitespace
word is `select` (case-insensitive) is executed as a single read-only SQL
`SELECT` and its rows are rendered as bookmark cards.

The endpoint is `POST /api/search` with a JSON body:

```json
{ "query": "example", "sort": "newest" }
```

It responds with `{ "bookmarks": Bookmark[], "total": number }`, where `total`
is the total number of bookmarks in the table. Invalid SQL or rows that do not
contain the standard bookmark columns return `400` with `{ "error": "..." }`;
database failures return `500`.

Search behavior:

- Empty/whitespace query returns every bookmark.
- Plain text is split on whitespace; every term must appear (case-insensitive)
  in the concatenation of `title`, `url`, `notes`, and `tags`, in any order.
- SQL mode is detected by `query.trim().toLowerCase().startsWith('select')`.
- SQL must be a single statement. A trailing semicolon is allowed; any other
  semicolon is rejected. It runs inside a `READ ONLY` transaction with a
  statement timeout so writes and DDL cannot succeed.
- SQL results must expose `id`, `url`, `title`, `notes`, `category`, `tags`,
  `clicks`, `created_at`, and `updated_at` so they can be mapped with the
  existing `rowToBookmark` helper.
- `sort` accepts `newest` (default) or `oldest` and applies to both plain-text
  and empty-query results. Custom SQL controls its own ordering.

## Checklist

- [ ] Add `src/lib/search.ts` with:
  - [ ] `isSqlQuery(query)` (leading whitespace and case-insensitive `select`).
  - [ ] `validateSelectQuery(query)` that rejects non-`select` statements,
    multiple statements, and empty input; strip one optional trailing `;`.
  - [ ] `isBookmarkRow(row)` to verify the required columns/types before mapping.
  - [ ] `searchBookmarks(query, sort)` implementing the empty, plain-text
    (parameterized), and single read-only `SELECT` paths.
- [ ] Add `src/lib/search.test.ts` covering SQL detection, validation
  (valid trailing semicolon, rejected writes/CTEs/multiple statements), and
  bookmark-row validation.
- [ ] Add `src/pages/api/search.ts` (`POST`, plus `ALL` returning `405`) that
  validates `query`/`sort`, calls `searchBookmarks`, and returns the JSON shape
  above with `400`/`500` errors handled consistently with the other API routes.
- [ ] Add a `listBookmarks`/`search` total count helper in
  `src/lib/bookmarks.ts` (or reuse a single `COUNT(*)` in `search.ts`) so the
  page can keep showing "visible of total".
- [ ] Update `src/pages/index.astro`:
  - [ ] Remove the client-side `matchesQuery`/`applyFilter` live filtering.
  - [ ] Add an Enter handler on the search input that calls `/api/search` with
    the current query and `sort` value, shows a loading/busy state, and
    prevents duplicate in-flight requests.
  - [ ] Render returned bookmarks as the existing card markup via safe DOM
    APIs (no `innerHTML` with bookmark data), reusing the current structure:
    title link, category, click badge, notes, tags, Edit/Delete links.
  - [ ] Refresh the `items` array and clear/revalidate the keyboard selection
    after every result render so Arrow/Enter/E shortcuts keep working.
  - [ ] Update `#bookmark-count` with `formatVisibleCount` and show a
    no-results message for a non-empty query with zero matches.
  - [ ] Show API errors (for example invalid SQL) inline instead of silently
    showing an empty list.
  - [ ] Persist the query to `?q` and localStorage only when a search is
    submitted, and restore + run it once on page load when present.
  - [ ] Keep the sort toggle passing the current query so a sorted reload
    re-runs the search.
- [ ] Remove the now-unused `data-search` attribute from the index page items
  (keep `bookmarkSearchText`/`matchesQuery` for `/home`).
- [ ] Update `PLAN.md` (`Routes/Pages` and `Frontend`) to describe Enter-only,
  API-backed searching and SQL passthrough.
- [ ] Run `pnpm test` and `pnpm build`.
- [ ] Manually verify: plain search on Enter, empty query restores all, SQL
  `select * from bookmarks where category = 'Dev'`, invalid SQL shows an
  inline error, sorting still works, and keyboard navigation works after
  results are replaced.

## Notes

- The follow-up design questions were dismissed, so these defaults are used:
  restore and run `?q`/localStorage on load; require standard bookmark columns
  from custom SQL; match the current title/url/notes/tags fields; keep the
  newest/oldest sort toggle.
- `sql.unsafe()` is only called after `validateSelectQuery`, and only inside a
  `READ ONLY` transaction. Plain-text search must stay fully parameterized with
  postgres.js fragments (`strpos(lower(...), ${term}) > 0` avoids `%`/`_`
  wildcard surprises).
- Apply a short `statement_timeout` (for example 5s) to custom SQL so a bad
  query cannot hang the page.
- `/home` keeps its existing client-side filtering; this task only changes `/`.
- PLAN.md still lists no auth/multi-user support, so arbitrary read-only
  `SELECT` access is acceptable for this local app, but do not loosen it to
  writes/DDL.
