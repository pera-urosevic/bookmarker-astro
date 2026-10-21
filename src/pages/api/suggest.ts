import type { APIRoute } from 'astro'
import { suggestBookmark } from '../../lib/ollama-suggest'

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	})
}

export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null)
	if (!body || typeof body.url !== 'string' || !URL.canParse(body.url)) {
		return json({ error: 'A valid url is required' }, 400)
	}

	try {
		const title = typeof body.title === 'string' ? body.title : ''
		return json(await suggestBookmark(body.url, title))
	} catch (error) {
		console.error('Ollama suggestion failed:', error)
		return json({ error: 'Could not generate suggestions' }, 502)
	}
}

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405)
