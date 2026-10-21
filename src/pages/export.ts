import type { APIRoute } from 'astro'
import { listBookmarks } from '../lib/bookmarks'
import { bookmarksToHtml } from '../lib/bookmarks-export'

export const GET: APIRoute = async () => {
	const now = new Date()
	const date = now.toISOString().slice(0, 10)

	return new Response(bookmarksToHtml(await listBookmarks(), now), {
		headers: {
			'Content-Type': 'text/html; charset=utf-8',
			'Content-Disposition': `attachment; filename="bookmarks-${date}.html"`,
		},
	})
}
