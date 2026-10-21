import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Bookmark } from '../types'
import { bookmarksToChrome } from './bookmarks-chrome.ts'

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
	return {
		id: 'bookmark-id',
		url: 'https://example.com',
		title: 'Example',
		notes: 'note',
		category: '',
		tags: ['tag'],
		clicks: 3,
		created_at: '2025-01-01T00:00:00.000Z',
		updated_at: '2025-06-01T00:00:00.000Z',
		...overrides,
	}
}

function existingFile(bookmarkBarChildren: unknown[] = []): unknown {
	return {
		checksum: 'old',
		version: 1,
		sync_metadata: 'syncdata',
		roots: {
			bookmark_bar: {
				id: '1',
				guid: '00000000-0000-4000-a000-000000000002',
				name: 'Bookmarks bar',
				type: 'folder',
				date_added: '100',
				date_last_used: '0',
				date_modified: '100',
				children: bookmarkBarChildren,
			},
			other: {
				id: '2',
				guid: '00000000-0000-4000-a000-000000000003',
				name: 'Other bookmarks',
				type: 'folder',
				date_added: '100',
				date_last_used: '0',
				date_modified: '100',
				children: [{ id: '77', type: 'url', name: 'Kept', url: 'https://kept.example' }],
			},
			synced: {
				id: '3',
				guid: '00000000-0000-4000-a000-000000000004',
				name: 'Mobile bookmarks',
				type: 'folder',
				date_added: '100',
				date_last_used: '0',
				date_modified: '100',
				children: [],
			},
		},
	}
}

test('creates chrome roots when no existing file', () => {
	const file = bookmarksToChrome(null, [bookmark()])

	assert.equal(file.version, 1)
	assert.equal(file.roots.bookmark_bar.id, '1')
	assert.equal(file.roots.other.id, '2')
	assert.equal(file.roots.synced.id, '3')
	assert.equal(file.sync_metadata, undefined)
	assert.equal(file.roots.bookmark_bar.children?.length, 1)
})

test('preserves other and synced roots', () => {
	const file = bookmarksToChrome(existingFile(), [bookmark()])

	assert.equal(file.roots.other.children?.length, 1)
	assert.equal(file.roots.other.children?.[0].name, 'Kept')
	assert.equal(file.sync_metadata, 'syncdata')
})

test('converts created_at to chrome time', () => {
	const file = bookmarksToChrome(null, [bookmark({ created_at: '2025-01-01T00:00:00.000Z' })])
	const node = file.roots.bookmark_bar.children?.[0]

	assert.equal(node?.date_added, String(BigInt(Date.parse('2025-01-01T00:00:00.000Z')) * 1000n + 11644473600000000n))
	assert.equal(node?.date_last_used, '0')
})

test('drops notes, tags, and clicks', () => {
	const file = bookmarksToChrome(null, [bookmark()])
	const node = file.roots.bookmark_bar.children?.[0] as Record<string, unknown>

	assert.equal(node.notes, undefined)
	assert.equal(node.tags, undefined)
	assert.equal(node.clicks, undefined)
	assert.equal(node.name, 'Example')
})

test('uses url as title fallback', () => {
	const file = bookmarksToChrome(null, [bookmark({ title: '' })])
	const node = file.roots.bookmark_bar.children?.[0]

	assert.equal(node?.name, 'https://example.com')
})

test('builds nested category folders', () => {
	const file = bookmarksToChrome(null, [
		bookmark({ title: 'Dev', category: 'dev/tools' }),
		bookmark({ title: 'Root', category: '' }),
	])

	const bar = file.roots.bookmark_bar.children ?? []
	assert.equal(bar.length, 2)
	assert.equal(bar[0].name, 'dev')
	assert.equal(bar[0].children?.[0].name, 'tools')
	assert.equal(bar[0].children?.[0].children?.[0].name, 'Dev')
	assert.equal(bar[1].name, 'Root')
})

test('handles empty and duplicate slash categories', () => {
	const file = bookmarksToChrome(null, [
		bookmark({ title: 'One', category: '/dev//tools/' }),
	])

	const bar = file.roots.bookmark_bar.children ?? []
	assert.equal(bar[0].name, 'dev')
	assert.equal(bar[0].children?.[0].name, 'tools')
	assert.equal(bar[0].children?.[0].children?.[0].name, 'One')
})

test('orders folders before bookmarks and sorts both', () => {
	const file = bookmarksToChrome(null, [
		bookmark({ title: 'zulu', url: 'https://example.com/z', category: 'zeta' }),
		bookmark({ title: 'apple', url: 'https://example.com/a' }),
		bookmark({ title: 'AlphaFolder', url: 'https://example.com/alpha', category: 'Alpha' }),
		bookmark({ title: 'banana', url: 'https://example.com/b' }),
	])

	const names = (file.roots.bookmark_bar.children ?? []).map(child => child.name)
	assert.deepEqual(names, ['Alpha', 'zeta', 'apple', 'banana'])
})

test('allocates ids after the highest existing id', () => {
	const file = bookmarksToChrome(
		existingFile([{ id: '500', type: 'url', name: 'Old' }]),
		[bookmark()],
	)
	const ids = [file.roots.bookmark_bar.children?.[0].id]
	assert.equal(Number(ids[0]), 501)
})

test('generates v4 guids for new nodes and preserves root guids', () => {
	const file = bookmarksToChrome(null, [bookmark({ category: 'dev' })])
	const folder = file.roots.bookmark_bar.children?.[0]
	const node = folder?.children?.[0]

	assert.match(folder?.guid ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
	assert.match(node?.guid ?? '', /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)
	assert.equal(file.roots.bookmark_bar.guid, '00000000-0000-4000-a000-000000000002')
})

test('computes a 32-character md5 checksum', () => {
	const file = bookmarksToChrome(null, [])
	assert.match(file.checksum, /^[0-9a-f]{32}$/)
})
