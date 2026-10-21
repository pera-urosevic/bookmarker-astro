import assert from 'node:assert/strict'
import { test } from 'node:test'
import { nextCursor } from './navigation.ts'

test('no selection: down selects the first item and up the last', () => {
	assert.equal(nextCursor(-1, 'down', 3), 0)
	assert.equal(nextCursor(-1, 'up', 3), 2)
})

test('moves one item at a time', () => {
	assert.equal(nextCursor(0, 'down', 3), 1)
	assert.equal(nextCursor(2, 'up', 3), 1)
})

test('stops at the ends instead of wrapping', () => {
	assert.equal(nextCursor(2, 'down', 3), 2)
	assert.equal(nextCursor(0, 'up', 3), 0)
})

test('a list with no items has no cursor', () => {
	assert.equal(nextCursor(-1, 'down', 0), -1)
	assert.equal(nextCursor(0, 'up', 0), -1)
})

test('an out-of-range cursor behaves like no selection', () => {
	assert.equal(nextCursor(5, 'down', 3), 0)
	assert.equal(nextCursor(5, 'up', 3), 2)
})
