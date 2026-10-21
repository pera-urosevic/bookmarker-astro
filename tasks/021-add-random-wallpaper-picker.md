# Add Random Wallpaper Picker [DONE]

## Description

Create `src/lib/wallpaper.ts` exposing `pickWallpaper(): string`. On first call it reads the filenames in `public/wallpapers` (the symlinked wallpaper folder), keeps the resulting URL list in module-level state so later calls reuse it, and returns a randomly picked wallpaper URL. Also use it for the `/home` background.

## Checklist

- [x] Create `src/lib/wallpaper.ts` with a module-level cached list (`let wallpapers: string[] | undefined`), populated once on first `pickWallpaper()` call.
- [x] Read the directory with `fs.readdirSync(dir, { withFileTypes: true })`, keep only regular files, and filter to image extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif` (case-insensitive — mirror `scripts/wallpapers.ts`).
- [x] Map each filename to a public URL path: `/wallpapers/<filename>`, sorted alphabetically with `localeCompare`.
- [x] Return a random entry using `Math.random()`; return `''` when the directory is missing/unreadable or contains no images (do not throw).
- [x] Export a testable directory-reading helper (e.g. `readWallpapers(directory: string): string[]`) that does not use the cache, and have `pickWallpaper()` build its cached list from it.
- [x] Add `src/lib/wallpaper.test.ts` using `node:test` + `node:assert/strict` (matching existing lib tests): cover extension filtering (case-insensitive), alphabetical sorting, URL prefixes, ignoring subdirectories, and an empty/missing directory returning `[]`.
- [x] In `src/pages/home.astro`, call `pickWallpaper()` and apply it to the existing background div as an inline style (`background-image: url('<picked>')` with the existing dark overlay gradient), only when the value is non-empty; otherwise leave the current `background-static-photos-hi` class untouched.
- [x] Verify: `node scripts/wallpapers.ts` still works, `pnpm test` passes, and `/home` shows a local wallpaper that changes between requests (dev server via `astro dev --background`).

## Notes

- `public/wallpapers` is a symlink (`/home/pera/Pictures/Wallpapers`); resolving it via `process.cwd()` + `public/wallpapers` works, and `readdirSync` follows the symlink.
- The cache is per server process, so a new deploy/restart picks up added files; no fs watching or invalidation is needed.
- Keep the overlay gradient in the CSS class if possible; if the inline style replaces the class, include the gradient in the inline value so text stays readable over bright photos.
- The existing `.background-static-photos-hi` rule points at a remote `static.photos` image and stays as the fallback when no local wallpapers exist.
- Follow existing style: tabs, no semicolons, single quotes, and `.ts` import extensions in tests.
