import type { Bookmark } from '../types'
import { randomUUID } from 'node:crypto'
import { createHash } from 'node:crypto'

const windowsEpochOffsetMicros = 11644473600000000n

export interface ChromeNode {
	id: string
	guid?: string
	name: string
	type: 'url' | 'folder'
	url?: string
	date_added?: string
	date_last_used?: string
	date_modified?: string
	children?: ChromeNode[]
	[key: string]: unknown
}

export interface ChromeRoots {
	bookmark_bar: ChromeNode
	other: ChromeNode
	synced: ChromeNode
}

export interface ChromeBookmarksFile {
	checksum: string
	checksum_sha256?: string
	roots: ChromeRoots
	sync_metadata?: string
	version: number
}

interface Folder {
	name: string
	bookmarks: Bookmark[]
	folders: Map<string, Folder>
}

function createFolder(name: string): Folder {
	return { name, bookmarks: [], folders: new Map() }
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function chromeTime(iso: string): string {
	const time = Date.parse(iso)
	if (Number.isNaN(time)) return '0'
	return String(BigInt(time) * 1000n + windowsEpochOffsetMicros)
}

function compareText(a: string, b: string): number {
	const left = a.toLowerCase()
	const right = b.toLowerCase()
	if (left < right) return -1
	if (left > right) return 1
	return 0
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

function maxId(root: unknown): number {
	let result = 0

	function visit(node: unknown): void {
		if (!isRecord(node)) return

		const id = node.id
		if (typeof id === 'string' && /^\d+$/.test(id)) {
			result = Math.max(result, Number(id))
		} else if (typeof id === 'number' && Number.isInteger(id)) {
			result = Math.max(result, id)
		}

		if (Array.isArray(node.children)) {
			for (const child of node.children) visit(child)
		}
	}

	visit(root)
	return result
}

export function findAllMaxIds(existingBar: ChromeNode, existingOther: ChromeNode, existingSynced: ChromeNode): number {
	return Math.max(maxId(existingBar), maxId(existingOther), maxId(existingSynced))
}

function permanentNode(existing: unknown, id: number, guid: string, name: string, now: Date): ChromeNode {
	if (isRecord(existing)) {
		const node: ChromeNode = {
			...existing,
			id: typeof existing.id === 'string' && /^\d+$/.test(existing.id) ? existing.id : String(id),
			guid: typeof existing.guid === 'string' && existing.guid ? existing.guid : guid,
			name: typeof existing.name === 'string' ? existing.name : name,
			type: 'folder',
		}

		if (!Array.isArray(node.children)) node.children = []
		if (typeof node.date_added !== 'string') node.date_added = chromeTime(now.toISOString())
		if (typeof node.date_last_used !== 'string') node.date_last_used = '0'
		if (typeof node.date_modified !== 'string') node.date_modified = chromeTime(now.toISOString())

		return node
	}

	return {
		id: String(id),
		guid,
		name,
		type: 'folder',
		date_added: chromeTime(now.toISOString()),
		date_last_used: '0',
		date_modified: chromeTime(now.toISOString()),
		children: [],
	}
}

function computeChecksum(roots: ChromeRoots, includeSha256: boolean): { md5: string; sha256?: string } {
	const md5 = createHash('md5')
	const sha = includeSha256 ? createHash('sha256') : null

	function updateText(hash: ReturnType<typeof createHash>, value: string): void {
		hash.update(Buffer.from(value, 'utf8'))
	}

	function updateUtf16(hash: ReturnType<typeof createHash>, value: string): void {
		hash.update(Buffer.from(value, 'utf16le'))
	}

	function visit(node: ChromeNode): void {
		if (node.type === 'folder') {
			updateText(md5, node.id)
			updateUtf16(md5, node.name)
			updateText(md5, 'folder')
			if (sha) {
				updateText(sha, node.id)
				updateUtf16(sha, node.name)
				updateText(sha, 'folder')
			}

			for (const child of node.children ?? []) visit(child)
		} else {
			updateText(md5, node.id)
			updateUtf16(md5, node.name)
			updateText(md5, 'url')
			updateText(md5, node.url ?? '')
			if (sha) {
				updateText(sha, node.id)
				updateUtf16(sha, node.name)
				updateText(sha, 'url')
				updateText(sha, node.url ?? '')
			}
		}
	}

	visit(roots.bookmark_bar)
	visit(roots.other)
	visit(roots.synced)

	return {
		md5: md5.digest('hex'),
		sha256: sha ? sha.digest('hex') : undefined,
	}
}

function toChromeBookmark(bookmark: Bookmark, nextId: () => string): ChromeNode {
	return {
		id: nextId(),
		guid: randomUUID(),
		name: bookmark.title || bookmark.url,
		type: 'url',
		url: bookmark.url,
		date_added: chromeTime(bookmark.created_at),
		date_last_used: '0',
	}
}

function convertFolder(folder: Folder, now: Date, nextId: () => string): ChromeNode {
	const children: ChromeNode[] = [
		...[...folder.folders.values()]
			.sort((a, b) => compareText(a.name, b.name))
			.map(child => convertFolder(child, now, nextId)),
		...[...folder.bookmarks].sort(compareBookmarks).map(bookmark => toChromeBookmark(bookmark, nextId)),
	]

	return {
		id: nextId(),
		guid: randomUUID(),
		name: folder.name,
		type: 'folder',
		date_added: chromeTime(now.toISOString()),
		date_last_used: '0',
		date_modified: chromeTime(now.toISOString()),
		children,
	}
}

function convertRoot(folder: Folder, now: Date, nextId: () => string): ChromeNode[] {
	return [
		...[...folder.folders.values()]
			.sort((a, b) => compareText(a.name, b.name))
			.map(child => convertFolder(child, now, nextId)),
		...[...folder.bookmarks].sort(compareBookmarks).map(bookmark => toChromeBookmark(bookmark, nextId)),
	]
}

export function bookmarksToChrome(existing: unknown, bookmarks: Bookmark[], now: Date = new Date()): ChromeBookmarksFile {
	const source = isRecord(existing) ? existing : {}
	const version = typeof source.version === 'number' ? source.version : 1
	const syncMetadata = typeof source.sync_metadata === 'string' ? source.sync_metadata : undefined

	const existingRoots = source.roots && isRecord(source.roots) ? source.roots : {}
	const existingBar = existingRoots.bookmark_bar
	const existingOther = existingRoots.other
	const existingSynced = existingRoots.synced

	const roots: ChromeRoots = {
		bookmark_bar: permanentNode(existingBar, 1, '00000000-0000-4000-a000-000000000002', 'Bookmarks bar', now),
		other: permanentNode(existingOther, 2, '00000000-0000-4000-a000-000000000003', 'Other bookmarks', now),
		synced: permanentNode(existingSynced, 3, '00000000-0000-4000-a000-000000000004', 'Mobile bookmarks', now),
	}

	// Bookmark root permanent node stores date_modified from the previous tree, but we refresh it.
	const includeSha256 = source.checksum_sha256 !== undefined

	const maxExistingId = Math.max(findAllMaxIds(roots.bookmark_bar, roots.other, roots.synced), 0)
	let nextId = maxExistingId >= 1 ? maxExistingId + 1 : 1000
	const next = () => String(nextId++)

	const tree = buildTree(bookmarks)
	roots.bookmark_bar.children = convertRoot(tree, now, next)

	const modifiedTime = chromeTime(now.toISOString())
	roots.bookmark_bar.date_modified = modifiedTime

	const hashes = computeChecksum(roots, includeSha256)

	const result: ChromeBookmarksFile = {
		checksum: hashes.md5,
		roots,
		version,
	}

	if (syncMetadata !== undefined) {
		result.sync_metadata = syncMetadata
	}

	if (source.checksum_sha256 !== undefined) {
		result.checksum_sha256 = hashes.sha256
	}

	return result
}

// Keep exports compatible with callers that may refer to a single default ID allocator.
export function nextIdFrom(existingMaxId: number): number {
	return existingMaxId >= 1 ? existingMaxId + 1 : 1000
}
