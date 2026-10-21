# Sort bookmarks by last edited [DONE]

## Description

The bookmark list on `src/pages/index.astro` currently renders bookmarks in the
order they appear in `bookmarks.json`. Change it so the list is always rendered
newest-edited first, based on each bookmark's `updated_at` timestamp. Newest
edits appear at the top; there is no user-facing sort control.

Sorting is server-side only, at render time. The existing client-side search
filter and keyboard navigation must continue to operate on the already-sorted
DOM order, so no client-side reordering is needed.

## Checklist

- [x] Add `src/lib/sort.ts` exporting a pure helper, e.g.
      `sortByLastEdited(bookmarks: Bookmark[]): Bookmark[]`, which returns a
      **new** array sorted by `updated_at` descending. Ties keep their original
      relative order (stable), and the input array must not be mutated.
- [x] Add `src/lib/sort.test.ts` covering: newest first for distinct timestamps,
      equal timestamps preserving input order, a single bookmark, an empty
      array, and that the input array is not mutated.
- [x] In `src/pages/index.astro`, apply `sortByLastEdited(bookmarks)` to the
      loaded bookmarks before rendering the list (keeping the empty/parse-error
      behavior unchanged).
- [x] Run `node --test src/lib/*.test.ts` and confirm the new tests pass.
- [x] Manually verify on the dev server: edit an existing bookmark, return to
      `/`, and confirm it appears at the top; confirm search filtering and
      keyboard navigation still work on the sorted list.

## Notes

- `updated_at` is an ISO 8601 timestamp for every bookmark in `bookmarks.json`,
  so comparisons can use `Date.parse` (or lexicographic order) directly.
- Do not change the data file, the API endpoints, or form behavior; this task
  only affects display order on the list page.
- Do not add a sort selector or toggle — a fixed newest-first order was chosen.
- Existing tasks established `src/lib/*.ts` helpers paired with
  `*.test.ts` files run via `node --test`; follow that pattern.
