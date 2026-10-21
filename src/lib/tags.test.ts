import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeTags, parseTags } from './tags.ts'

test('normalizeTags trims, lowercases, drops empties, and de-duplicates', () => {
	assert.deepEqual(normalizeTags([' Dev ', 'dev', 'ASTRO', '', 42]), ['dev', 'astro'])
})

test('normalizeTags returns an empty list for non-arrays', () => {
	assert.deepEqual(normalizeTags('dev'), [])
	assert.deepEqual(normalizeTags(undefined), [])
})

test('parseTags splits comma-separated input into lowercase tags', () => {
	assert.deepEqual(parseTags(' Dev, Astro ,, dev '), ['dev', 'astro'])
	assert.deepEqual(parseTags(''), [])
})
