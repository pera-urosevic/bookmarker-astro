# Rewrite Client-side Scripts as React Islands

## Description

Convert the four page scripts that currently run as inline Astro `<script>` blocks into React components hydrated as islands. Astro keeps rendering layouts, headers, forms, wallpaper selection, and server-side POST handling; React owns only the interactive UI.

Pages and their behavior to preserve:

1. **`/` (`src/pages/index.astro`)** — server-side bookmark search UI: fetch `GET /api/bookmarks` on mount and on Enter, restore the query from `?q=` (falling back to `localStorage` key `bookmarker:search`), sync the URL with `replaceState`, abort in-flight requests, render the bookmark list/count/empty/no-results/error states, and keep Arrow/Enter/E/A keyboard navigation plus Shift/Ctrl new-tab opening.
2. **`/home` (`src/pages/home.astro`)** — launcher filter: filter the server-provided, click-sorted bookmarks with `matchesQuery`, keep results hidden until typing, auto-select the first match, handle Arrow/Enter/Escape, increment clicks via `POST /api/clicks` on plain left-click or Enter, and fall back to a Google search when nothing is selected/matching. The wallpaper and `.home` wrapper stay in Astro.
3. **`/new` and `/:id`** — the duplicated "AI" button: validate the URL field, POST to `/api/suggest`, apply suggestions with `applySuggestions`, and show the existing status/disabled/"Thinking…" states via one shared component.

This is a behavior-preserving refactor: do not add debounced search, new API endpoints, or convert the create/update/delete/import forms to client-side submissions.

## Checklist

- [x] Create `src/components/BookmarkSearch.tsx` with the current `/` header, search input, count, error, empty/no-results states, and bookmark list. Port the existing script logic into React state/effects/refs. Keep the `X of Y` count via `formatVisibleCount` and cursor movement via `nextCursor`.
- [x] Create `src/components/BookmarkSearch.css` and move the page's bookmark/search styles out of `index.astro` into it; import it from the component.
- [x] Create `src/components/HomeLauncher.tsx` taking `bookmarks: Bookmark[]` as a prop (already sorted with `sortByClicks` by Astro). Port the filter, selection, keyboard, click-increment, and Google-fallback logic. Use `matchesQuery` and `bookmarkSearchText`.
- [x] Create `src/components/HomeLauncher.css` and move the launcher/results/selected styles there; keep `.home`, `.background`, and the `:global(body)` rule in `home.astro`.
- [x] Create `src/components/SuggestionButton.tsx` reading the fields `#url`, `#title`, `#tags`, and `#notes` from its owning form at click time. Implement the same validation, loading state, `/api/suggest` request, `applySuggestions` behavior, and error messages.
- [x] Create `src/components/SuggestionButton.css` for `#ai-status` (or keep that rule in the page with `:global`), since the status element is now rendered by React.
- [x] Rewrite `src/pages/index.astro` to render only `Layout` plus `<BookmarkSearch client:load />`; remove its `<script>` and page-specific `<style>` blocks.
- [x] Rewrite `src/pages/home.astro` to keep the frontmatter (bookmarks, wallpaper, optimized background) and render `<HomeLauncher bookmarks={bookmarks} client:load />` inside the `.home` wrapper; remove its `<script>` and island styles.
- [x] Update `src/pages/new.astro` to render `<SuggestionButton client:load />` in place of the AI button/status markup; remove its `<script>` and keep the server-side POST handler and form markup.
- [x] Update `src/pages/[id].astro` the same way; remove its `<script>` and keep the POST handler, prefilled values, and clicks field.
- [x] Verify no page still uses an inline `<script>` (`rg '<script' src/pages` returns nothing).
- [x] Ensure React components are SSR-safe: no `window`, `document`, or `localStorage` access during render; all DOM access is inside `useEffect` or event handlers; no hydration mismatches (initial server and client markup match).
- [x] Update the `PLAN.md` Project Structure/Frontend sections to describe the React islands under `src/components` and the remaining Astro-owned forms/layout.
- [x] Run `pnpm test` and `pnpm build` (66 tests pass, build succeeds).
- [ ] Manually verify in the dev server (`astro dev --background`):
  - `/` loads results, restores `?q=`/localStorage, Enter searches, SQL mode errors appear inline, count/pagination text updates, keyboard navigation and Edit/Delete links work.
  - `/home` filters as you type, auto-selects the first match, arrows/Escape/Enter work, plain clicks and Enter increment clicks, and the Google fallback still runs.
  - The AI button works on both `/new` and `/:id`, including the empty-URL message, loading state, and failure message.

## Notes

- **Islands only:** do not convert layouts, static pages (`/import`, `/delete/:id`), or the bookmark forms to React. Forms keep their Astro POST handlers and no-JS fallback.
- **Hydration:** use `client:load` for all three components. `/` must fetch immediately, `/home` must autofocus and filter immediately, and the AI button must be interactive without a click delay.
- **Styles:** Astro scoped styles do not reliably reach elements rendered inside React components. Move the interactive islands' rules into CSS files imported by each component; keep non-interactive page styles in the `.astro` pages. Preserve every existing class name so the visual result is unchanged. Base rules in `public/style.css` live in `@layer base`, so component CSS wins over element/attribute selectors such as `input[type='search']`.
- **Current `/` behavior:** the checked-in script searches on mount and on Enter only (despite `PLAN.md` mentioning debounce). Preserve that behavior; do not add an input-driven debounce in this task.
- **Types/imports:** import `Bookmark` from `../types`; keep `.ts` extensions where existing modules use them (`apply-suggestions.ts`). Follow project style: tabs, no semicolons, single quotes, `*.tsx` for components.
- **Click tracking:** stay fire-and-forget with `keepalive` and silent failures.
- **Accessibility:** keep `aria-label`, `aria-live`, `aria-current`, `role="status"`, and `role="alert"` attributes and the existing focus behavior.
