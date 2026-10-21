# Import category from folder hierarchy [DONE]

## Description

Derive each imported bookmark's `category` from its Netscape folder hierarchy, joined outermost → innermost with `/`, preserving the folder names' case. Browser wrapper folders at the top level (`Bookmarks bar`, `Bookmarks Toolbar`, `Favorites bar`, `Bookmarks Menu`, `Other Bookmarks`, `Other Favorites`, case-insensitive) are excluded. Root-level bookmarks get `""`. Folder names are no longer copied into `tags`; newly imported bookmarks get an empty tag list, while existing tags are left untouched. Re-importing an existing URL fills the category only when it is empty.

## Checklist

- [x] Replace folder-to-tags extraction in `src/lib/bookmarks-import.ts` with a `getCategory` helper that builds the folder path.
- [x] Add `category` to `ParsedBookmark`, remove `tags` from it, and populate it in `parseBookmarks`.
- [x] In `mergeBookmarks`, set `category: item.category` and `tags: []` for new bookmarks; fill an existing bookmark's category only when empty and mark it updated. Remove the now-unused folder-tag merge logic.
- [x] Update `src/lib/bookmarks-import.test.ts`: fixture expectations, nested `Programming/Frontend/React` path, container exclusion, category fill/keep behavior, and removed folder tags.
- [x] Update the help text in `src/pages/import.astro` to describe category derivation and tag behavior.
- [x] Run `node --test src/lib/*.test.ts` and `astro build`.

## Notes

- Only the first path segment is checked against the wrapper-folder list; a nested folder with the same name is kept.
- Category segments are trimmed; empty folder names are skipped.
- Matching an existing URL keeps its title, notes, tags, and non-empty category as they are.
- Browser exports omit `</DT>`; `normalizeFolders` inserts it before each folder's `<DL>` so node-html-parser retains the nesting.
