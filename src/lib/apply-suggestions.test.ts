import assert from 'node:assert/strict'
import { test } from 'node:test'
import { applySuggestions } from './apply-suggestions.ts'

const suggestion = { tags: ['Dev', 'Astro'], notes: 'Suggested notes.' }

test('fills both fields when they are empty', () => {
	assert.deepEqual(applySuggestions({ tags: '', notes: '' }, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
})

test('replaces tags and notes when fields already have values', () => {
	assert.deepEqual(applySuggestions({ tags: 'Mine', notes: 'My notes.' }, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
})

test('replaces both fields independently', () => {
	assert.deepEqual(applySuggestions({ tags: '', notes: 'My notes.' }, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
	assert.deepEqual(applySuggestions({ tags: 'Mine', notes: '' }, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
})

test('normalizes suggested tags, ignoring case and duplicates', () => {
	assert.deepEqual(applySuggestions({ tags: '', notes: '' }, { tags: ['Dev', 'dev', ' Astro '], notes: '' }), {
		tags: 'dev, astro',
		notes: '',
	})
})

test('keeps the current tags when the suggestion has none', () => {
	assert.deepEqual(applySuggestions({ tags: ' Mine ,, Reading ', notes: '' }, { tags: [], notes: 'Notes.' }), {
		tags: 'mine, reading',
		notes: 'Notes.',
	})
})

test('keeps the current notes when the suggestion is blank', () => {
	assert.deepEqual(applySuggestions({ tags: '', notes: ' My notes. ' }, { tags: ['Dev'], notes: '\n\t' }), {
		tags: 'dev',
		notes: 'My notes.',
	})
})

test('treats whitespace-only current fields as empty', () => {
	assert.deepEqual(applySuggestions({ tags: '   ', notes: '\n\t' }, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
})

test('keeps existing values when the suggestion is empty', () => {
	assert.deepEqual(applySuggestions({ tags: 'Mine', notes: 'My notes.' }, { tags: [], notes: '' }), {
		tags: 'mine',
		notes: 'My notes.',
	})
})
