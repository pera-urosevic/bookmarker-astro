# Fallback To Site Favicons

## Description

Google's favicon service is the primary icon source, but it returns `404` (with a generic globe PNG) for domains it has no icon for, and it can also fail, time out, or return an unusable body. When that happens, fetch the icon from the bookmark's own site instead: read the page HTML, collect the icon URLs declared by `<link rel="icon">` / `rel="shortcut icon"` / `rel="apple-touch-icon"` (resolving relative hrefs against the page URL), then fall back to `<origin>/favicon.ico`. Convert the first usable image to the existing 64×64 quality-70 JPEG and store it exactly as today.

The fallback must preserve the current guarantees: `downloadFavicon` returns `null` instead of throwing, and bookmark create/update never fails because an icon could not be fetched.

## Checklist

- [x] Refactor `src/lib/favicon.ts` to share one image-download path used by both sources:
  - [x] 5s `AbortSignal.timeout`, `MAX_BODY_BYTES` (512 KB) content-length/body caps, `accept: image/*`, and `user-agent: Mozilla/5.0 (compatible; Bookmarker/1.0)` (same UA as `fetch-title`).
  - [x] Return a `Buffer` or `null`; keep `toFaviconJpeg` unchanged.
- [x] Add `extractIconUrls(html, pageUrl)` using the existing `node-html-parser` dependency:
  - [x] Accept `<link>` tags whose `rel` token list contains `icon` (covers `icon` and `shortcut icon`) or has an `apple-touch-icon`/`apple-touch-icon-precomposed` token; skip `mask-icon`.
  - [x] Ignore empty, `data:`, and non-http(s) hrefs, resolve relative hrefs against `pageUrl`, and dedupe while preserving document order.
- [x] Add fallback candidate generation:
  - [x] Fetch the page HTML with a 5s timeout, 2 MB cap, `accept: text/html,application/xhtml+xml`, `redirect: 'follow'`, and the shared user-agent.
  - [x] Return the extracted icon URLs followed by `${origin}/favicon.ico`, deduped; when the HTML fetch fails, still return `/favicon.ico`.
  - [x] Cap declared-icon candidates at 3 to bound latency.
- [x] Rework `downloadFavicon`:
  - [x] Try Google first and keep returning `null` for non-http(s) input.
  - [x] Only when Google yields `null` (non-OK status, empty/oversized body, non-image body, conversion error, timeout), try the fallback candidates sequentially and return the first converted JPEG.
  - [x] Return `null` when every source fails, logging once per bookmark URL instead of once per attempt.
- [x] Extend `src/lib/favicon.test.ts`:
  - [x] Google `404` → page HTML with a relative `<link rel="icon" href="/logo.png">` → JPEG returned.
  - [x] Absolute and protocol-relative hrefs resolve correctly; duplicates and non-image/`data:` URLs are skipped.
  - [x] `/favicon.ico` is used when the page fetch fails or declares no icons.
  - [x] `null` when Google and every fallback fail; assert the stub received the expected URLs in order.
  - [x] Non-http(s) input still returns `null` without fetching.
- [x] Update `PLAN.md` (Routes/Pages and Conventions and Helpers) to describe Google-first with site fallback and the source order.
- [x] Validate: `node --test src/lib/*.test.ts` (112 passing) and `./node_modules/.bin/astro build`.
- [ ] Optionally rerun `pnpm favicons:backfill` (only touches bookmarks with `NULL` icons) and visually spot-check `/`, `/home`, and a `/favicon/<id>.jpg` response.

## Notes

- Google answers unknown domains with `404 image/png` containing a 16×16 globe (verified for `example.com`, `localhost`, and a nonexistent domain), so `!response.ok` already identifies "not available". Do not add pixel/hash comparison against the globe; valid icons can legitimately be 200 responses of similar size.
- Fallback order is declared icons in document order, then `/favicon.ico`. `/favicon.ico` is best-effort: many sites return an HTML 404 page, which `sharp` rejects and the code already treats as `null`.
- Keep SSRF behavior consistent with `fetch-title` / `/api/title`: no private-IP blocking or other network restrictions in this task.
- No new dependencies; `node-html-parser` and `sharp` are already used.
- Follow project style: tabs, no semicolons, single quotes, `.ts` extensions, and existing API route patterns.
- Create keeps `favicon` `NULL` when every source fails; update keeps the previous icon in place. The existing backfill script automatically covers bookmarks left `NULL` after this change.
