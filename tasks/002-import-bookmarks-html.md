# Add Netscape bookmarks.html upload page [DONE]

## Description

Add an `/import` page to the Astro app that accepts a browser-exported
`bookmarks.html` file (Netscape Bookmark File format), parses its bookmarks,
folders, and descriptions, and merges them into `bookmarks.json`.

The existing `scripts/import-bookmarks.mjs` CLI will be removed. Its parsing
and merge logic should be ported into a reusable TypeScript module used by the
new page, not kept as a separate CLI implementation.

Conflict behavior stays exactly as the current CLI implements it:

- Match incoming bookmarks to existing ones by exact `url`.
- New URL: insert with a new UUID v7, current timestamps, title, notes, and
  folder path as tags.
- Existing URL: preserve `id` and `created_at`; fill `title`/`notes` only when
  the stored value is empty; union tags; update `updated_at` only if something
  changed.
- Existing URL with nothing to change: skip.
- Duplicate URLs inside the uploaded file are merged in file order using the
  same rules.

## Checklist

- [x] Create `src/lib/bookmarks-import.ts` exporting at minimum:
  - `parseBookmarks(html)` returning `{ url, title, notes, tags }[]`.
  - A merge function that takes parsed incoming bookmarks and the current
    `Bookmark[]` and returns
    `{ bookmarks, imported, updated, skipped }`.
- [x] Port the parser and merge rules from `scripts/import-bookmarks.mjs`
      into the new module, including folder-path tags and `<DD>` notes.
- [x] Add a "Import" button link to the homepage navigation on
      `src/pages/index.astro`, alongside the existing "Add Bookmark" button and
      using the same `class="button"` styling.
- [x] Add `src/pages/import.astro` with:
  - `GET` rendering a form with a required file input
    (`accept=".html,.htm,text/html"`) submitting via `POST`.
  - `POST` reading the upload with `Astro.request.formData()`, validating that
    a file is present, non-empty, and within a reasonable size limit.
  - Rejecting files with no bookmark anchors (wrong format) with a visible
    error instead of writing `bookmarks.json`.
  - Merging via the shared module, writing `bookmarks.json` with the same
    formatting as the rest of the app (`JSON.stringify(..., null, '\t') + '\n'`).
  - Redirect-after-POST to `/import?imported=N&updated=M&skipped=K`, with the
    page rendering those counts (and any error message) after the redirect.
- [x] Add a "Back to List" link on the import page, matching the existing
      markup/style used by `new.astro` and the delete pages.
- [x] Move `node-html-parser` from `devDependencies` to `dependencies`, since it
      is now used at server runtime.
- [x] Remove `scripts/import-bookmarks.mjs` and the `import` script from
      `package.json`. Move `scripts/fixtures/sample.html` to a remaining
      fixtures location (e.g. `fixtures/sample-bookmarks.html`) if the
      `scripts/` directory becomes empty.
- [x] Manually verify with the sample fixture: a first upload adds the missing
      bookmarks, a second identical upload skips all of them, and a file with
      new notes/tags patches only blank fields and unions tags.
- [x] Verify an empty or non-bookmark HTML upload shows an error and leaves
      `bookmarks.json` untouched.

## Notes

- No authentication exists, so the import endpoint is equally open; that is
  consistent with the project's stated out-of-scope items.
- Parse only; never render the uploaded HTML back to the page.
- The importer module lives under `src/lib/` as TypeScript because it is only
  consumed by the Astro page after the CLI is removed.
- Folder path segments become tags in top-down order (e.g. `Bookmarks Bar`,
  `Dev`), and `<DD>` text becomes `notes`.
