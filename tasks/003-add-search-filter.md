# Add search/filter to bookmark list [DONE]

## Description

Add a search/filter text input to the bookmark list on `src/pages/index.astro`.

The input sits in the page header between the `<h1>Bookmarks</h1>` title and the
buttons on the right (`Import`, `Add Bookmark`), and is automatically focused
when the page loads.

Filtering happens client-side, instantly as the user types. Matching is a
case-insensitive substring match against each bookmark's `title`, `url`,
`notes`, and tags. No server request or page reload is involved.

## Checklist

- [x] Add an `<input type="search">` in the `header` of `src/pages/index.astro`,
      placed after `<h1>` and before `<nav>`, with an accessible label
      (e.g. `aria-label="Search bookmarks"`) and a placeholder.
- [x] Give the input `autofocus` so it receives focus on page load.
- [x] Adjust the header CSS so title, input, and buttons lay out as
      title — input (flexible width) — buttons on the right, and wrap
      sensibly on narrow screens.
- [x] Expose each bookmark item's searchable text to the script (e.g. a
      `data-search` attribute containing lowercased title, url, notes, and
      tags).
- [x] Add a small inline script that filters `.bookmark-item` elements on
      `input`, toggling visibility based on a case-insensitive substring match.
- [x] Show a "No bookmarks match your search" message when the query is
      non-empty and every item is hidden, and hide it otherwise.
- [x] Keep the existing "No bookmarks yet." state for an empty list.
- [x] Verify: typing filters the list live, clearing restores all items,
      the input is focused on load, and the layout behaves on narrow screens.

## Notes

- The page is otherwise server-rendered; this is the only JavaScript needed.
- Filtering all fields (title, URL, notes, tags) was confirmed by the user, as
  was the client-side approach.
- Do not change bookmark ordering; filtering only hides/shows existing items.
- Preserve the existing classes and styling conventions (`button`, etc.).
