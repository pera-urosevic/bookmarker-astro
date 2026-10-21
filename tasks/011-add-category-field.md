# Add category field [DONE]

## Description

Add a single-string `category` field to bookmarks, defaulting to an empty string when unset. The field must be persisted in `bookmarks.json`, editable in both the edit (`/:id`) and add (`/new`) forms, and present on every `Bookmark` object created by the app or the importer.

Scope is limited to the data model, storage data, and forms. Listing, filtering, sorting, and AI suggestions are not changed.

## Checklist

- [x] Add `category: string` to the `Bookmark` interface in `src/types.ts` (place it after `notes`, before `tags`).
- [x] Backfill every record in `bookmarks.json` with `"category": ""` while preserving key order, tab indentation, and the trailing newline. Keep existing records' `updated_at` unchanged.
- [x] Update `src/pages/[id].astro`: read `category` from the submitted form data (trimmed, fallback `''`), write it on update, and add a text input bound to `bookmark.category` in the edit form.
- [x] Update `src/pages/new.astro`: read `category` from the submitted form data (trimmed, fallback `''`), include it in the new `Bookmark`, and add the corresponding text input to the form.
- [x] Update `src/lib/bookmarks-import.ts` so newly imported bookmarks set `category: ''` and existing records keep their category (default `''` when merging older data).
- [x] Verify with `pnpm test` (or `node --test src/lib/*.test.ts`) and a type check/build; existing tests must keep passing.

## Notes

- Category is a plain single string, not an array and not comma-parsed like tags.
- Existing records get an empty string; no other default or validation is required.
- The required `category` on the interface will break any untyped object literal that constructs a `Bookmark`; use `git grep "clicks:"` / TypeScript errors to find all construction sites (at minimum `src/pages/new.astro` and `src/lib/bookmarks-import.ts`).
- Do not change `updated_at` while backfilling `bookmarks.json`, since that would reshuffle the default sort order on `/`.
- The `'#TODO#'` notes value is the intentional review marker for newly imported bookmarks. The stale import test was updated to expect it instead of the duplicate's notes.
