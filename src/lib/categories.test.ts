import assert from 'node:assert/strict'
import { test } from 'node:test'
import { filterCategories } from './categories.ts'

const categories = ['Bookmarks/Food', 'Shopping', 'Bookmarks/Games']

test('an empty query returns every category unchanged', () => {
	assert.deepEqual(filterCategories(categories, ''), categories)
	assert.deepEqual(filterCategories(categories, '   '), categories)
})

test('filters case-insensitively on any part of the category', () => {
	assert.deepEqual(filterCategories(categories, 'food'), ['Bookmarks/Food'])
	assert.deepEqual(filterCategories(categories, 'BOOKMARKS'), ['Bookmarks/Food', 'Bookmarks/Games'])
})

test('trims the query and returns an empty list when nothing matches', () => {
	assert.deepEqual(filterCategories(categories, ' shopping '), ['Shopping'])
	assert.deepEqual(filterCategories(categories, 'missing'), [])
})
