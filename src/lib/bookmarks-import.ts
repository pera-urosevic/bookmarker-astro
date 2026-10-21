import { parse, type HTMLElement } from 'node-html-parser'
import { v7 as uuidv7 } from 'uuid'
import type { Bookmark } from '../types'

export interface ParsedBookmark {
	url: string
	title: string
	notes: string
	category: string
}

export interface ImportResult {
	bookmarks: Bookmark[]
	imported: Bookmark[]
	updated: Bookmark[]
	skipped: Bookmark[]
}

function getNotes(anchor: HTMLElement): string {
	const dt = anchor.closest('dt')
	if (!dt) return ''

	let sibling = dt.nextElementSibling
	while (sibling) {
		if (sibling.tagName === 'DD') return sibling.text.trim()
		if (sibling.tagName === 'DT') break
		sibling = sibling.nextElementSibling
	}

	return ''
}

const BROWSER_CONTAINERS = new Set([
	'bookmarks bar',
	'bookmarks toolbar',
	'favorites bar',
	'favorites toolbar',
	'bookmarks menu',
	'other bookmarks',
	'other favorites',
])

// Browser exports omit the implied `</DT>`, which makes node-html-parser flatten nested
// folders. Closing the folder tag before its list keeps the hierarchy intact.
const FOLDER_WITH_CHILDREN = /(<dt>\s*<h3\b[^>]*>[\s\S]*?<\/h3>)\s*(?=<dl\b)/gi

function normalizeFolders(html: string): string {
	return html.replace(FOLDER_WITH_CHILDREN, '$1</DT>')
}

function getFolderName(dl: HTMLElement): string {
	const previous = dl.previousElementSibling
	if (previous?.tagName === 'H3') return previous.text.trim()
	if (previous?.tagName === 'DT') return previous.querySelector('h3')?.text.trim() ?? ''
	return ''
}

function getCategory(anchor: HTMLElement): string {
	const folders: string[] = []
	let current: HTMLElement | null = anchor.closest('dt') ?? anchor.parentNode

	while (current) {
		if (current.tagName === 'DL') {
			const folder = getFolderName(current)
			if (folder) folders.unshift(folder)
		}
		current = current.parentNode
	}

	if (folders.length > 0 && BROWSER_CONTAINERS.has(folders[0].toLowerCase())) {
		folders.shift()
	}

	return folders.join('/')
}

export function parseBookmarks(html: string): ParsedBookmark[] {
	const root = parse(normalizeFolders(html))

	return root
		.querySelectorAll('a[href]')
		.map(anchor => ({
			url: anchor.getAttribute('href')?.trim() ?? '',
			title: anchor.text.trim(),
			notes: getNotes(anchor),
			category: getCategory(anchor),
		}))
		.filter(bookmark => bookmark.url !== '')
}

export function mergeBookmarks(
	existing: Bookmark[],
	incoming: ParsedBookmark[],
	now = new Date().toISOString(),
): ImportResult {
	const bookmarks = existing.map(bookmark => ({
		...bookmark,
		category: bookmark.category ?? '',
		tags: [...bookmark.tags],
		clicks: bookmark.clicks ?? 0,
	}))
	const indexByUrl = new Map(bookmarks.map((bookmark, index) => [bookmark.url, index]))
	const imported: Bookmark[] = []
	const updated: Bookmark[] = []
	const skipped: Bookmark[] = []

	for (const item of incoming) {
		const index = indexByUrl.get(item.url)

		if (index === undefined) {
			const bookmark: Bookmark = {
				id: uuidv7(),
				url: item.url,
				title: item.title,
				notes: '#TODO#',
				category: item.category,
				tags: [],
				clicks: 0,
				created_at: now,
				updated_at: now,
			}
			indexByUrl.set(item.url, bookmarks.length)
			bookmarks.push(bookmark)
			imported.push(bookmark)
			continue
		}

		const bookmark = bookmarks[index]
		let changed = false

		if (!bookmark.title && item.title) {
			bookmark.title = item.title
			changed = true
		}

		if (!bookmark.notes && item.notes) {
			bookmark.notes = item.notes
			changed = true
		}

		if (!bookmark.category && item.category) {
			bookmark.category = item.category
			changed = true
		}

		if (changed) {
			bookmark.updated_at = now
			updated.push(bookmark)
		} else {
			skipped.push(bookmark)
		}
	}

	return { bookmarks, imported, updated, skipped }
}
