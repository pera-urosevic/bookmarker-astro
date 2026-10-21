import assert from 'node:assert/strict'
import { test } from 'node:test'
import { webSearch } from './web-search.ts'

test('returns the DuckDuckGo abstract text', async () => {
	const fetcher = async () => new Response(JSON.stringify({ AbstractText: ' An answer ' }))
	assert.equal(await webSearch('astro', fetcher), 'An answer')
})

test('returns a fallback when there is no abstract', async () => {
	const fetcher = async () => new Response(JSON.stringify({}))
	assert.equal(await webSearch('astro', fetcher), 'No results found.')
})

test('returns a fallback when the request fails', async () => {
	const fetcher = async () => {
		throw new Error('offline')
	}
	assert.equal(await webSearch('astro', fetcher), 'No results found.')
})

test('does not fetch an empty query', async () => {
	const fetcher = async () => {
		throw new Error('should not be called')
	}
	assert.equal(await webSearch('   ', fetcher), 'No results found.')
})
