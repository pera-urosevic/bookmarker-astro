import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Bookmark } from '../types'
import { sortByClicks } from './sort.ts'

function bookmark(id: string, updated_at: string, clicks = 0): Bookmark {
	return {
		id,
		url: `https://example.com/${id}`,
		title: id,
		notes: '',
		category: '',
		tags: [],
		clicks,
		created_at: '2025-01-01T00:00:00.000Z',
		updated_at,
	}
}

const oldest = bookmark('oldest', '2025-01-01T00:00:00.000Z')
const newest = bookmark('newest', '2025-12-01T00:00:00.000Z')

test('sorts by click count before last edited', () => {
	const popularOld = bookmark('popular', oldest.updated_at, 5)
	const recentRare = bookmark('rare', newest.updated_at, 1)

	const sorted = sortByClicks([recentRare, popularOld])

	assert.deepEqual(
		sorted.map(bookmark => bookmark.id),
		['popular', 'rare'],
	)
})

test('equal click counts fall back to newest edited first', () => {
	const older = bookmark('older', oldest.updated_at, 3)
	const newer = bookmark('newer', newest.updated_at, 3)

	const sorted = sortByClicks([older, newer])

	assert.deepEqual(
		sorted.map(bookmark => bookmark.id),
		['newer', 'older'],
	)
})

test('missing clicks counts as zero', () => {
	const missing: Partial<Bookmark> = bookmark('missing', newest.updated_at)
	delete missing.clicks
	const clicked = bookmark('clicked', oldest.updated_at, 1)

	const sorted = sortByClicks([missing as Bookmark, clicked])

	assert.deepEqual(
		sorted.map(bookmark => bookmark.id),
		['clicked', 'missing'],
	)
})

test('sorting by clicks does not mutate the input array', () => {
	const bookmarks = [bookmark('first', oldest.updated_at, 1), bookmark('second', newest.updated_at, 9)]

	sortByClicks(bookmarks)

	assert.deepEqual(
		bookmarks.map(bookmark => bookmark.id),
		['first', 'second'],
	)
})
