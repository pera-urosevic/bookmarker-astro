# Add keyboard navigation to bookmark list [DONE]

## Description

Add a keyboard-driven "cursor" to the bookmark list on `src/pages/index.astro`,
next to the existing search/filter script.

The search input is autofocused on load. While it is focused, typing filters the
list and letter shortcuts must **not** fire. Pressing Up or Down blurs the search
input and starts navigating the visible bookmarks. Once the search is unfocused,
the following shortcuts work globally on the page:

| Key             | Action                                                    |
| --------------- | --------------------------------------------------------- |
| `ArrowUp`       | Select the visible bookmark above the current one         |
| `ArrowDown`     | Select the visible bookmark below the current one         |
| `Enter` / Space | Open the selected bookmark's URL in the current tab       |
| `Shift+Enter` / `Shift+Space` / `Ctrl+Enter` / `Ctrl+Space` | Open it in a new tab |
| `e`             | Open the edit page for the selected bookmark              |
| `a`             | Open the add-bookmark page (`/new`)                        |

Only one bookmark is selected at a time. Selection is shown with a visible
highlight and moves through the **visible** (filtered) items only. When nothing
is selected, `ArrowDown` selects the first visible item and `ArrowUp` selects the
last visible item; from there the cursor moves one item at a time and stops at
the ends (no wrapping). `Enter`, Space, and `e` do nothing when no bookmark is
selected.

## Checklist

- [x] Add `data-id` and `data-url` attributes to each `.bookmark-item` in
      `src/pages/index.astro` (keep `data-search`), so the script can build the
      edit route and open the target URL without parsing the DOM.
- [x] Add a `.bookmark-item.selected` style: an outline using
      `var(--color-primary)` (matching the existing focus style) plus a slightly
      lighter surface so the cursor is obvious without changing layout.
- [x] Extend the inline script with selection state (the selected element or
      `null`) plus helper functions `visibleItems()`, `select(item)`,
      `clearSelection()`, and `move(direction)`.
- [x] Extract the cursor movement rules into `src/lib/navigation.ts` as the pure
      `nextCursor(cursor, direction, count)` function, with unit tests in
      `src/lib/navigation.test.ts`.
- [x] Implement `ArrowUp` / `ArrowDown`: `preventDefault()` to stop page scroll,
      blur the search input, and select the previous/next visible item with the
      "no selection → first/last, no wrapping" behavior described above. Do not
      move when there are no visible items.
- [x] Implement `Enter` and Space: `preventDefault()` (Space would otherwise
      scroll), then `location.assign(url)` for the selected item, or
      `window.open(url, '_blank', 'noopener,noreferrer')` when Shift or Ctrl is
      held. Do nothing without a selection.
- [x] Implement `e` and `a`: navigate to `/<id>` and `/new` respectively with
      `location.assign(...)`. `e` does nothing without a selection. (The `d`
      delete shortcut was removed after review; delete stays mouse/link-only.)
- [x] Guard all shortcuts: ignore key events when the target is an `input`,
      `textarea`, `select`, `button`, `a`, or `contenteditable` element — except
      for `ArrowUp`/`ArrowDown`, which blur the search input and navigate. Ignore
      keystrokes that carry `Alt`, `Meta`, or (for letter shortcuts) `Ctrl`, so
      browser/OS shortcuts still work.
- [x] Keep the cursor consistent with filtering: when the query changes and the
      selected item is hidden, clear the selection (do not silently jump to
      another bookmark); filtering to zero results leaves nothing selected.
- [x] Ensure a single selected item at a time (selecting clears the previous
      `.selected` class) and that the selected item scrolls into view with
      `scrollIntoView({ block: 'nearest' })`.
- [x] Run `node --test src/lib/*.test.ts` (13 tests pass, including the 5 new
      cursor tests) and load the page from the dev server to confirm the markup
      and client script compile and render.

## Notes

- The page is otherwise server-rendered; the keyboard wiring stays in the
  existing inline `<script>` in `index.astro`, following the current tab
  indentation and the `items`/`noResults` variable style. No new dependencies.
- Confirmed with the user: no selection + Down selects the first visible
  bookmark (Up selects the last), no wrapping; letter shortcuts only fire when
  the search input is not focused. The user also chose extracting the cursor
  rules into a unit-tested module over manual-only verification.
- Opening a bookmark from the keyboard intentionally uses the current tab even
  though the mouse click on `.bookmark-title` keeps `target="_blank"`. Do not
  change the anchor markup; override the default only for keyboard activation.
- Space is only captured after `preventDefault()`; do not intercept it while the
  search input, another editable field, a button, or a link has focus.
- Arrow keys are still handled while the search is focused, blurring it first.
  If no bookmark is visible, arrow keys are left alone so the page can scroll.
- A quick manual pass in the browser (typing in search, arrow navigation,
  Enter/Shift+Enter, `e`/`a`) is still recommended — the automated tests
  cover the cursor rules, not real key presses.
- **Update:** focusing the search input (click or keyboard) clears the current
  selection, so the cursor is not left on a bookmark while searching.
