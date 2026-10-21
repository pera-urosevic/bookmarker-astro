import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import type { Bookmark } from '../types'
import { mergeBookmarks, parseBookmarks } from './bookmarks-import.ts'

const fixture = readFileSync(
	new URL('../../fixtures/sample-bookmarks.html', import.meta.url),
	'utf8',
)

const now = '2026-01-01T00:00:00.000Z'

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
	return {
		id: 'existing-id',
		url: 'https://example.com',
		title: 'Example',
		notes: '',
		category: '',
		tags: ['stored'],
		clicks: 0,
		created_at: '2025-01-01T00:00:00.000Z',
		updated_at: '2025-01-01T00:00:00.000Z',
		...overrides,
	}
}

test('parses the Netscape bookmark fixture', () => {
	const parsed = parseBookmarks(fixture)

	assert.deepEqual(
		parsed.map(({ url, title, notes, category }) => ({ url, title, notes, category })),
		[
			{
				url: 'https://example.com',
				title: 'Example Site',
				notes: 'This is a description',
				category: '',
			},
			{
				url: 'https://github.com',
				title: 'GitHub',
				notes: '',
				category: 'Dev',
			},
			{
				url: 'https://nodejs.org',
				title: 'Node.js',
				notes: 'JavaScript runtime',
				category: 'Dev',
			},
			{
				url: 'https://news.ycombinator.com',
				title: 'Hacker News',
				notes: '',
				category: '',
			},
		],
	)
})

test('builds the category from nested folders, excluding browser containers', () => {
	const parsed = parseBookmarks(`
		<DL><p>
			<DT><H3>Bookmarks Bar</H3>
			<DL><p>
				<DT><H3>Programming</H3>
				<DL><p>
					<DT><H3>Frontend</H3>
					<DL><p>
						<DT><H3>React</H3>
						<DL><p>
							<DT><A HREF="https://react.dev">React</A>
						</DL><p>
					</DL><p>
				</DL><p>
			</DL><p>
		</DL><p>
	`)

	assert.equal(parsed[0].category, 'Programming/Frontend/React')
})

test('ignores anchors without a URL and non-bookmark HTML', () => {
	assert.deepEqual(parseBookmarks('<a>No href</a><a href=" ">Blank</a>'), [])
	assert.deepEqual(parseBookmarks('<p>Hello</p>'), [])
})

test('imports new bookmarks with a review marker and merges duplicate URLs', () => {
	const result = mergeBookmarks(
		[],
		[
			{ url: 'https://a.test', title: 'A', notes: '', category: 'Dev' },
			{ url: 'https://a.test', title: 'A again', notes: 'Note', category: 'Programming' },
		],
		now,
	)

	assert.equal(result.bookmarks.length, 1)
	assert.equal(result.imported.length, 1)
	assert.equal(result.bookmarks[0].url, 'https://a.test')
	assert.equal(result.bookmarks[0].title, 'A')
	// '#TODO#' is the intentional review marker for fresh imports; later duplicates do not replace it.
	assert.equal(result.bookmarks[0].notes, '#TODO#')
	assert.equal(result.bookmarks[0].category, 'Dev')
	assert.deepEqual(result.bookmarks[0].tags, [])
	assert.equal(result.bookmarks[0].clicks, 0)
	assert.equal(result.bookmarks[0].created_at, now)
	assert.match(result.bookmarks[0].id, /^[0-9a-f-]{36}$/)
})

test('fills blank fields and preserves identity', () => {
	const existing = bookmark({ clicks: 7, category: 'finance' })
	const result = mergeBookmarks(
		[existing],
		[
			{
				url: 'https://example.com',
				title: 'Imported title',
				notes: 'Imported note',
				category: 'Programming',
			},
		],
		now,
	)

	assert.equal(result.updated.length, 1)
	assert.equal(result.imported.length, 0)
	assert.equal(result.skipped.length, 0)
	assert.equal(result.bookmarks[0].id, existing.id)
	assert.equal(result.bookmarks[0].created_at, existing.created_at)
	assert.equal(result.bookmarks[0].clicks, existing.clicks)
	assert.equal(result.bookmarks[0].title, existing.title)
	assert.equal(result.bookmarks[0].notes, 'Imported note')
	assert.equal(result.bookmarks[0].category, 'finance')
	assert.deepEqual(result.bookmarks[0].tags, ['stored'])
	assert.equal(result.bookmarks[0].updated_at, now)
	assert.equal(existing.notes, '')
})

test('fills an empty category from the folder hierarchy', () => {
	const existing = bookmark({ notes: 'Stored note' })
	const result = mergeBookmarks(
		[existing],
		[
			{
				url: 'https://example.com',
				title: 'Example',
				notes: '',
				category: 'Programming/Frontend/React',
			},
		],
		now,
	)

	assert.equal(result.updated.length, 1)
	assert.equal(result.bookmarks[0].category, 'Programming/Frontend/React')
	assert.equal(result.bookmarks[0].updated_at, now)
})

test('keeps an existing category', () => {
	const existing = bookmark({ category: 'Manual', notes: 'Stored note' })
	const result = mergeBookmarks(
		[existing],
		[{ url: 'https://example.com', title: 'Example', notes: '', category: 'Programming' }],
		now,
	)

	assert.equal(result.updated.length, 0)
	assert.equal(result.skipped.length, 1)
	assert.equal(result.bookmarks[0].category, 'Manual')
})

test('defaults the category of legacy bookmarks to an empty string', () => {
	const legacy = bookmark()
	delete (legacy as Partial<Bookmark>).category

	const result = mergeBookmarks([legacy], [], now)

	assert.equal(result.bookmarks[0].category, '')
})

test('skips existing bookmarks when there is nothing to change', () => {
	const existing = bookmark({ notes: 'Stored note', tags: ['stored'] })
	const result = mergeBookmarks(
		[existing],
		[
			{
				url: 'https://example.com',
				title: 'Ignored title',
				notes: 'Ignored note',
				category: '',
			},
		],
		now,
	)

	assert.equal(result.skipped.length, 1)
	assert.equal(result.updated.length, 0)
	assert.equal(result.bookmarks[0].updated_at, existing.updated_at)
})
