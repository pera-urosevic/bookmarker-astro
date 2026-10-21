import assert from 'node:assert/strict'
import { test } from 'node:test'
import { extractDescription, extractTitle, fetchPageMetadata } from './fetch-title.ts'

test('extractTitle returns the page title', () => {
	assert.equal(extractTitle('<html><head><title>Example Site</title></head></html>'), 'Example Site')
})

test('extractTitle decodes HTML entities', () => {
	assert.equal(
		extractTitle('<title>Fish &amp; Chips &quot;x&quot; &#39;y&#39;</title>'),
		'Fish & Chips "x" \'y\'',
	)
})

test('extractTitle collapses repeated whitespace and newlines', () => {
	assert.equal(
		extractTitle('<title>\n  A   long\n\t title  </title>'),
		'A long title',
	)
})

test('extractTitle returns an empty string when there is no title', () => {
	assert.equal(extractTitle('<html><head></head><body>No title</body></html>'), '')
	assert.equal(extractTitle(''), '')
})

test('extractTitle returns an empty string for an empty title tag', () => {
	assert.equal(extractTitle('<title>   </title>'), '')
})

test('extractTitle uses the first title tag', () => {
	assert.equal(extractTitle('<title>First</title><title>Second</title>'), 'First')
})

test('extractTitle works without a head element', () => {
	assert.equal(extractTitle('<title>Bare</title><body>Content</body>'), 'Bare')
})

test('extractDescription prefers og:description', () => {
	const html = `
		<meta property="og:description" content="Open Graph">
		<meta name="description" content="Regular">
		<meta name="twitter:description" content="Twitter">
	`

	assert.equal(extractDescription(html), 'Open Graph')
})

test('extractDescription accepts og:description in the name attribute', () => {
	assert.equal(extractDescription('<meta name="og:description" content="Open Graph">'), 'Open Graph')
})

test('extractDescription falls back to the standard meta description', () => {
	const html = `
		<meta name="description" content="Regular">
		<meta name="twitter:description" content="Twitter">
	`

	assert.equal(extractDescription(html), 'Regular')
})

test('extractDescription falls back to twitter:description', () => {
	assert.equal(extractDescription('<meta name="twitter:description" content="Twitter">'), 'Twitter')
})

test('extractDescription skips empty higher-priority values', () => {
	const html = `
		<meta property="og:description" content="   ">
		<meta name="description" content="Regular">
	`

	assert.equal(extractDescription(html), 'Regular')
})

test('extractDescription matches meta attribute values case-insensitively', () => {
	assert.equal(extractDescription('<meta property="OG:DESCRIPTION" content="Open Graph">'), 'Open Graph')
})

test('extractDescription decodes entities and collapses whitespace', () => {
	assert.equal(
		extractDescription('<meta name="description" content="  A &amp; B   C  ">'),
		'A & B C',
	)
})

test('extractDescription returns an empty string when there is no description', () => {
	assert.equal(extractDescription('<html><head><title>No description</title></head></html>'), '')
	assert.equal(extractDescription(''), '')
})

test('extractDescription returns an empty string for an empty description', () => {
	assert.equal(extractDescription('<meta name="description" content="   ">'), '')
})

test('fetchPageMetadata rejects non-http(s) URLs', async () => {
	await assert.rejects(fetchPageMetadata('file:///etc/passwd'), /Only http\(s\) URLs are supported/)
})
