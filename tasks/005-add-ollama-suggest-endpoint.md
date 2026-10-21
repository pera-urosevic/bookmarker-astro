# Add Ollama suggest endpoint with web search tool [DONE]

## Description

Create `POST /api/suggest` as a new Astro server endpoint
(`src/pages/api/suggest.ts`) that asks a local Ollama model for tags and notes
for a bookmark. The endpoint accepts JSON `{ url, title }` and responds with
JSON `{ tags: string[], notes: string }`. It does not modify `bookmarks.json`;
the browser will put the values into the form.

The chat uses `ollama.chat()` from the already-installed `ollama` package
(`^0.6.4`, default export). The model is read from `OLLAMA_MODEL` and defaults
to `llama3.2`. The model is given a `web_search` tool backed by DuckDuckGo's
Instant Answer API, translated from the Python sketch to a TypeScript `fetch`
helper; the model decides when to call it.

This task is backend-only. Wiring the "AI" button into the edit and new pages
is the follow-up task `006`.

## Checklist

- [x] Add `src/lib/web-search.ts` exporting
      `webSearch(query: string): Promise<string>`, which calls
      `https://api.duckduckgo.com/?q=<query>&format=json` with
      `fetch` and returns `AbstractText`, or `"No results found."` when it is
      empty. Add a short timeout with `AbortSignal.timeout(...)` and fall back
      to the same message if the request fails.
- [x] Add `src/lib/suggest.ts` with:
      - `buildPrompt(url, title)` returning the system/user prompt: ask for 3–6
        concise tags relevant to the bookmark and 1–3 sentences of notes; do not
        restate the URL; use `web_search` when the URL/title alone is not enough.
      - `normalizeTags(values: unknown): string[]` that trims, drops empties,
        and de-duplicates case-insensitively while preserving first-seen order.
      - `parseSuggestions(raw: string): { tags: string[]; notes: string }` that
        parses the model's JSON reply and falls back to `{ tags: [], notes: '' }`
        on malformed output.
- [x] Add `src/lib/suggest.test.ts` covering `normalizeTags` (trim, empty,
      case-insensitive dedupe, order) and `parseSuggestions` (valid JSON,
      missing fields, malformed JSON, tags not an array).
- [x] Add `src/pages/api/suggest.ts` with `export const POST: APIRoute`
      (and a non-POST guard returning `405`):
      - Parse JSON body; `url` is required and must parse as an absolute URL,
        otherwise return `400 { error: '...' }`. Treat `title` as optional.
      - Read the model from `process.env.OLLAMA_MODEL || 'llama3.2'`.
      - Call `ollama.chat` with the messages from `buildPrompt`, plus a
        function tool named `web_search` (`{ query: string }`) whose
        implementation calls `webSearch()`. When the reply contains
        tool calls, execute them and append the tool results to the message
        history, then call again; cap the loop at 5 rounds to avoid infinite
        tool calls.
      - After the tool loop, request the final answer as JSON using a
        `format` JSON schema for `{ tags: string[], notes: string }`, or
        document/implement an equivalent structured-output approach that
        works with the configured model.
      - Pass the parsed values through `normalizeTags`/`parseSuggestions` and
        return `200 { tags, notes }`.
      - Catch Ollama/fetch failures and return `502 { error: '...' }` without
        leaking internal stack traces.
- [x] Verify manually: `pnpm astro dev --background`, then
      `curl -s localhost:4321/api/suggest -H 'content-type: application/json' -d '{"url":"https://astro.build","title":"Astro"}'`
      returns JSON with non-empty `tags`, and an invalid/missing URL returns
      `400`.
- [x] Run `node --test src/lib/*.test.ts` and confirm the new tests pass.

## Notes

- `ollama` is already a dependency; no new packages are needed. Do not add a
  Python runtime or `requests` — the DuckDuckGo helper is TypeScript `fetch`.
- Keep the snippet's behavior (DuckDuckGo Instant Answer, `AbstractText`,
  `"No results found."`) but avoid letting a slow search hang the request.
- `OLLAMA_MODEL` is optional; document the default in a comment. `.env` is
  gitignored, so do not commit one.
- The endpoint must remain stateless: suggestions are returned to the client
  and only persisted when the user submits the form.
- If the local Ollama instance is unavailable, the button will rely on this
  endpoint's error response; the client-side handling is covered in `006`.
- Verified against the running Ollama instance with
  `OLLAMA_MODEL=qwen3.5:9b` (the local install has no `llama3.2`, so the default
  model must be overridden or pulled). The dev server was restarted without the
  override afterwards, so the endpoint returns `502` until `OLLAMA_MODEL` is
  set to an installed model.
- DuckDuckGo's Instant Answer API returns an empty `AbstractText` for many
  queries (e.g. "Astro web framework"), in which case the tool reports
  `No results found.` as specified. That is not an error.
