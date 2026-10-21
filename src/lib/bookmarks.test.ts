import assert from 'node:assert/strict'
import { test } from 'node:test'
import { rowToBookmark } from './bookmarks.ts'

const row = {
	id: '0192f0c0-0000-7000-8000-000000000000',
	url: 'https://example.com',
	title: 'Example',
	notes: 'Some notes',
	category: 'Dev/Reading',
	tags: ['typescript', 'astro'],
	clicks: 7,
	created_at: new Date('2025-01-01T00:00:00.000Z'),
	updated_at: new Date('2025-02-02T12:34:56.789Z'),
}

test('rowToBookmark converts timestamps to ISO strings', () => {
	const bookmark = rowToBookmark(row)

	assert.equal(bookmark.created_at, '2025-01-01T00:00:00.000Z')
	assert.equal(bookmark.updated_at, '2025-02-02T12:34:56.789Z')
})

test('rowToBookmark copies the remaining columns', () => {
	const bookmark = rowToBookmark(row)

	assert.deepEqual(bookmark, {
		id: row.id,
		url: row.url,
		title: row.title,
		notes: row.notes,
		category: row.category,
		tags: ['typescript', 'astro'],
		clicks: 7,
		created_at: '2025-01-01T00:00:00.000Z',
		updated_at: '2025-02-02T12:34:56.789Z',
	})
})

test('rowToBookmark keeps an empty tag list', () => {
	assert.deepEqual(rowToBookmark({ ...row, tags: [] }).tags, [])
})
