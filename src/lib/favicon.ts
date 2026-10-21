import { decodeIco, isIco } from 'icojs'
import { parse } from 'node-html-parser'
import sharp from 'sharp'

const SERVICE_URL = 'https://www.google.com/s2/favicons'
const TIMEOUT_MS = 5_000
const MAX_BODY_BYTES = 512_000
const MAX_HTML_BYTES = 2_000_000
const MAX_ICON_LINKS = 3
const USER_AGENT = 'Mozilla/5.0 (compatible; Bookmarker/1.0)'

export type FetchImpl = (input: string, init?: RequestInit) => Promise<Response>

/** Returns the Google favicon service URL for an http(s) page, or null for any other URL. */
export function faviconServiceUrl(pageUrl: string): string | null {
	if (!URL.canParse(pageUrl)) return null

	const target = new URL(pageUrl)
	if (target.protocol !== 'http:' && target.protocol !== 'https:') return null

	const params = new URLSearchParams({ domain: target.hostname, sz: '64' })
	return `${SERVICE_URL}?${params}`
}

/** Converts an ICO to its largest embedded image; other formats pass through unchanged. */
async function decodeIcoImage(input: Buffer): Promise<Buffer> {
	if (input.length < 4 || !isIco(input)) return input

	const images = await decodeIco(input)
	const largest = images.reduce<(typeof images)[number] | null>(
		(best, image) => (!best || image.width * image.height > best.width * best.height ? image : best),
		null,
	)
	if (!largest) throw new Error('ICO contains no images')

	return Buffer.from(largest.buffer)
}

/** Converts any supported image, including ICO, to a 64×64 JPEG at quality 70. */
export async function toFaviconJpeg(input: Buffer | Uint8Array): Promise<Buffer> {
	const image = await decodeIcoImage(Buffer.from(input))
	const jpeg = sharp(image)
		.resize(64, 64, { fit: 'contain', background: '#ffffff' })
		.flatten({ background: '#ffffff' })
		.jpeg({ quality: 70 })
		.toBuffer()
	return jpeg
}

/** Returns the http(s) icon URLs declared by link tags, resolved against the page URL. */
export function extractIconUrls(html: string, pageUrl: string): string[] {
	const base = new URL(pageUrl)
	const urls: string[] = []

	for (const link of parse(html).querySelectorAll('link')) {
		const rels = (link.getAttribute('rel') ?? '').toLowerCase().split(/\s+/)
		const isIcon = rels.includes('icon') || rels.some(rel => rel.startsWith('apple-touch-icon'))
		if (!isIcon) continue

		const href = link.getAttribute('href')?.trim()
		if (!href) continue

		try {
			const url = new URL(href, base)
			if (url.protocol !== 'http:' && url.protocol !== 'https:') continue

			const resolved = url.toString()
			if (!urls.includes(resolved)) urls.push(resolved)
		} catch {
			// Ignore malformed hrefs.
		}
	}

	return urls
}

async function fetchPageHtml(pageUrl: string, fetchImpl: FetchImpl): Promise<string | null> {
	try {
		const response = await fetchImpl(pageUrl, {
			redirect: 'follow',
			headers: { 'accept': 'text/html,application/xhtml+xml', 'user-agent': USER_AGENT },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})

		if (!response.ok) return null

		const contentLength = Number(response.headers.get('content-length') ?? 0)
		if (contentLength > MAX_HTML_BYTES) return null

		const html = await response.text()
		return html.length > MAX_HTML_BYTES ? null : html
	} catch {
		return null
	}
}

async function fallbackIconUrls(pageUrl: string, fetchImpl: FetchImpl): Promise<string[]> {
	const html = await fetchPageHtml(pageUrl, fetchImpl)
	const declared = html ? extractIconUrls(html, pageUrl).slice(0, MAX_ICON_LINKS) : []
	const origin = new URL(pageUrl).origin

	return [...new Set([...declared, `${origin}/favicon.ico`])]
}

async function fetchFaviconImage(url: string, fetchImpl: FetchImpl): Promise<Buffer | null> {
	try {
		const response = await fetchImpl(url, {
			redirect: 'follow',
			headers: { 'accept': 'image/*', 'user-agent': USER_AGENT },
			signal: AbortSignal.timeout(TIMEOUT_MS),
		})

		if (!response.ok) return null

		const contentLength = Number(response.headers.get('content-length') ?? 0)
		if (contentLength > MAX_BODY_BYTES) return null

		const body = Buffer.from(await response.arrayBuffer())
		if (body.length === 0 || body.length > MAX_BODY_BYTES) return null

		return await toFaviconJpeg(body)
	} catch {
		return null
	}
}

/** Downloads and converts a page's favicon, falling back to the site's own icons. Returns null instead of throwing. */
export async function downloadFavicon(pageUrl: string, fetchImpl: FetchImpl = fetch): Promise<Buffer | null> {
	const serviceUrl = faviconServiceUrl(pageUrl)
	if (!serviceUrl) return null

	try {
		const serviceIcon = await fetchFaviconImage(serviceUrl, fetchImpl)
		if (serviceIcon) return serviceIcon

		for (const iconUrl of await fallbackIconUrls(pageUrl, fetchImpl)) {
			const icon = await fetchFaviconImage(iconUrl, fetchImpl)
			if (icon) return icon
		}
	} catch (error) {
		console.error(`Favicon download failed for ${pageUrl}:`, error instanceof Error ? error.message : error)
		return null
	}

	console.error(`Favicon download failed for ${pageUrl}: no usable icon found`)
	return null
}
