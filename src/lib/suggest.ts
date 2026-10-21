import { normalizeTags } from './tags.ts'

export interface Suggestion {
	tags: string[]
	notes: string
}

export const SYSTEM_PROMPT = `You catalog bookmarks.
Suggest 3-6 short, reusable tags and 1-2 sentences to describe web page of this url.
Do not start description with "This ..." and similar, start immediately with description.
Use the web_search tool when the URL and title are not enough.
Reply with JSON only: {"tags": string[], "description": string}.`

export function buildPrompt(url: string, title: string): string {
	const lines = [`URL: ${url.trim()}`]
	if (title.trim()) lines.push(`Title: ${title.trim()}`)
	return lines.join('\n')
}

export function parseSuggestions(raw: string): Suggestion {
	try {
		const parsed: unknown = JSON.parse(raw)
		if (typeof parsed !== 'object' || parsed === null) return { tags: [], notes: '' }

		const { tags, description } = parsed as Record<string, unknown>
		return {
			tags: normalizeTags(tags),
			notes: typeof description === 'string' ? description.trim() : '',
		}
	} catch {
		return { tags: [], notes: '' }
	}
}
