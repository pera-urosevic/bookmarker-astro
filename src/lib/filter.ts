import type { Bookmark } from '../types'

export function bookmarkSearchText(bookmark: Bookmark): string {
	return [bookmark.title, bookmark.url, bookmark.notes, ...bookmark.tags].join(' ')
}

export function matchesQuery(text: string, query: string): boolean {
	const terms = query.toLowerCase().split(/\s+/).filter(Boolean)
	if (terms.length === 0) return true

	const normalized = text.toLowerCase()
	return terms.every(term => normalized.includes(term))
}

export function formatVisibleCount(visible: number, total: number): string {
	return `${visible} of ${total}`
}
