import assert from 'node:assert/strict'
import { test } from 'node:test'
import { normalizeClicks, parseClicks } from './clicks.ts'

test('normalizeClicks accepts non-negative integers', () => {
	assert.equal(normalizeClicks(0), 0)
	assert.equal(normalizeClicks(12), 12)
})

test('normalizeClicks treats missing or invalid values as zero', () => {
	assert.equal(normalizeClicks(undefined), 0)
	assert.equal(normalizeClicks(null), 0)
	assert.equal(normalizeClicks(-1), 0)
	assert.equal(normalizeClicks(1.5), 0)
	assert.equal(normalizeClicks('3'), 0)
})

test('parseClicks reads a non-negative integer from form data', () => {
	assert.equal(parseClicks('0', 5), 0)
	assert.equal(parseClicks('12', 5), 12)
	assert.equal(parseClicks(' 7 ', 5), 7)
})

test('parseClicks falls back for blank or invalid input', () => {
	assert.equal(parseClicks('', 5), 5)
	assert.equal(parseClicks('   ', 5), 5)
	assert.equal(parseClicks(null, 5), 5)
	assert.equal(parseClicks('abc', 5), 5)
	assert.equal(parseClicks('-1', 5), 5)
	assert.equal(parseClicks('1.5', 5), 5)
})
