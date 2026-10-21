import assert from 'node:assert/strict'
import { test } from 'node:test'
import { parseSuggestions } from './suggest.ts'

test('parseSuggestions reads lowercased, de-duplicated tags and notes from JSON', () => {
	assert.deepEqual(parseSuggestions('{"tags": ["Dev", "dev", " Astro "], "notes": " Useful docs. "}'), {
		tags: ['dev', 'astro'],
		notes: 'Useful docs.',
	})
})

test('parseSuggestions tolerates missing fields', () => {
	assert.deepEqual(parseSuggestions('{"tags": ["Dev"]}'), { tags: ['dev'], notes: '' })
	assert.deepEqual(parseSuggestions('{"notes": "Only notes."}'), { tags: [], notes: 'Only notes.' })
	assert.deepEqual(parseSuggestions('{"tags": "Dev", "notes": 42}'), { tags: [], notes: '' })
})

test('parseSuggestions falls back to empty values for malformed output', () => {
	assert.deepEqual(parseSuggestions('not json'), { tags: [], notes: '' })
	assert.deepEqual(parseSuggestions('null'), { tags: [], notes: '' })
})
