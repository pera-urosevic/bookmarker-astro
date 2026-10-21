# Add a "Fetch" Button Next to the URL Field

## Description

Add a small **Fetch** button next to the URL input on both the add (`/new`) and
edit (`/:id`) forms. Clicking it takes the URL currently entered in the URL
field, requests that page over HTTP GET, and fills two fields from the response:

- the page's `<title>` into the **Title** input;
- the page's meta description into the **Notes** textarea.

When a value is found it always replaces the current field value, even if the
user has already typed something. When the page has no title or no description,
the corresponding field is left unchanged. The description is taken from
`og:description` first, then `<meta name="description">`, then
`twitter:description`.

The request must be server-side: browsers block cross-origin page fetches, so a
new Astro API route performs the GET and parses the HTML with the existing
`node-html-parser` dependency. The button follows the project's React island
pattern (like `SuggestionButton`) and the form still works without JavaScript.

## Checklist

- [x] Add `src/lib/fetch-title.ts`:
  - `extractTitle(html: string): string` — parse with `node-html-parser`, take the
    first `<title>` element, return its decoded text with runs of whitespace
    collapsed and the ends trimmed. Return `''` when there is no `<title>` or it
    is empty.
  - `fetchPageTitle(url: string): Promise<string>` — validate that the URL uses
    `http:` or `https:`, `fetch` it with redirects followed, a browser-like
    `user-agent`, and a 5-second `AbortSignal.timeout`, then read the body and
    pass it to `extractTitle`. Throw when the response is not OK or the body is
    unreasonably large. No retries.
- [x] Add `src/lib/fetch-title.test.ts` covering `extractTitle`: plain title,
      HTML entities (`&amp;`, `&quot;`, `&#39;`), surrounding and repeated
      whitespace/newlines, missing `<title>`, empty `<title>`, and multiple
      `<title>` tags (first one wins). Add a case with no `<head>`.
- [x] Extend `src/lib/fetch-title.ts` for descriptions:
  - Add `extractDescription(html: string): string` that returns decoded,
    whitespace-collapsed, trimmed content from the first non-empty matching meta
    tag, in this order:
    1. `og:description` (`property` or `name`);
    2. `description` (`name`);
    3. `twitter:description` (`name` or `property`).
    Match tag names/attribute values case-insensitively and return `''` when no
    description is present.
  - Rename `fetchPageTitle` to `fetchPageMetadata` and return
    `Promise<{ title: string; description: string }>`. Keep the existing URL
    validation, redirect, user-agent, 5-second timeout, and size checks; parse
    the HTML once for both values.
- [x] Extend `src/lib/fetch-title.test.ts` for `extractDescription`: `og:description`
      wins over the regular description, regular `meta[name="description"]` is
      used when there is no OG tag, Twitter is the final fallback, an empty OG
      value falls through to the next tag, case-insensitive attribute matching,
      entity decoding and whitespace collapsing, and missing/empty descriptions
      return `''`. Keep the existing title and non-http(s) URL tests.
- [x] Add `src/pages/api/title.ts`:
  - `GET` reads the `url` search parameter.
  - Returns `400 { error: 'A valid http(s) url is required' }` when it is
    missing, does not parse, or is not `http:`/`https:`.
  - Calls `fetchPageTitle` and returns `200 { title }`.
  - Returns `502 { error: 'Could not fetch title' }` on network/parse failure
    after logging the error server-side.
  - Add the usual `ALL` handler returning `405` JSON, matching `api/suggest.ts`.
- [x] Update `src/pages/api/title.ts`:
  - Call `fetchPageMetadata` and return `200 { title, description }`.
  - Remove the `422 No title found` branch; empty strings are valid payloads so
    the client can fill whichever field exists.
  - Keep the `400` and `502` responses and the `ALL` handler unchanged.
- [x] Create `src/components/FetchTitleButton.tsx`:
  - Read `#url` and `#title` from the owning form at click time; do nothing if
    they are absent.
  - If the URL is blank, show `Enter a URL first` and do not fetch.
  - Fetch `GET /api/title?url=<encoded url>`.
  - While pending, disable the button, set `aria-busy="true"`, and label it
    `Fetching…`; restore it in `finally`.
  - Render `<button type="button">` (never a submit button) and a
    `<p id="title-status" role="status" aria-live="polite">` status element.
  - Stay SSR-safe: no `document` access during render.
- [x] Update `src/components/FetchTitleButton.tsx` to fill Notes:
  - Read `#notes` (textarea) alongside `#url` and `#title`; treat a missing
    element as “do not update that field”.
  - On success, overwrite `#title` whenever the response title is non-empty and
    overwrite `#notes` whenever the response description is non-empty.
  - Leave the corresponding field untouched when its value is empty.
  - Clear the status after a successful fetch; show
    `No title or description found` when both values are empty.
  - Keep `Could not fetch title` for request failures. No special handling for
    `422` remains.
- [x] Create `src/components/FetchTitleButton.css` for the status message,
      reusing `--color-error` like `SuggestionButton.css`; hide the empty status
      element and let it take a full flex row.
- [x] Update `src/pages/new.astro` and `src/pages/[id].astro`:
  - Wrap the existing URL input and `<FetchTitleButton client:load />` in a
    `.url-row` container inside the URL `.form-group`.
  - Give `.url-row` a flex layout with `align-items: center`, a small gap, and
    wrapping, and let the input grow to fill the row.
  - Keep the Title input as a normal full-width field, and keep the label,
    `id="url"`, `name="url"`, prefilled edit value, required attribute, and
    no-JS form submission unchanged.
  - No further markup change is needed for Notes; the component reads the
    existing `#notes` textarea.
- [x] Update `PLAN.md` (Routes/Pages, Frontend, Conventions and Helpers) to
      document `GET /api/title`, `FetchTitleButton`, and `src/lib/fetch-title.ts`.
- [x] Update `PLAN.md` again to say the endpoint also returns the meta
      description and that the button fills Notes as well as Title.
- [x] Run `node --test src/lib/*.test.ts` and `./node_modules/.bin/astro build`
      (pnpm is broken in this environment) and confirm they pass.
- [ ] Manually verify in the dev server (`astro dev --background`):
  - The Fetch button appears next to the URL field on both `/new` and `/:id`.
  - On `/new`, entering a URL and clicking Fetch fills the Title field and the
    Notes field.
  - On an existing `/:id`, clicking Fetch replaces both existing values.
  - A page with only `og:description` uses it; a page with only
    `<meta name="description">` uses that; a page with neither leaves Notes
    unchanged.
  - A blank URL shows `Enter a URL first` without a request.
  - An unreachable URL shows `Could not fetch title`; a page with neither a
    title nor a description shows `No title or description found`.
  - The button shows the disabled `Fetching…` state during the request and never
    submits the form.
  - With JavaScript disabled, the Title and Notes inputs still render and submit.

## Notes

- **Always replace** both fields when the page provides a value (explicitly
  chosen), regardless of whether the user typed something.
- **Leave a field unchanged** when the page has no value for it. In particular,
  no description must not clear existing notes.
- Description precedence: `og:description` → `<meta name="description">` →
  `twitter:description`.
- Button label is exactly **Fetch**, and it sits next to the URL field.
- **Follow-up:** the button was initially placed next to the Title field and was
  moved to the URL field on request; no logic changed, only the form markup and
  the `.url-row` layout.
- No database changes, no automatic form submission, and no changes to the AI
  suggestion flow.
- Keep `fetchPageMetadata` out of the React component so the browser never
  requests third-party pages directly.
- The endpoint fetches arbitrary user-supplied URLs (SSRF surface). Keep it
  limited to `http:`/`https:` with a short timeout; the app is a single-user
  local tool with authentication already out of scope, so blocking private or
  loopback addresses is not required for this task.
- Follow project style: tabs, no semicolons, single quotes, tabs for indentation,
  `.ts` extensions where existing modules use them.
- Reuse the `json()` helper shape from the other API routes; do not introduce a
  shared API abstraction in this task.
- **Verification:** `node --test src/lib/*.test.ts` runs 86 tests: 84 pass, and
  the 2 failures are the pre-existing `src/lib/suggest.test.ts` cases that
  expect `notes` while `parseSuggestions` reads `description`. `astro build`
  succeeds. The endpoint was checked with `curl`: `astro.build` returns both a
  title and description, `example.com` returns its title with an empty
  description, a JSON page with neither returns `{"title":"","description":""}`,
  a missing/invalid URL returns `400`, and an unreachable URL returns `502`.
- Manual UI verification is still pending; the dev server is running at
  `http://localhost:4321`.
