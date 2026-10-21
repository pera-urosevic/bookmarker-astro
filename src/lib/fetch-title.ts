import { parse, type HTMLElement } from 'node-html-parser'

const MAX_BODY_BYTES = 2_000_000
const TIMEOUT_MS = 5_000
const USER_AGENT = 'Mozilla/5.0 (compatible; Bookmarker/1.0)'

const DESCRIPTION_META = [
	['property', 'og:description'],
	['name', 'og:description'],
	['name', 'description'],
	['name', 'twitter:description'],
	['property', 'twitter:description'],
] as const

export interface PageMetadata {
	title: string
	description: string
}

function normalize(value: string): string {
	return value.replace(/\s+/g, ' ').trim()
}

function findMetaContent(root: HTMLElement, candidates: ReadonlyArray<readonly [string, string]>): string {
	for (const [attribute, value] of candidates) {
		for (const meta of root.querySelectorAll('meta')) {
			if (meta.getAttribute(attribute)?.trim().toLowerCase() !== value) continue

			const content = normalize(meta.getAttribute('content') ?? '')
			if (content) return content
		}
	}

	return ''
}

/** Returns the trimmed title and the first matching meta description from an HTML document. */
export function extractMetadata(html: string): PageMetadata {
	const root = parse(html)

	return {
		title: normalize(root.querySelector('title')?.text ?? ''),
		description: findMetaContent(root, DESCRIPTION_META),
	}
}

/** Returns the trimmed, whitespace-collapsed contents of the first `<title>` tag. */
export function extractTitle(html: string): string {
	return extractMetadata(html).title
}

/** Returns the first non-empty OG, standard, or Twitter meta description. */
export function extractDescription(html: string): string {
	return extractMetadata(html).description
}

/** Fetches an http(s) page and returns its title and meta description. */
export async function fetchPageMetadata(url: string): Promise<PageMetadata> {
	const target = new URL(url)
	if (target.protocol !== 'http:' && target.protocol !== 'https:') {
		throw new Error('Only http(s) URLs are supported')
	}

	const response = await fetch(target, {
		redirect: 'follow',
		headers: {
			accept: 'text/html,application/xhtml+xml',
			'user-agent': USER_AGENT,
		},
		signal: AbortSignal.timeout(TIMEOUT_MS),
	})

	if (!response.ok) throw new Error(`Request failed: ${response.status}`)

	const contentLength = Number(response.headers.get('content-length') ?? 0)
	if (contentLength > MAX_BODY_BYTES) throw new Error('Page is too large')

	const html = await response.text()
	if (html.length > MAX_BODY_BYTES) throw new Error('Page is too large')

	return extractMetadata(html)
}
