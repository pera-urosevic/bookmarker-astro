# Toggle sort order [DONE]

## Description

The bookmark list on `/` is server-rendered newest-edited first (task 007), with
no user-facing sort control. Add a toggle link that flips the displayed order to
oldest-edited first and back again.

The order lives in the URL as `?sort=newest` or `?sort=oldest`, so it survives
reloads and can be bookmarked or shared. The server renders the requested order;
the toggle is a plain `<a>` pointing at the opposite URL, so it works without
JavaScript. A missing or unknown `sort` value falls back to newest-first.

## Checklist

- [x] In `src/lib/sort.ts`, add `type SortOrder = 'newest' | 'oldest'` and a pure
      `parseSortOrder(value)` helper that returns `'oldest'` only for `'oldest'`
      and `'newest'` for missing/unknown values.
- [x] Extend `sortByLastEdited` with an optional `order: SortOrder = 'newest'`
      argument, keeping the default behavior from task 007, and remove the
      now-unused `reverseOrder` helper.
- [x] Extend `src/lib/sort.test.ts` to cover oldest-first sorting, equal
      timestamps keeping their input order, parsing valid values, defaulting
      missing/unknown values to `newest`, and non-mutation of the input.
- [x] In `src/pages/index.astro`, read `sort` from `Astro.url.searchParams`,
      parse it with `parseSortOrder`, and sort the bookmarks before rendering.
- [x] Render `<a id="sort-toggle" class="button ghost"
      href={/?sort=<opposite>}>` in the header `nav` (next to Import / Add
      Bookmark) when there are 2 or more bookmarks. The label names the target
      order (`Oldest first` while newest-first is shown, and vice versa).
- [x] Remove the client-side reverse handler and the `reverseOrder` import; the
      search filter and keyboard navigation keep working on the server-rendered
      DOM order unchanged.
- [x] Run `node --test src/lib/*.test.ts` and confirm all tests pass.
- [x] Manually verify on the dev server: `/` is newest-first, `/?sort=oldest`
      is oldest-first, unknown values fall back to newest-first, the toggle link
      points at the opposite order, and search filtering plus arrow-key
      navigation still follow the rendered order.

## Notes

- The URL is the source of truth for the order; do not add `localStorage`,
  cookies, or client-side reordering.
- Since the toggle is a link, it has no `aria-pressed`; its text describes the
  action and its `href` is the accessible state change.
- Do not change `bookmarks.json`, the API endpoints, or form behavior; this task
  only affects display order on the list page.
- The toggle is an `<a>`, so the existing `isControl` guard (which includes `A`)
  already prevents list shortcuts from firing while it has focus.
- Follow the existing `src/lib/*.ts` + `*.test.ts` pattern run via `node --test`.
