import type { APIRoute } from 'astro'
import { incrementBookmarkClicks } from '../../lib/bookmarks'

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	})
}

export const POST: APIRoute = async ({ request }) => {
	const body = await request.json().catch(() => null)
	if (!body || typeof body.id !== 'string' || body.id.trim() === '') {
		return json({ error: 'A bookmark id is required' }, 400)
	}

	try {
		const bookmark = await incrementBookmarkClicks(body.id)
		if (!bookmark) return json({ error: 'Bookmark not found' }, 404)
		return json(bookmark)
	} catch {
		return json({ error: 'Could not save clicks' }, 500)
	}
}

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405)
