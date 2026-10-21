import { v7 as uuidv7 } from 'uuid'
import type { Bookmark } from '../types'
import { getSql } from './db.ts'
import { SearchQueryError, escapeLike, hasStatementSeparator, isSqlQuery, searchTerms } from './search.ts'

export type NewBookmark = Omit<Bookmark, 'id' | 'clicks' | 'created_at' | 'updated_at'>
export type BookmarkInput = NewBookmark & { clicks: number }

interface BookmarkRow {
	id: string
	url: string
	title: string
	notes: string
	category: string
	tags: string[]
	clicks: number
	created_at: Date
	updated_at: Date
}

export function rowToBookmark(row: BookmarkRow): Bookmark {
	return {
		id: row.id,
		url: row.url,
		title: row.title,
		notes: row.notes,
		category: row.category,
		tags: row.tags,
		clicks: row.clicks,
		created_at: row.created_at.toISOString(),
		updated_at: row.updated_at.toISOString(),
	}
}

export async function listBookmarks(): Promise<Bookmark[]> {
	const rows = await getSql()<BookmarkRow[]>`SELECT * FROM bookmarks ORDER BY updated_at DESC, id`
	return rows.map(rowToBookmark)
}

export async function countBookmarks(): Promise<number> {
	const rows = await getSql()<{ count: number }[]>`SELECT count(*)::int AS count FROM bookmarks`
	return rows[0]?.count ?? 0
}

export async function searchBookmarks(query: string): Promise<Bookmark[]> {
	const input = query.trim()
	if (!input) {
		const rows = await getSql()<BookmarkRow[]>`SELECT * FROM bookmarks ORDER BY RANDOM() LIMIT 10`
		return rows.map(rowToBookmark)
	}

	if (isSqlQuery(input)) {
		if (hasStatementSeparator(input)) {
			throw new SearchQueryError('Custom SQL must be a single statement')
		}

		const sql = getSql()
		try {
			const rows = await sql.unsafe<BookmarkRow[]>(`SELECT * FROM bookmarks ${input}`)
			return rows.map(rowToBookmark)
		} catch (error) {
			if (error instanceof sql.PostgresError) throw new SearchQueryError(error.message)
			throw error
		}
	}

	const sql = getSql()
	const conditions = searchTerms(input).map(term => {
		const pattern = `%${escapeLike(term)}%`
		return sql`(
			title ILIKE ${pattern}
			OR category ILIKE ${pattern}
			OR notes ILIKE ${pattern}
			OR url ILIKE ${pattern}
			OR array_to_string(tags, ' ') ILIKE ${pattern}
		)`
	})
	const where = conditions.reduce((all, condition) => sql`${all} AND ${condition}`)

	const rows = await sql<BookmarkRow[]>`
		SELECT * FROM bookmarks
		WHERE ${where}
		ORDER BY clicks DESC, title ASC, id
	`

	return rows.map(rowToBookmark)
}

export async function getBookmark(id: string): Promise<Bookmark | null> {
	const rows = await getSql()<BookmarkRow[]>`SELECT * FROM bookmarks WHERE id = ${id}`
	return rows[0] ? rowToBookmark(rows[0]) : null
}

export async function createBookmark(input: NewBookmark): Promise<Bookmark> {
	const id = uuidv7()
	const now = new Date().toISOString()

	const rows = await getSql()<BookmarkRow[]>`
		INSERT INTO bookmarks (id, url, title, notes, category, tags, clicks, created_at, updated_at)
		VALUES (${id}, ${input.url}, ${input.title}, ${input.notes}, ${input.category}, ${input.tags}, 0, ${now}, ${now})
		RETURNING *
	`

	return rowToBookmark(rows[0])
}

export async function updateBookmark(id: string, input: BookmarkInput): Promise<Bookmark | null> {
	const rows = await getSql()<BookmarkRow[]>`
		UPDATE bookmarks
		SET url = ${input.url},
			title = ${input.title},
			notes = ${input.notes},
			category = ${input.category},
			tags = ${input.tags},
			clicks = ${input.clicks},
			updated_at = ${new Date().toISOString()}
		WHERE id = ${id}
		RETURNING *
	`

	return rows[0] ? rowToBookmark(rows[0]) : null
}

export async function upsertBookmarks(bookmarks: Bookmark[]): Promise<void> {
	if (bookmarks.length === 0) return

	await getSql().begin(async tx => {
		await tx`
			INSERT INTO bookmarks ${tx(
				bookmarks,
				'id',
				'url',
				'title',
				'notes',
				'category',
				'tags',
				'clicks',
				'created_at',
				'updated_at',
			)}
			ON CONFLICT (id) DO UPDATE SET
				url = EXCLUDED.url,
				title = EXCLUDED.title,
				notes = EXCLUDED.notes,
				category = EXCLUDED.category,
				tags = EXCLUDED.tags,
				clicks = EXCLUDED.clicks,
				updated_at = EXCLUDED.updated_at
		`
	})
}

export async function deleteBookmark(id: string): Promise<boolean> {
	const rows = await getSql()`DELETE FROM bookmarks WHERE id = ${id} RETURNING id`
	return rows.length > 0
}

export async function incrementBookmarkClicks(id: string): Promise<{ id: string; clicks: number } | null> {
	const rows = await getSql()<{ id: string; clicks: number }[]>`
		UPDATE bookmarks SET clicks = clicks + 1 WHERE id = ${id} RETURNING id, clicks
	`

	return rows[0] ?? null
}
