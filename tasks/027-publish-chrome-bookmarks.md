# Publish Bookmarks to Google Chrome [DONE]

## Description

Add a server-side publish action that writes the PostgreSQL bookmarks into the Google Chrome `Bookmarks` JSON file configured by `CHROME_BOOKMARKS_PATH`. The action must terminate all running Chrome/Chromium instances before touching the file, back up the existing Chrome bookmark file, replace the Chrome **bookmark bar** with the app's bookmarks organized using the same category-folder rules as `/export`, and restart Chrome after publishing. Other Chrome roots (`other` and `synced`) are preserved unchanged. Notes, tags, and clicks are not representable in Chrome's bookmark schema and are dropped.

Implement a pure serialization module plus a stateful API route:

- `src/lib/bookmarks-chrome.ts`
- `src/pages/api/publish.ts`
- `src/components/PublishButton.tsx`
- Update `src/components/BookmarkSearch.tsx`, `PLAN.md`, and (if needed) the test count.

## Serializer (`src/lib/bookmarks-chrome.ts`)

Export `bookmarksToChrome(existing: unknown, bookmarks: Bookmark[], now = new Date()): ChromeBookmarksFile`, where:

- Preserve the existing file's `version` (default `1`), `sync_metadata` string as-is (if present), `other` and `synced` roots exactly (including their children, IDs, GUIDs, dates, and meta info).
- Preserve the `bookmark_bar` root node's permanent metadata (`id` `1`, canonical bookmark-bar GUID `00000000-0000-4000-a000-000000000002`, name `Bookmarks bar`) and refresh `date_modified` to `now`.
- Replace only `bookmark_bar.children` with the app bookmarks:
  - Build the same folder tree as `bookmarksToHtml` from each bookmark's `category` (split on `/`, drop empty segments).
  - At each level emit bookmarks first, then subfolders. Sort bookmarks by title (case-insensitive) then URL; sort folders alphabetically.
  - A bookmark with an empty category lands directly in the current folder.
  - Do not emit a synthetic "Bookmarks Bar" or "Bookmarks Bar/..." container.
- Each Chrome bookmark node has:
  - `id`: a unique numeric string allocated starting at one greater than the highest existing ID anywhere in the file (or `1000` when no file exists).
  - `guid`: a fresh RFC 4122 UUID v4 for every app-created node; permanent root GUIDs remain unchanged.
  - `type`: `url`
  - `name`: title, or the URL when the title is empty
  - `url`
  - `date_added`, `date_last_used`: Chrome microsecond timestamps (Windows epoch) derived from `created_at` and `0`, respectively.
- Each Chrome folder node has:
  - `id`, `guid`, `type: folder`, `name`
  - `date_added`, `date_modified`, `date_last_used` (Windows-epoch microseconds; folder `date_modified` should be `now` or the newest child's modification time, consistently), and `children`.
- Drop `notes`, `tags`, and `clicks`.
- Compute `checksum` exactly as Chromium's `BookmarkCodec`: initialize an MD5 over the permanent roots in order `bookmark_bar`, `other`, `synced`; for folders update with the ASCII bytes of `id`, the UTF-16 bytes of the title, and the literal `folder`; for URLs update with `id`, title, `url`, then the URL string. Keys/children are traversed in the order the serializer writes them. Also write any additional checksum field already accepted by the target file's version; do not write `checksum_sha256` unless the input file already had one.
- If no valid existing file is supplied, create the three permanent roots with IDs `1`, `2`, `3`, canonical GUIDs, empty children, and `sync_metadata` omitted.

## Route (`src/pages/api/publish.ts`)

Implement a `POST` handler that:

1. Reads `CHROME_BOOKMARKS_PATH` from `import.meta.env`; return `400 { error: 'CHROME_BOOKMARKS_PATH is not configured' }` when missing.
3. Backs up the existing bookmark file, when present, to `Bookmarks.bak` in the same directory, overwriting any previous backup.
4. Reads and parses the existing file if present (ignore parse errors and substitute a fresh root structure).
5. Calls `listBookmarks()`, serializes with `bookmarksToChrome`, and atomically writes the result (temp file plus rename) into `CHROME_BOOKMARKS_PATH` with three-space indentation and a trailing newline.
7. Returns `200 { ok: true, path, backup, count, chromeStarted }` (with `chromeStarted` set to `false` because no process management is performed); returns `500 { error }` when the file cannot be written or the Chrome bookmark data cannot be collected.

## UI (`src/components/PublishButton.tsx` and `BookmarkSearch.tsx`)

- Add a "Publish to Chrome" button in the header navigation next to Export. It should POST to `/api/publish`, show pending state (`Publishing…`, disabled, `aria-busy`), and report success/failure in an `aria-live` status element.
- Because Chrome is closed by the server during the request, the button should not assume the response always arrives in the originating browser; keep the status text and avoid blocking the page.
- Style the button consistently with existing buttons; reuse existing CSS patterns or create a small `PublishButton.css`.

## Tests (`src/lib/bookmarks-chrome.test.ts`)

- Chrome timestamp conversion from ISO `created_at`.
- Empty/duplicate-slash categories.
- Deterministic ordering: bookmarks before folders, case-insensitive title and alphabetical folder ordering.
- Preserves `other` and `synced` roots, including their IDs and children.
- Allocates new IDs starting after the highest existing ID.
- Fresh GUIDs are valid UUID v4 strings; permanent root GUIDs remain canonical.
- Computes a checksum that matches Chromium's codec for a small known fixture (single bookmark on the bookmark bar, plus empty roots).
- Records with empty titles fall back to the URL.
- Writes no notes/tags/clicks.

## Validation

- Run `node --test src/lib/*.test.ts`.
- Run `./node_modules/.bin/astro build`.
- Start `astro dev --background`, then POST `/api/publish` from a separate client (not the Chrome instance being killed), verify the written file parses in Chrome and that Chrome reopens. Stop the dev server afterward.
- Update `PLAN.md` (Routes/Pages, Frontend, Conventions and Helpers) and the passing test count.

## Notes

- `CHROME_BOOKMARKS_PATH` is a client-side browser profile file; write with the server's filesystem permissions and only after Chrome is closed.
- The UI button is labeled "Publish" and shows the current status as its label.
- Before writing, the route runs the `CHROME_PROCESS` shell command and waits up to 5 minutes for it to stop reporting Chrome as running.
- After writing, the route shows a system notification with `notify-send` (best effort).
- The UI calls `window.confirm('Please restart the browser')` before publishing.
- Atomic rename reduces the risk of corrupting the profile.
- Modern Chrome may also store `checksum_sha256`; this task only maintains the legacy MD5 checksum that all supported Chrome versions accept.
- Match Chrome's three-space indentation when serializing the JSON.
- Follow project style: tabs, no semicolons, single quotes, `.ts` extensions, and existing API route patterns.
