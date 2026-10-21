# Suggest Existing Categories in the Bookmark Forms

## Description

Offer the already-used categories as a styled autocomplete dropdown on the category field of both the add (`/new`) and edit (`/:id`) forms. Each page loads the distinct categories server-side and passes them to a React island that keeps the Astro-rendered `<input name="category">` and shows a dark, form-matching listbox underneath it. The list filters as you type, supports arrow keys/Enter/Escape/Tab, and writes the chosen category into the input. Forms still submit without JavaScript.

Categories are read from PostgreSQL with a new `listCategories()` helper: non-empty values only, de-duplicated, ordered case-insensitively, returned as the original strings.

## Checklist

- [x] Add `listCategories(): Promise<string[]>` to `src/lib/bookmarks.ts`:
  - `SELECT category FROM bookmarks WHERE category <> '' GROUP BY category ORDER BY lower(category), category` (`GROUP BY` instead of `DISTINCT` because Postgres requires `ORDER BY` expressions to appear in the select list of a `DISTINCT` query)
  - Map rows to `string[]` (no `BookmarkRow` mapping needed).
- [x] Add `filterCategories(categories, query)` to `src/lib/categories.ts` with `src/lib/categories.test.ts` (empty/whitespace query returns every category, case-insensitive substring match, trimmed query, no matches returns `[]`).
- [x] Create `src/components/CategorySuggestions.tsx`:
  - Take `categories: string[]` as a prop and render only the listbox (SSR-safe: nothing on the server).
  - Attach to the existing `#category` input with a `useEffect`; add `role="combobox"`, `aria-autocomplete`, `aria-controls`, `aria-expanded`, and `aria-activedescendant`.
  - Open with all categories on focus, filter by the input value on input, close on blur/Escape, highlight with ArrowUp/ArrowDown, and write the category into the input on click/Enter/Tab.
  - Use `onMouseDown` `preventDefault` so clicking an option does not close the list first.
- [x] Create `src/components/CategorySuggestions.css` for the listbox: absolute under the input, same font family/size as form inputs, form surface color, radius, shadow, hover/selected tokens.
- [x] Update `src/pages/new.astro`:
  - Call `const categories = await listCategories()` in the frontmatter.
  - Render `<CategorySuggestions categories={categories} client:load />` after the category input, with `autocomplete="off"` on the input.
  - Add `position: relative` to `.form-group` so the list aligns under the input.
- [x] Update `src/pages/[id].astro` the same way, keeping the prefilled `value={bookmark.category ?? ''}`.
- [x] Remove the native `datalist` markup, `list="category-options"`, and the obsolete `input[list]` picker CSS; keep `color-scheme: dark` in `public/style.css` for other native controls.
- [x] Keep `id`, `name`, `type="text"`, and label markup unchanged, and keep the forms working without JavaScript.
- [x] Run the test suite and the build. Note: `pnpm` itself is broken in this environment (`MODULE_NOT_FOUND` for the pnpm entrypoint), so `node --test src/lib/*.test.ts` and `./node_modules/.bin/astro build` were used instead. Build succeeds; tests: 69 total, 67 pass, 2 fail in `src/lib/suggest.test.ts`, which are pre-existing failures on HEAD (those files are unchanged by this task and expect `notes` while `parseSuggestions` reads `description`).
- [ ] Manually verify in the dev server (`astro dev --background`):
  - `/new` and an existing `/:id` show the styled category list on focus/typing, matching the form input font and width.
  - Arrow keys move the highlight, Enter/Tab/click fill the field, Escape closes the list, and typing filters it.
  - Selecting a suggestion fills the field, and saving persists the value.
  - Categories with no bookmarks (empty string) are absent, and duplicate values appear once.
  - A category entered on one bookmark shows up on both forms afterwards.
  - With JavaScript disabled, the category input still renders and submits.

## Notes

- Category remains a single plain string; do not change storage, search, import, or export.
- Keep the SQL in `src/lib/bookmarks.ts` like the other repository functions. The filter/search behavior lives in a pure helper with tests; `listCategories()` itself is a DB-only query with no unit test.
- Sorting is intentionally case-insensitive with the original value as a tiebreaker, so `Dev` and `dev` would both appear only if they are distinct stored strings; that is acceptable.
- No endpoint is needed; categories are passed as a prop. The component only enhances the Astro-rendered input, so the no-JS form still works.
- The datalist popup was abandoned because it is browser-drawn and cannot match the form font/width or dark theme; the custom listbox uses the existing design tokens.
