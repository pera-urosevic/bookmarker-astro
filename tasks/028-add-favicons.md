# Add Favicons [DONE]

## Description

Give every bookmark a small site icon. On bookmark create and update, download the site's favicon from Google's favicon service, convert it to a 64×64 JPEG at quality 70, and store the resulting binary in a new nullable `favicon` `bytea` column. Serve stored icons through `GET /favicon/[id].jpg` and display them on both `/` (the bookmark list) and `/home` (the launcher results). Existing bookmarks are backfilled with a one-off script.

The icon download must never make create/update fail: if fetching or converting fails, store `NULL` on create and leave any previously stored icon untouched on update.

## Checklist

- [x] Add `db/migrations/002_add_favicon.sql` with `ALTER TABLE bookmarks ADD COLUMN favicon bytea;` (nullable, existing rows stay `NULL`).
- [x] Add `src/lib/favicon.ts`:
  - [x] `faviconServiceUrl(pageUrl)` returns `https://www.google.com/s2/favicons?domain=<hostname>&sz=64` for http(s) URLs, otherwise `null`.
  - [x] `toFaviconJpeg(input)` uses `sharp` to resize to 64×64 (`fit: 'contain'`, white background), flatten transparency, and encode JPEG at quality 70.
  - [x] `downloadFavicon(pageUrl, fetchImpl = fetch)` fetches the service URL with a 5s timeout and a size cap, returns the converted `Buffer`, or `null` on any invalid URL, non-OK response, non-image body, timeout, or conversion error. Log failures without throwing.
- [x] Add `src/lib/favicon.test.ts` covering service URL generation, invalid/non-http URLs, PNG → 64×64 JPEG conversion (assert format and dimensions via `sharp`), successful download through a stub `fetchImpl`, and `null` for 404/non-image responses.
- [x] Update `src/types.ts`: add optional `has_favicon?: boolean` to `Bookmark` (do not put the binary in the type).
- [x] Update `src/lib/bookmarks.ts`:
  - [x] Select `favicon IS NOT NULL AS has_favicon` instead of `*` in normal list/search/get queries so binary data is not loaded unnecessarily.
  - [x] Extend `BookmarkRow`/`rowToBookmark` to map `has_favicon` (default `false`), and update the deep-equal test in `src/lib/bookmarks.test.ts`.
  - [x] Add `getBookmarkFavicon(id): Promise<Buffer | null>` reading only the `favicon` column.
  - [x] Add `setBookmarkFavicon(id, favicon: Buffer | null): Promise<boolean>` updating only the `favicon` column (must not change `updated_at`).
  - [x] Add `listBookmarksMissingFavicon(): Promise<Bookmark[]>` for the backfill script.
- [x] Hook downloads into `src/pages/new.astro` and `src/pages/[id].astro`: after create/update succeeds, call `downloadFavicon(url)` and `setBookmarkFavicon` only when a buffer was produced. Await the work so the redirected page shows the icon, but never fail the request on download errors.
- [x] Add `src/pages/favicon/[id].jpg.ts` with a `GET` handler that returns the stored buffer as `image/jpeg` with `cache-control: public, max-age=86400, immutable`, returns `404` when the bookmark or icon is missing, and `ALL` returns `405`.
- [x] Display icons on `/home`: in `src/components/HomeLauncher.tsx` render a 16×16 `<img alt="" loading="lazy">` inside each result link when `bookmark.has_favicon`, using `src={`/favicon/${bookmark.id}.jpg?v=${encodeURIComponent(bookmark.updated_at)}`}`; otherwise render a same-sized solid Eigengrau placeholder. Update `HomeLauncher.css` so the link lays out icon and title in a row without breaking ellipsis.
- [x] Display icons on `/`: in `src/components/BookmarkSearch.tsx` render a ~20×20 `<img alt="">` before the title when `bookmark.has_favicon`, using the same versioned URL; otherwise render a same-sized solid Eigengrau placeholder. Update `BookmarkSearch.css` for alignment with the title/category/badge row.
- [x] Add `scripts/favicons.ts` that loads bookmarks missing a favicon, downloads and stores icons sequentially, logs per-bookmark success/failure, continues past failures, and closes the DB client. Add a `favicons:backfill` script to `package.json` (`node --env-file-if-exists=.env scripts/favicons.ts`).
- [x] Update `PLAN.md`: Data Model (`favicon` bytea, nullable), Storage (migration 002), Routes/Pages (`/favicon/[id].jpg`), Frontend (icons on `/` and `/home`), Conventions and Helpers (`favicon` lib and backfill script), and the passing test count.
- [x] Validate: run `pnpm db:migrate`, `node --test src/lib/*.test.ts`, and `./node_modules/.bin/astro build`; run the backfill; start `astro dev --background` and check `/`, `/home`, and a `/favicon/<id>.jpg` response; stop the dev server.

## Notes

- The favicon service is external: `https://www.google.com/s2/favicons?domain=<hostname>&sz=64`. It returns a generic globe for domains without a favicon, which is acceptable and indistinguishable from a real icon.
- Requirement: the stored image is always JPEG, exactly 64×64 pixels, quality 70. `sharp` is already a dependency.
- Create failure leaves `favicon` `NULL`. Update failure leaves the previous icon in place; a successful update always re-downloads and replaces it, even when the URL did not change.
- Do not add favicon downloads to `/import`; the backfill script covers imported and existing bookmarks.
- Keep binary data out of `/api/bookmarks` and page props. Only expose `has_favicon`; the browser fetches the image from the dedicated route.
- Use the version query (`?v=<updated_at>`) so an updated icon is not masked by the browser cache.
- Follow project style: tabs, no semicolons, single quotes, `.ts` extensions, and existing API route patterns.
- Backfill run: 425 of 473 existing bookmarks received icons; localhost/internal URLs and sites without a Google icon stay `NULL` and render the Eigengrau (`#16161d`) placeholder.
- The placeholder uses the shared `--color-eigengrau` token added to `public/style.css`.
- `src/lib/db.ts` now falls back to `process.env.DATABASE_URL` so the Node migration and backfill scripts work outside Astro's Vite environment.
