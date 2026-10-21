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

test('keeps both fields when they already have values', () => {
	assert.deepEqual(applySuggestions({ tags: 'Mine', notes: 'My notes.' }, suggestion), {
		tags: 'Mine',
		notes: 'My notes.',
	})
})

test('fills only the empty field', () => {
	assert.deepEqual(applySuggestions({ tags: '', notes: 'My notes.' }, suggestion), {
		tags: 'dev, astro',
		notes: 'My notes.',
	})
	assert.deepEqual(applySuggestions({ tags: 'Mine', notes: '' }, suggestion), {
		tags: 'Mine',
		notes: 'Suggested notes.',
	})
})

test('preserves current values exactly as typed', () => {
	assert.deepEqual(applySuggestions({ tags: ' Mine ,, Reading ', notes: '  My notes.\n' }, suggestion), {
		tags: ' Mine ,, Reading ',
		notes: '  My notes.\n',
	})
})

test('normalizes suggested tags, ignoring case and duplicates', () => {
	assert.deepEqual(applySuggestions({ tags: '', notes: '' }, { tags: ['Dev', 'dev', ' Astro '], notes: '' }), {
		tags: 'dev, astro',
		notes: '',
	})
})

test('treats whitespace-only current fields as empty', () => {
	assert.deepEqual(applySuggestions({ tags: '   ', notes: '\n\t' }, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
})

test('treats null and undefined current fields as empty', () => {
	assert.deepEqual(applySuggestions({ tags: null, notes: undefined }, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
	assert.deepEqual(applySuggestions({}, suggestion), {
		tags: 'dev, astro',
		notes: 'Suggested notes.',
	})
})

test('leaves empty fields empty when the suggestion is empty', () => {
	assert.deepEqual(applySuggestions({ tags: '', notes: '' }, { tags: [], notes: '' }), {
		tags: '',
		notes: '',
	})
})
