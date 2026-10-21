import type { Bookmark } from '../types'
import { normalizeClicks } from './clicks.ts'

export function sortByClicks(bookmarks: Bookmark[]): Bookmark[] {
	return [...bookmarks].sort(
		(a, b) =>
			normalizeClicks(b.clicks) - normalizeClicks(a.clicks) ||
			Date.parse(b.updated_at) - Date.parse(a.updated_at),
	)
}
