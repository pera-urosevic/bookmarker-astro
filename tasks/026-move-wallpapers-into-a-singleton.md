# Move Wallpapers into a Singleton [DONE]

## Description
Move only the `readdir('./public/wallpapers')` call out of `src/pages/home.astro` and into a singleton. Everything else on the page (`pickWallpaper(wallpapers)`, URL construction, background styling, fallback) stays the same. The singleton should own the resulting wallpaper filename list so it is read in one shared place; `home.astro` should consume the list from the singleton instead of calling `readdir` itself.

## Checklist
- [x] Introduce a singleton (for example a module-level object/class such as `wallpapersSingleton` with `getInstance()`/a stored `wallpapers` property) in the wallpaper-related code.
- [x] Move `await readdir('./public/wallpapers')` into that singleton; keep its return type/shape unchanged.
- [x] Update `src/pages/home.astro` to obtain the list from the singleton (for example `const wallpapers = await wallpapersSingleton.wallpapers`) instead of calling `readdir` directly.
- [x] Keep `pickWallpaper(wallpapers)` and the rest of the page behavior unchanged.
- [x] Run `pnpm test` and confirm no regressions.

## Notes
- Scope is intentionally limited to moving the `readdir('./public/wallpapers')` line into a singleton; do not refactor filtering, sorting, caching behavior, or `pickWallpaper`.
- The singleton may be implemented as a module-level instance or a class with `getInstance()`; choose the simplest option consistent with the existing code style.