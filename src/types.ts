export interface Bookmark {
	id: string
	url: string
	title: string
	notes: string
	category: string
	tags: string[]
	clicks: number
	has_favicon?: boolean
	created_at: string
	updated_at: string
}
