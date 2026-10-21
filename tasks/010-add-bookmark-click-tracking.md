# Track bookmark clicks and rank /home by popularity [DONE]

## Description

Add a persistent `clicks` counter to every bookmark and use it to rank the
launcher page. `/home` must increment the counter when the user opens a
bookmark, and results must be ordered with the most-clicked bookmarks first.
Existing entries are backfilled with `clicks: 0`, so the field is always a
number after this task. The counter is also editable from the bookmark edit
page, so a count can be corrected or reset manually, and it is shown on `/` as a
badge next to each bookmark title.

Because `/home` runs in the browser and `bookmarks.json` is server-only, the
increment needs a small JSON API endpoint. Ordering is clicks descending with
the existing newest-edited-first order as the tie-breaker, so two bookmarks with
the same click count still behave predictably.

## Checklist

- [x] Add `clicks: number` to the `Bookmark` interface in `src/types.ts`.
- [x] Backfill `bookmarks.json`: add `"clicks": 0` to every entry that does not
      already have the field, preserving entry order, tab indentation, and the
      trailing newline. Do not change any other values.
- [x] Initialize the counter for newly created data:
      - `src/pages/new.astro`: the new bookmark gets `clicks: 0`;
      - `src/lib/bookmarks-import.ts`: newly imported bookmarks get `clicks: 0`
        (existing bookmarks keep their current count when merged);
      - update the `Bookmark` factories in `src/lib/sort.test.ts` and
        `src/lib/bookmarks-import.test.ts` so type checking stays green.
- [x] Make `clicks` editable in `src/pages/[id].astro`:
      - add a numeric form field (`type="number"`, `name="clicks"`,
        `min="0"`, `step="1"`) labeled "Clicks", prefilled with
        `bookmark.clicks ?? 0`, placed with the other form fields;
      - on `POST`, parse the submitted value as a non-negative integer; when
        the value is missing or invalid, keep the bookmark's existing count
        instead of resetting it;
      - save the new count in the same write as the other edited fields
        (leaving `updated_at` behavior unchanged for form edits).
- [x] Show the count on `/` (`src/pages/index.astro`) as a badge next to each
      bookmark title:
      - group the title link and badge in a flex wrapper so they stay together
        on the left while the Edit/Delete actions remain on the right;
      - always render the badge, including `0`, using
        `bookmark.clicks ?? 0` as the visible text;
      - give it an accessible label (`"1 click"` / `"N clicks"`) and a matching
        `title` so the bare number is understandable;
      - style it as a small pill consistent with the existing `.tag` styling
        (compact padding, rounded corners, muted background, tabular numbers),
        without changing the `/` sorting or card layout beyond the added badge.
- [x] Add `sortByClicks(bookmarks: Bookmark[]): Bookmark[]` to
      `src/lib/sort.ts`:
      - treat a missing/invalid `clicks` as `0`;
      - sort by `clicks` descending;
      - when counts are equal, sort by `updated_at` descending (same behavior
        as `sortByLastEdited(bookmarks, 'newest')`);
      - return a copy and do not mutate the input.
- [x] Add unit tests in `src/lib/sort.test.ts` covering:
      - higher click counts come first regardless of `updated_at`;
      - equal counts fall back to newest-edited first;
      - missing `clicks` behaves like `0`;
      - the input array is not mutated.
- [x] Create `src/pages/api/clicks.ts` with a `POST` route:
      - parse JSON body `{ id: string }`; reject missing/non-string IDs with
        `400`;
      - read `bookmarks.json` from `process.cwd()` (missing file -> empty list),
        find the bookmark by `id`, and return `404` when it does not exist;
      - increment `clicks` by one, treating a missing/invalid value as `0`;
      - write the list back with `JSON.stringify(bookmarks, null, '\t') + '\n'`;
      - return `200` with the updated count (for example `{ id, clicks }`);
      - return `405` for other HTTP methods.
- [x] In `src/pages/home.astro`, replace `sortByLastEdited(bookmarks, 'newest')`
      with `sortByClicks(bookmarks)` for the server-rendered result list.
- [x] In the `/home` client script, add a fire-and-forget increment helper:

      ```ts
      const increment = (id: string) => {
      	void fetch('/api/clicks', {
      		method: 'POST',
      		headers: { 'content-type': 'application/json' },
      		body: JSON.stringify({ id }),
      		keepalive: true,
      	}).catch(() => {})
      }
      ```

      It must never delay or block navigation, and failures stay silent.
- [x] Wire up both selected interactions:
      - `Enter` on the selected result: call `increment(selected.dataset.id)`
        immediately before `window.location.assign(url)`;
      - plain left mouse click on a result link: use event delegation on the
        list, resolve the parent `.result`'s `data-id`, and increment as well.
        Ignore clicks with modifier keys (`alt`/`ctrl`/`meta`/`shift`),
        non-primary buttons, and items without an ID.
- [x] Ensure the increment does not modify `updated_at`; otherwise the
      tie-breaker ordering and the `/` list would change just from opening a
      bookmark.
- [x] Leave the `/` list ordering and the delete/import flows unchanged apart
      from the required `clicks` initialization; the only intended UI changes
      are the click badge on `/`, the new edit field, and the `/home` behavior
      above.
- [x] Run `node --test src/lib/*.test.ts` and confirm all tests pass.
- [x] Run `npx astro check` and `npx astro build` and confirm they succeed.
- [x] Verify with the dev server:
      - `/home` initially shows backfilled entries with zero clicks in
        newest-edited order;
      - opening a bookmark with Enter and with a plain mouse click increments
        its `clicks` in `bookmarks.json` exactly once per action;
      - after reloading `/home`, the clicked bookmark appears above bookmarks
        with fewer clicks, and equal counts fall back to newest-edited first;
      - editing a bookmark's Clicks field persists the new number and rejects
        negative, fractional, or blank input without losing the stored count;
      - `/` shows a badge next to every title (including `0`) whose value
        updates after clicking through `/home` and whose accessible label reads
        correctly for one and many clicks.

## Notes

- Decisions confirmed with the user: clicks descending then newest-edited as
  tie-breaker; both Enter and plain mouse click count; increment via
  `fetch(..., { keepalive: true })` then navigate; backfill existing entries.
- Middle-click and modifier-click opens are intentionally not tracked, and
  typing a URL directly into the search box does not increment anything.
- `updated_at` must stay untouched on increment. Only the automatic `/home`
  increment leaves `updated_at` alone; saving the edit form keeps its existing
  behavior of refreshing `updated_at`, including when only clicks changed.
- The create form does not expose `clicks`; new bookmarks still start at `0`.
  The manual override lives only on the edit page as requested.
- The API uses a read-modify-write of the JSON file. This app is single-user and
  local, so no locking or atomic-write mechanism is required.
- The backfill is a one-time data change; do not add permanent migration code or
  rewrite `bookmarks.json` on every read.
- `clicks` is used for `/home` ordering and shown as a badge on `/`. Do not
  change the `/` page sorting unless requested later.
- Display decisions confirmed with the user: always show the badge (including
  `0`), place it next to the title, and render just the number with an
  accessible label.
- `npx astro check` prompted to install `@astrojs/check` and `typescript`; no
  dependency was added. Verification used `npx astro build`, which completed
  successfully.
- The `/home` interaction wiring was checked in the compiled client module
  (keepalive increment, delegated click handler, and Enter path) and through
  direct HTTP calls to `/api/clicks` and the edit-form POST. A real browser
  interaction test was not run.
- Temporary test increments were reverted from a backup, so `bookmarks.json`
  remains backfilled with `clicks: 0` after verification.
