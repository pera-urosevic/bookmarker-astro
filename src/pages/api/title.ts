import type { APIRoute } from 'astro'
import { fetchPageMetadata } from '../../lib/fetch-title'

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	})
}

function isHttpUrl(value: string): boolean {
	if (!URL.canParse(value)) return false
	const { protocol } = new URL(value)
	return protocol === 'http:' || protocol === 'https:'
}

export const GET: APIRoute = async ({ url }) => {
	const target = url.searchParams.get('url')?.trim() ?? ''
	if (!isHttpUrl(target)) {
		return json({ error: 'A valid http(s) url is required' }, 400)
	}

	try {
		return json(await fetchPageMetadata(target))
	} catch (error) {
		console.error('Fetch failed:', error)
		return json({ error: 'Fetch failed' }, 502)
	}
}

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405)
