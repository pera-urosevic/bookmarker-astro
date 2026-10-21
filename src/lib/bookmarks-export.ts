import type { Bookmark } from '../types'

interface Folder {
	name: string
	bookmarks: Bookmark[]
	folders: Map<string, Folder>
}

function createFolder(name: string): Folder {
	return { name, bookmarks: [], folders: new Map() }
}

function escapeHtml(value: string): string {
	return value
		.replaceAll('&', '&amp;')
		.replaceAll('<', '&lt;')
		.replaceAll('>', '&gt;')
		.replaceAll('"', '&quot;')
}

function unixSeconds(iso: string): number {
	const time = Date.parse(iso)
	return Number.isNaN(time) ? 0 : Math.floor(time / 1000)
}

function compareText(a: string, b: string): number {
	const left = a.toLowerCase()
	const right = b.toLowerCase()
	return left < right ? -1 : left > right ? 1 : 0
}

function categorySegments(category: string): string[] {
	return category.split('/').filter(Boolean)
}

function buildTree(bookmarks: Bookmark[]): Folder {
	const root = createFolder('')

	for (const bookmark of bookmarks) {
		let folder = root

		for (const name of categorySegments(bookmark.category)) {
			let child = folder.folders.get(name)

			if (!child) {
				child = createFolder(name)
				folder.folders.set(name, child)
			}

			folder = child
		}

		folder.bookmarks.push(bookmark)
	}

	return root
}

function bookmarkTitle(bookmark: Bookmark): string {
	return bookmark.title || bookmark.url
}

function compareBookmarks(a: Bookmark, b: Bookmark): number {
	return (
		compareText(bookmarkTitle(a), bookmarkTitle(b)) ||
		compareText(a.url, b.url)
	)
}

function appendContents(lines: string[], folder: Folder, depth: number, modified: number): void {
	const indent = '\t'.repeat(depth)
	const folders = [...folder.folders.values()].sort((a, b) => compareText(a.name, b.name))

	for (const child of folders) {
		lines.push(`${indent}<DT><H3 LAST_MODIFIED="${modified}">${escapeHtml(child.name)}</H3>`)
		lines.push(`${indent}<DL><p>`)
		appendContents(lines, child, depth + 1, modified)
		lines.push(`${indent}</DL><p>`)
		lines.push(`${indent}</DT>`)
	}

	for (const bookmark of [...folder.bookmarks].sort(compareBookmarks)) {
		lines.push(
			`${indent}<DT><A HREF="${escapeHtml(bookmark.url)}" ADD_DATE="${unixSeconds(bookmark.created_at)}">${escapeHtml(bookmarkTitle(bookmark))}</A>`,
		)

		if (bookmark.notes) {
			lines.push(`${indent}<DD>${escapeHtml(bookmark.notes)}`)
		}
	}
}

export function bookmarksToHtml(bookmarks: Bookmark[], now = new Date()): string {
	const lines = [
		'<!DOCTYPE NETSCAPE-Bookmark-file-1>',
		'<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
		'<TITLE>Bookmarks</TITLE>',
		'<H1>Bookmarks</H1>',
		'<DL><p>',
	]

	appendContents(lines, buildTree(bookmarks), 1, unixSeconds(now.toISOString()))
	lines.push('</DL><p>')

	return `${lines.join('\n')}\n`
}
