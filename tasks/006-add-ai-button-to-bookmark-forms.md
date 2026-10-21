# Add "AI" button to edit and new bookmark forms [DONE]

## Description

Add an **AI** button to the bookmark forms in `src/pages/[id].astro` (edit) and
`src/pages/new.astro` (add). Clicking it sends the current URL and title to
`POST /api/suggest` (task `005`), then fills the form's tags and notes fields
from the JSON response.

Per the decisions made for this feature, the button fills **both** tags and
notes, but only when the corresponding field is empty — anything the user has
already typed is left untouched. The request is asynchronous; the page must not
reload or submit the form.

This task assumes `005` is done and `/api/suggest` responds with
`{ tags: string[], notes: string }`.

## Checklist

- [x] Add `src/lib/apply-suggestions.ts` exporting a pure helper, e.g.
      `applySuggestions(current: { tags: string; notes: string }, suggestion: { tags: string[]; notes: string }): { tags: string; notes: string }`,
      which returns the new field values: keep `current.tags` unless it is
      blank, keep `current.notes` unless it is blank, and otherwise use
      `suggestion.tags.join(', ')` / `suggestion.notes`.
- [x] Add `src/lib/apply-suggestions.test.ts` covering: both empty (both
      filled), both non-empty (unchanged), tags empty but notes filled, and
      whitespace-only values treated as empty.
- [x] In `src/pages/[id].astro`, add a `<button type="button" id="ai-button">AI</button>`
      next to the existing "Update Bookmark" submit button, inside a
      `.form-actions` container. Keep the submit button unchanged.
- [x] Add an error/status element near the buttons, e.g.
      `<p id="ai-status" role="status" aria-live="polite"></p>`, styled with the
      existing error color if one is defined; it stays empty by default.
- [x] Add the same button and status element to `src/pages/new.astro` next to
      its "Create Bookmark" button.
- [x] Add an inline `<script>` to both pages (following the existing inline
      script style) that:
      - Exits quietly if `#ai-button` is absent.
      - Reads `#url`, `#title`, `#tags`, and `#notes` values.
      - Shows `"Enter a URL first"` and does not fetch when the URL is blank.
      - Sends `fetch('/api/suggest', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url, title }) })`.
      - While the request is pending, disables the button, sets
        `aria-busy="true"`, and changes its label to `"Thinking…"`; restores
        both in a `finally` block.
      - On a non-OK response or network error, shows a short message in
        `#ai-status` (e.g. `"Could not get suggestions"`) and leaves the form
        values unchanged.
      - On success, calls `applySuggestions()` with the current tags/notes and
        the response, writes the returned values back into the inputs, and
        clears the status message.
- [x] Add minimal CSS to both pages for `.form-actions` (flex row, gap,
      wrap) so the AI and submit buttons sit together; reuse existing button
      styling.
- [x] Run `node --test src/lib/*.test.ts` and confirm the new tests pass.
- [x] Manually verify on the dev server: click AI on `/new` and on an edit page
      after entering URL/title, confirm tags/notes populate, confirm typed
      values are not overwritten, and confirm the button returns to "AI" when
      the request finishes or fails (e.g. with Ollama stopped and the endpoint
      returning an error).

## Notes

- Do not auto-submit the form or modify `bookmarks.json` from the client; the
  values only persist through the normal form POST.
- The behavior is identical on both pages; duplicate the small inline script
  rather than introducing a component, consistent with how the two pages
  already duplicate their markup and styles.
- The endpoint may take seconds while Ollama runs; ensure the loading state is
  visible and that a second click cannot start a parallel request (disabled
  button covers this).
- Do not overwrite non-empty tags/notes, even if the AI returns something
  different — this was explicitly chosen to protect user input.
- If `005` changes its response shape, update `applySuggestions` and its tests
  together rather than handling multiple shapes in the client.
- **Update:** suggestions are now always appended instead of only filling
  blank fields. `applySuggestions` merges tags as an ordered, case-insensitive
  union (existing tags win) and appends suggested notes after a blank line.
  The tests in `src/lib/apply-suggestions.test.ts` cover the new behavior.
- Verified in headless Brave against the running dev server with
  `OLLAMA_MODEL=qwen3.5:9b`: the AI button showed `Thinking…`/disabled, filled
  both empty fields, kept pre-typed values, showed `Enter a URL first` without
  fetching, and showed `Could not get suggestions` while restoring the button
  on a forced `502`. The dev server was restarted without the model override
  afterwards.
