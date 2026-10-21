import type { APIRoute } from 'astro'
import { countBookmarks, searchBookmarks } from '../../lib/bookmarks'
import { SearchQueryError } from '../../lib/search'

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	})
}

export const GET: APIRoute = async ({ url }) => {
	const query = url.searchParams.get('q') ?? ''

	try {
		const [bookmarks, total] = await Promise.all([searchBookmarks(query), countBookmarks()])
		return json({ bookmarks, total })
	} catch (error) {
		if (error instanceof SearchQueryError) return json({ error: error.message }, 400)

		console.error('Bookmark search failed:', error)
		return json({ error: 'Could not search bookmarks' }, 500)
	}
}

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405)
