# Lowercase all tags [DONE]

## Description

Tags are now stored and displayed in lowercase everywhere: AI suggestions,
manually typed form tags, and tags imported from browser bookmark exports. Mixed
case duplicates are collapsed case-insensitively, and the existing
`bookmarks.json` was migrated.

## Checklist

- [x] Add `src/lib/tags.ts` with `normalizeTags(values)` (trim, lowercase,
      drop empties/non-strings, case-insensitive dedupe) and `parseTags(value)`
      (comma-separated variant).
- [x] Move `normalizeTags` out of `src/lib/suggest.ts`; `parseSuggestions` now
      returns lowercase tags.
- [x] Use `parseTags` in the create and edit form POST handlers so stored tags
      are lowercase.
- [x] Update `applySuggestions` to lowercase and case-insensitively merge typed
      tags with suggested tags.
- [x] Lowercase parsed and merged tags in `src/lib/bookmarks-import.ts`,
      including case-only changes to existing bookmarks. Update the import help
      text.
- [x] Migrate `bookmarks.json`: lowercase tags and dedupe case-insensitively,
      preserving order, IDs, timestamps, formatting, and trailing newline.
- [x] Update tests (`tags`, `suggest`, `apply-suggestions`, `bookmarks-import`)
      and add coverage for lowercase/dedupe behavior.
- [x] Run `node --test src/lib/*.test.ts` (41 passing) and `npm run build`.

## Notes

- Search/filtering already compared case-insensitively, so `src/lib/filter.ts`
  is unchanged.
- `bookmarks.json` is gitignored; the migration was a one-off local rewrite.
