import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Bookmark } from '../types'
import { bookmarkSearchText, formatVisibleCount, matchesQuery } from './filter.ts'

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
	return {
		id: 'id',
		url: 'https://example.com',
		title: 'Example',
		notes: '',
		category: '',
		tags: [],
		created_at: '2025-01-01T00:00:00.000Z',
		updated_at: '2025-01-01T00:00:00.000Z',
		...overrides,
	}
}

test('empty and whitespace queries match everything', () => {
	assert.equal(matchesQuery('anything', ''), true)
	assert.equal(matchesQuery('anything', '   '), true)
})

test('matches case-insensitively and ignores surrounding whitespace', () => {
	assert.equal(matchesQuery('Hello World', 'hello'), true)
	assert.equal(matchesQuery('Hello World', '  WORLD  '), true)
	assert.equal(matchesQuery('Hello World', 'goodbye'), false)
})

test('matches every word in any order', () => {
	const text = 'Example https://example.com/docs Reference material Dev Reading'

	assert.equal(matchesQuery(text, 'reading example'), true)
	assert.equal(matchesQuery(text, 'example missing'), false)
	assert.equal(matchesQuery(text, '  example   reading  '), true)
	assert.equal(matchesQuery(text, 'exam read'), true)
})

test('search text includes title, url, notes, and tags', () => {
	const text = bookmarkSearchText(
		bookmark({
			title: 'Example',
			url: 'https://example.com/docs',
			notes: 'Reference material',
			tags: ['Dev', 'Reading'],
		}),
	)

	assert.equal(matchesQuery(text, 'example.com/docs'), true)
	assert.equal(matchesQuery(text, 'reference'), true)
	assert.equal(matchesQuery(text, 'reading'), true)
	assert.equal(matchesQuery(text, 'missing'), false)
})

test('visible count reads as visible of total', () => {
	assert.equal(formatVisibleCount(12, 40), '12 of 40')
	assert.equal(formatVisibleCount(0, 40), '0 of 40')
})
