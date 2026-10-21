import type { APIRoute } from 'astro'
import { getBookmarkFavicon } from '../../lib/bookmarks'

export const GET: APIRoute = async ({ params }) => {
	const id = params.id
	if (!id) return new Response(null, { status: 404 })

	const favicon = await getBookmarkFavicon(id)
	if (!favicon) return new Response(null, { status: 404 })

	return new Response(new Uint8Array(favicon), {
		headers: {
			'content-type': 'image/jpeg',
			'cache-control': 'public, max-age=86400, immutable',
		},
	})
}

export const ALL: APIRoute = () => new Response(null, { status: 405 })
