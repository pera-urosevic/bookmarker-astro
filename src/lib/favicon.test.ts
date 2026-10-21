import assert from 'node:assert/strict'
import { test } from 'node:test'
import { encodeIco } from 'icojs'
import sharp from 'sharp'
import { downloadFavicon, extractIconUrls, faviconServiceUrl, toFaviconJpeg, type FetchImpl } from './favicon.ts'

async function png(width = 128, height = 128): Promise<Buffer> {
	return sharp({
		create: {
			width,
			height,
			channels: 4,
			background: { r: 255, g: 0, b: 0, alpha: 0.5 },
		},
	})
		.png()
		.toBuffer()
}

function text(body: string, status = 200): Response {
	return new Response(body, { status, headers: { 'content-type': 'text/html' } })
}

test('faviconServiceUrl builds a Google favicon URL for http(s) pages', () => {
	assert.equal(
		faviconServiceUrl('https://example.com/some/page?x=1'),
		'https://www.google.com/s2/favicons?domain=example.com&sz=64',
	)
	assert.equal(
		faviconServiceUrl('http://sub.example.com:8080/'),
		'https://www.google.com/s2/favicons?domain=sub.example.com&sz=64',
	)
})

test('faviconServiceUrl rejects invalid and non-http URLs', () => {
	assert.equal(faviconServiceUrl('not a url'), null)
	assert.equal(faviconServiceUrl('ftp://example.com'), null)
})

test('toFaviconJpeg converts an image to a 64x64 JPEG', async () => {
	const output = await toFaviconJpeg(await png())
	const metadata = await sharp(output).metadata()

	assert.equal(metadata.format, 'jpeg')
	assert.equal(metadata.width, 64)
	assert.equal(metadata.height, 64)
})

async function ico(usePngIcon: boolean): Promise<Buffer> {
	return Buffer.from(await encodeIco([{ buffer: await png(), usePngIcon }]))
}

test('toFaviconJpeg converts a BMP-based ICO to a 64x64 JPEG', async () => {
	const output = await toFaviconJpeg(await ico(false))
	const metadata = await sharp(output).metadata()

	assert.equal(metadata.format, 'jpeg')
	assert.equal(metadata.width, 64)
	assert.equal(metadata.height, 64)
})

test('toFaviconJpeg converts a PNG-based ICO to a 64x64 JPEG', async () => {
	const output = await toFaviconJpeg(await ico(true))
	const metadata = await sharp(output).metadata()

	assert.equal(metadata.format, 'jpeg')
	assert.equal(metadata.width, 64)
	assert.equal(metadata.height, 64)
})

test('extractIconUrls resolves, filters, and dedupes declared icons', () => {
	const html = `
		<link rel="icon" href="/a.png">
		<link rel="shortcut icon" href="//cdn.example.com/b.ico">
		<link rel="apple-touch-icon" href="https://cdn.example.com/a.png">
		<link rel="mask-icon" href="/mask.svg">
		<link rel="stylesheet" href="/style.css">
		<link rel="icon" href="data:image/png;base64,abc">
		<link rel="icon" href="/a.png">
	`

	assert.deepEqual(extractIconUrls(html, 'https://example.com/page'), [
		'https://example.com/a.png',
		'https://cdn.example.com/b.ico',
		'https://cdn.example.com/a.png',
	])
})

test('downloadFavicon returns the Google service icon when available', async () => {
	const image = await png()
	const calls: string[] = []
	const fetchImpl: FetchImpl = async input => {
		calls.push(input)
		return new Response(new Uint8Array(image), { status: 200, headers: { 'content-type': 'image/png' } })
	}

	const output = await downloadFavicon('https://example.com', fetchImpl)

	assert.ok(output)
	assert.equal((await sharp(output).metadata()).format, 'jpeg')
	assert.deepEqual(calls, ['https://www.google.com/s2/favicons?domain=example.com&sz=64'])
})

test('downloadFavicon falls back to icons declared in the page', async () => {
	const image = await png()
	const calls: string[] = []
	const fetchImpl: FetchImpl = async input => {
		calls.push(input)

		if (input === 'https://www.google.com/s2/favicons?domain=example.com&sz=64') return text('nope', 404)
		if (input === 'https://example.com/page') return text('<link rel="shortcut icon" href="/logo.png">')
		if (input === 'https://example.com/logo.png') return new Response(new Uint8Array(image), { status: 200 })

		return text('nope', 404)
	}

	const output = await downloadFavicon('https://example.com/page', fetchImpl)

	assert.ok(output)
	assert.equal((await sharp(output).metadata()).format, 'jpeg')
	assert.deepEqual(calls, [
		'https://www.google.com/s2/favicons?domain=example.com&sz=64',
		'https://example.com/page',
		'https://example.com/logo.png',
	])
})

test('downloadFavicon tries the next declared icon when one fails', async () => {
	const image = await png()
	const calls: string[] = []
	const fetchImpl: FetchImpl = async input => {
		calls.push(input)

		if (input === 'https://example.com/page') {
			return text('<link rel="icon" href="/missing.png"><link rel="icon" href="/logo.png">')
		}
		if (input === 'https://example.com/logo.png') return new Response(new Uint8Array(image), { status: 200 })

		return text('nope', 404)
	}

	const output = await downloadFavicon('https://example.com/page', fetchImpl)

	assert.ok(output)
	assert.deepEqual(calls.slice(2), ['https://example.com/missing.png', 'https://example.com/logo.png'])
})

test('downloadFavicon falls back to /favicon.ico when the page cannot be read', async () => {
	const image = await png()
	const calls: string[] = []
	const fetchImpl: FetchImpl = async input => {
		calls.push(input)

		if (input === 'https://example.com/page') return text('nope', 500)
		if (input === 'https://example.com/favicon.ico') return new Response(new Uint8Array(image), { status: 200 })

		return text('nope', 404)
	}

	const output = await downloadFavicon('https://example.com/page', fetchImpl)

	assert.ok(output)
	assert.deepEqual(calls, [
		'https://www.google.com/s2/favicons?domain=example.com&sz=64',
		'https://example.com/page',
		'https://example.com/favicon.ico',
	])
})

test('downloadFavicon accepts an ICO served as the fallback icon', async () => {
	const image = await ico(false)
	const calls: string[] = []
	const fetchImpl: FetchImpl = async input => {
		calls.push(input)

		if (input === 'https://example.com/page') return text('nope', 500)
		if (input === 'https://example.com/favicon.ico') return new Response(new Uint8Array(image), { status: 200 })

		return text('nope', 404)
	}

	const output = await downloadFavicon('https://example.com/page', fetchImpl)

	assert.ok(output)
	assert.equal((await sharp(output).metadata()).format, 'jpeg')
	assert.deepEqual(calls.slice(2), ['https://example.com/favicon.ico'])
})

test('downloadFavicon falls back to /favicon.ico when the page declares no icons', async () => {
	const image = await png()
	const calls: string[] = []
	const fetchImpl: FetchImpl = async input => {
		calls.push(input)

		if (input === 'https://example.com/page') return text('<html><head><title>Example</title></head></html>')
		if (input === 'https://example.com/favicon.ico') return new Response(new Uint8Array(image), { status: 200 })

		return text('nope', 404)
	}

	const output = await downloadFavicon('https://example.com/page', fetchImpl)

	assert.ok(output)
	assert.deepEqual(calls.slice(2), ['https://example.com/favicon.ico'])
})

test('downloadFavicon returns null when Google and every fallback fail', async t => {
	t.mock.method(console, 'error', () => {})

	const calls: string[] = []
	const fetchImpl: FetchImpl = async input => {
		calls.push(input)
		return text('nope', 404)
	}

	assert.equal(await downloadFavicon('https://example.com/page', fetchImpl), null)
	assert.deepEqual(calls, [
		'https://www.google.com/s2/favicons?domain=example.com&sz=64',
		'https://example.com/page',
		'https://example.com/favicon.ico',
	])
})

test('downloadFavicon ignores non-image bodies', async t => {
	t.mock.method(console, 'error', () => {})

	const fetchImpl: FetchImpl = async input =>
		input === 'https://example.com/page' ? text('<html>nope</html>') : text('nope', 404)

	assert.equal(await downloadFavicon('https://example.com/page', fetchImpl), null)
})

test('downloadFavicon returns null for invalid and non-http URLs without fetching', async () => {
	let calls = 0
	const fetchImpl: FetchImpl = async () => {
		calls += 1
		return text('nope', 404)
	}

	assert.equal(await downloadFavicon('not a url', fetchImpl), null)
	assert.equal(await downloadFavicon('ftp://example.com', fetchImpl), null)
	assert.equal(calls, 0)
})
