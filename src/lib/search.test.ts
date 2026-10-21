import assert from 'node:assert/strict'
import { test } from 'node:test'
import { escapeLike, hasStatementSeparator, isSqlQuery, searchTerms } from './search.ts'

test('detects a WHERE query case-insensitively and after leading whitespace', () => {
	assert.equal(isSqlQuery('WHERE category = \'Dev\''), true)
	assert.equal(isSqlQuery('  where title ILIKE \'%astro%\''), true)
})

test('does not treat other input as a SQL query', () => {
	assert.equal(isSqlQuery(''), false)
	assert.equal(isSqlQuery('   '), false)
	assert.equal(isSqlQuery('wherever'), false)
	assert.equal(isSqlQuery('select * from bookmarks'), false)
	assert.equal(isSqlQuery('category = \'Dev\''), false)
})

test('splits plain text on whitespace and drops empty terms', () => {
	assert.deepEqual(searchTerms(' astro   postgres\tdev '), ['astro', 'postgres', 'dev'])
	assert.deepEqual(searchTerms(''), [])
	assert.deepEqual(searchTerms('   '), [])
})

test('escapes LIKE wildcards and backslashes', () => {
	assert.equal(escapeLike('100%'), '100\\%')
	assert.equal(escapeLike('a_b'), 'a\\_b')
	assert.equal(escapeLike('c:\\temp'), 'c:\\\\temp')
	assert.equal(escapeLike('plain'), 'plain')
})

test('detects statement separators in custom queries', () => {
	assert.equal(hasStatementSeparator('WHERE title = \'x\'; DROP TABLE bookmarks'), true)
	assert.equal(hasStatementSeparator('WHERE title = \'x\''), false)
})
