# Add /home launcher page [DONE]

## Description

Create a new launcher-style page at `/home` (`src/pages/home.astro`) that is
optimized for quickly finding and opening a bookmark. It is a separate page from
the existing `/` list and is reached directly by URL; no other page links to it.

The page has a full-viewport random photo background from
`https://picsum.photos/1600/900` (cover, centered), a large autofocused search
box, and a results list that stays hidden until the user types. Filtering reuses
the existing search semantics from `src/lib/filter.ts` (case-insensitive match
against title, URL, notes, and tags) and the cursor rules from
`src/lib/navigation.ts`.

Results show only the bookmark title (falling back to the URL when untitled).
The first visible result is selected automatically after each filter pass, so
pressing Enter immediately opens it. Up/Down move the cursor through the visible
results and Enter opens the selected bookmark in the current tab.

## Checklist

- [x] Create `src/pages/home.astro` with `<Layout title="Home">`, reading
      `bookmarks.json` the same way as `src/pages/index.astro` (resolve from
      `process.cwd()`, parse, fall back to an empty array on missing/invalid
      data). Render bookmarks in the same newest-first order as `/` using
      `sortByLastEdited(bookmarks, 'newest')`.
- [x] Add a fixed, full-viewport background layer (or an equivalent
      `min-height: 100dvh` wrapper) using
      `url('https://picsum.photos/1600/900')` with `background-size: cover`,
      `background-position: center`, and `background-repeat: no-repeat`. Add a
      dark translucent/gradient overlay so the search box and results stay
      legible over arbitrary photos. Fall back to `var(--color-background)`
      while the image loads or if it fails. Reset the page's body padding for
      this route (for example with `:global(body)`), since the global stylesheet
      adds `2rem` around every page.
- [x] Render a centered search input (`type="search"`, `autofocus`,
      `autocomplete="off"`) with `aria-label="Search bookmarks"` and a
      placeholder. Keep it the only focusable control on load.
- [x] Server-render every bookmark as a `<li class="result">` containing an
      `<a href={url}>` whose text is the title or, when empty, the URL. Put
      `data-url`, `data-id`, and `data-search={bookmarkSearchText(bookmark)}` on
      the `<li>` for the script. The links open in the current tab (no
      `target="_blank"`), so mouse clicks work without JavaScript.
- [x] Mark the results container `hidden` in the server-rendered markup so
      nothing but the background and search box shows before the user types,
      and so there is no flash of all bookmarks before the script runs.
- [x] Add page-scoped styles: results as a compact translucent panel
      (rounded corners, background blur is optional), one-line titles with
      ellipsis overflow, comfortable row padding, and a clear selected state
      using `var(--color-primary)` (background tint plus outline/left border)
      that does not shift layout. Keep the layout usable on narrow screens and
      cap the search/results column at a readable width (around 40rem).
- [x] In the page's client script, import `matchesQuery` and
      `bookmarkSearchText`-produced data from the server render, plus
      `nextCursor`, and implement:
      - query empty (after trimming): hide the results container and clear the
        selection;
      - query non-empty: filter items, reveal the container, and if no item
        matches show a short "No bookmarks match your search." message;
      - after every filter pass with at least one visible result, select the
        first visible result automatically; clear the selection when nothing
        matches.
- [x] Implement keyboard handling on `document`:
      - `ArrowDown` / `ArrowUp`: `preventDefault()`, keep focus in the search
        input (no need to blur), and move the cursor through visible results
        with `nextCursor` — no wrapping, and stop at the ends;
      - `Enter`: `preventDefault()` and `window.location.assign(selected
        bookmark's data-url)` when a result is selected. This must work while
        the search input is focused, since the user types and then presses
        Enter;
      - ignore keys carrying `Alt`, `Meta`, or `Ctrl`, and ignore events whose
        target is a button, `textarea`, `select`, contenteditable element, or a
        result link (those keep native behavior);
      - do nothing when no result is selected.
- [x] Add a minimal accessible empty state: the results list has an
      `aria-label="Matching bookmarks"`, the selected item gets
      `aria-current="true"` (removed when deselected), and the no-matches
      message is announced with `role="status"`/`aria-live="polite"`.
- [x] Do not add links to `/home` from `/`, do not change `bookmarks.json`, the
      API endpoints, or any existing page behavior.
- [x] Run `node --test src/lib/*.test.ts` and confirm all existing tests still
      pass; no new `src/lib` module is expected because the filter and cursor
      logic are reused.
- [x] Run `npx astro check` and/or `npx astro build` to confirm the new page
      compiles and that the static `/home` route takes precedence over the
      dynamic `/[id]` route (`/home` must render the launcher, not redirect to
      `/`).
- [x] Browser interaction testing was skipped at the user's request. Automated
      checks confirmed `/home` returns 200 and renders the background URL,
      search box, results list, and no-results message; `/[id]` still redirects
      unknown IDs; and the compiled client module includes the filter, cursor,
      auto-select, and Enter-to-open handlers.

## Notes

- Decisions confirmed with the user: show nothing until typing, display titles
  only, auto-select the first result, and expose the page by route only (no
  navigation links elsewhere).
- Reuse `src/lib/filter.ts` and `src/lib/navigation.ts` rather than duplicating
  matching or cursor logic. No new dependencies and no changes to the existing
  index page script.
- Search matches the same fields as `/` (title, URL, notes, tags), even though
  only the title is displayed.
- Do not sync the query to the URL or `localStorage`; unlike `/`, this page is
  intended as a transient launcher, so a reload starts clean with the search box
  focused.
- Loading the background from picsum requires network access. The URL is used
  exactly as provided; do not add cache-busting parameters unless the photo not
  changing across reloads turns out to be a problem.
- The no-matches message is a small addition beyond the request, included so a
  non-matching query does not leave a blank screen.
