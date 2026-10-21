import assert from 'node:assert/strict'
import { test } from 'node:test'
import type { Bookmark } from '../types'
import { parseBookmarks } from './bookmarks-import.ts'
import { bookmarksToHtml } from './bookmarks-export.ts'

function bookmark(overrides: Partial<Bookmark> = {}): Bookmark {
	return {
		id: 'bookmark-id',
		url: 'https://example.com',
		title: 'Example',
		notes: '',
		category: '',
		tags: [],
		clicks: 0,
		created_at: '2025-01-01T00:00:00.000Z',
		updated_at: '2025-06-01T00:00:00.000Z',
		...overrides,
	}
}

test('exports an empty valid bookmarks file', () => {
	const html = bookmarksToHtml([])

	assert.match(html, /^<!DOCTYPE NETSCAPE-Bookmark-file-1>/)
	assert.match(html, /<DL><p>\n<\/DL><p>\n$/)
	assert.deepEqual(parseBookmarks(html), [])
})

test('exports URL, title, notes, and created date', () => {
	const html = bookmarksToHtml([bookmark({ notes: 'A description' })])

	assert.match(html, /<DT><A HREF="https:\/\/example\.com" ADD_DATE="1735689600">Example<\/A>/)
	assert.match(html, /<DD>A description/)
})

test('omits notes when they are blank', () => {
	const html = bookmarksToHtml([bookmark({ notes: '' })])

	assert.doesNotMatch(html, /<DD>/)
})

test('falls back to the URL when the title is blank', () => {
	const html = bookmarksToHtml([bookmark({ title: '' })])

	assert.match(html, />https:\/\/example\.com<\/A>/)
})

test('escapes HTML characters in every field', () => {
	const html = bookmarksToHtml([
		bookmark({
			url: 'https://example.com/?a=1&b="2"',
			title: '<script>alert("x")</script>',
			notes: 'a & b < c',
			category: '<dev>',
		}),
	])

	assert.doesNotMatch(html, /<script>/)
	assert.match(html, /&lt;script&gt;alert\(&quot;x&quot;\)&lt;\/script&gt;/)
	assert.match(html, /HREF="https:\/\/example\.com\/\?a=1&amp;b=&quot;2&quot;"/)
	assert.match(html, /<DD>a &amp; b &lt; c/)
	assert.match(html, /&lt;dev&gt;/)
})

test('nests category segments as folders', () => {
	const html = bookmarksToHtml([bookmark({ category: 'dev/tools' })])
	const parsed = parseBookmarks(html)

	assert.match(html, />dev<\/H3>/)
	assert.match(html, />tools<\/H3>/)
	assert.equal(parsed[0].category, 'dev/tools')
})

test('treats empty and repeated slashes as the root', () => {
	for (const category of ['', '/', '//', '/dev//tools/']) {
		const html = bookmarksToHtml([bookmark({ category })])
		const parsed = parseBookmarks(html)

		assert.equal(
			parsed[0].category,
			category === '/dev//tools/' ? 'dev/tools' : '',
		)
	}
})

test('lists folders before bookmarks and sorts both by title', () => {
	const html = bookmarksToHtml([
		bookmark({ url: 'https://example.com/b', title: 'banana' }),
		bookmark({ url: 'https://example.com/a', title: 'Apple' }),
		bookmark({ url: 'https://example.com/z', title: 'Zulu', category: 'zeta' }),
		bookmark({ url: 'https://example.com/y', title: 'Yankee', category: 'Alpha' }),
	])

	assert.ok(html.indexOf('>Apple</A>') < html.indexOf('>banana</A>'))
	assert.ok(html.indexOf('>Alpha</H3>') < html.indexOf('>zeta</H3>'))
	assert.ok(html.indexOf('>zeta</H3>') < html.indexOf('>Apple</A>'))
})

test('lists nested folders before bookmarks at every level', () => {
	const html = bookmarksToHtml([
		bookmark({ url: 'https://example.com/dev', title: 'DevBookmark', category: 'dev' }),
		bookmark({ url: 'https://example.com/tools', title: 'ToolsBookmark', category: 'dev/tools' }),
	])

	assert.ok(html.indexOf('>dev</H3>') < html.indexOf('>tools</H3>'))
	assert.ok(html.indexOf('>tools</H3>') < html.indexOf('>DevBookmark</A>'))
})

test('round-trips bookmarks through the importer', () => {
	const original = [
		bookmark({
			url: 'https://example.com/one',
			title: 'One & Only',
			notes: 'Notes with "quotes"',
			category: 'dev/tools',
		}),
		bookmark({
			url: 'https://example.com/two?a=1&b=2',
			title: 'Two <Three>',
			notes: '',
			category: 'dev',
		}),
		bookmark({ url: 'https://example.com/three', title: '', notes: 'Root note', category: '' }),
	]

	const parsed = parseBookmarks(bookmarksToHtml(original))
	const byUrl = (a: { url: string }, b: { url: string }) => a.url.localeCompare(b.url)

	assert.deepEqual(
		parsed.map(({ url, title, notes, category }) => ({ url, title, notes, category })).sort(byUrl),
		original
			.map(({ url, title, notes, category }) => ({
				url,
				title: title || url,
				notes,
				category,
			}))
			.sort(byUrl),
	)
})
