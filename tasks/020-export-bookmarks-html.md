# Export bookmarks.html [DONE]

## Description

Add a `GET /export` route that downloads every bookmark in PostgreSQL as a Netscape `bookmarks.html` file, choosing the filename `bookmarks-YYYY-MM-DD.html` (UTC export date). The output must round-trip through the existing importer: categories become nested folder hierarchies, notes become `<DD>` entries, and the file can be re-imported without losing that data. Tags and clicks are not representable in the Netscape format and are intentionally not exported.

Add a small pure serialization module with tests, then a thin route, then link it from the list page next to Import.

### Serializer

Create `src/lib/bookmarks-export.ts`:

- Export `bookmarksToHtml(bookmarks: Bookmark[], now = new Date()): string`.
- Emit a valid Netscape bookmark file:

  ```html
  <!DOCTYPE NETSCAPE-Bookmark-file-1>
  <META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
  <TITLE>Bookmarks</TITLE>
  <H1>Bookmarks</H1>
  <DL><p>
  ...
  </DL><p>
  ```

- Build a folder tree from each bookmark's `category`, split on `/` and dropping empty segments (so `''`, `/dev`, `dev/`, and `dev//tools` are handled). A category like `dev/tools` nests two `<DL>` folders; the importer reconstructs `dev/tools` on re-import. Do **not** emit a synthetic "Bookmarks Bar" container.
- At each level emit bookmarks first, then subfolders. Sort bookmarks by title (case-insensitive) then URL, and folders alphabetically, so output is deterministic.
- Each bookmark: `<DT><A HREF="..." ADD_DATE="<unix seconds from created_at>">title</A>`, plus `<DD>notes` on the next line when notes are non-empty. Use the URL as the title fallback when the title is empty.
- Folder tag: `<DT><H3 LAST_MODIFIED="<unix seconds from updated_at>">name</H3>` (a reasonable seconds value; the importer only reads the name).
- Escape `&`, `<`, `>`, and `"` in titles, URLs, notes, and folder names. Use tabs/spaces consistent with the fixture format (`fixtures/sample-bookmarks.html`).
- Keep the generated HTML parseable by `parseBookmarks` from `bookmarks-import.ts`; do not modify the importer.

### Route

Create `src/pages/export.ts` (or `.astro`) with a GET handler:

- `const html = bookmarksToHtml(await listBookmarks())`.
- Respond with `Content-Type: text/html; charset=utf-8`, `Content-Disposition: attachment; filename="bookmarks-YYYY-MM-DD.html"` using the same UTC date passed to the serializer, and a `Content-Length` is optional (let Astro handle it).
- No query parameters and no page layout; this is a direct download.

### UI

In `src/pages/index.astro`, add an `Export` link next to the existing `Import` link in the header nav (`class="button ghost"`, `href="/export"`). No client-side script needed since the route sets `Content-Disposition`.

### Docs

Update `PLAN.md`: add `/export` to **Routes/Pages** (describing nested category folders and notes), and mention `bookmarks-export` in **Conventions and Helpers** with its test file. Update the passing test count after running the suite.

## Checklist

- [x] Create `src/lib/bookmarks-export.ts` with `bookmarksToHtml` (folder tree, escaping, notes, deterministic ordering).
- [x] Create `src/lib/bookmarks-export.test.ts`: empty list, escaping, notes omitted when blank, nested category folders (`dev/tools`), empty/duplicate-slash categories, title fallback to URL, folder and bookmark ordering.
- [x] Add a round-trip test that builds bookmarks, serializes them, runs `parseBookmarks`, and asserts URLs, titles, notes, and categories match the originals.
- [x] Create `src/pages/export.ts` with the download headers and UTC-dated filename.
- [x] Add the `Export` link to `src/pages/index.astro`.
- [x] Update `PLAN.md` (routes, helpers, test count).
- [x] Run `node --test src/lib/*.test.ts` and `astro build`.
- [x] Start `astro dev --background`, download `/export`, confirm the file name, headers, and that it re-imports to the same 500 bookmarks (or delete the merge result instead of committing it); then stop the server.

## Notes

- `listBookmarks()` returns newest-edited first; the serializer re-sorts for stable output, so the export order is independent of page sort.
- Only `notes` are exported beyond URL/title/category. Tags and clicks are dropped by design.
- Do not add a JSON export or an import counterpart; `/import` already consumes this format.
- If the database is empty, still return a valid empty Netscape file rather than a 404.
- Avoid adding new dependencies; hand-build the HTML string and reuse the existing escaping style from the codebase if one exists.
