const NO_RESULTS = 'No results found.'
const SEARCH_URL = 'https://api.duckduckgo.com/'
const TIMEOUT_MS = 8000

type Fetcher = (input: string | URL, init?: RequestInit) => Promise<Response>

/**
 * Looks up a query with DuckDuckGo's Instant Answer API.
 * Returns the abstract text, or a friendly message when nothing is found.
 */
export async function webSearch(query: string, fetcher: Fetcher = fetch): Promise<string> {
	if (!query.trim()) return NO_RESULTS

	const url = new URL(SEARCH_URL)
	url.searchParams.set('q', query)
	url.searchParams.set('format', 'json')

	try {
		const response = await fetcher(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
		if (!response.ok) return NO_RESULTS
		const data = (await response.json()) as { AbstractText?: string }
		return data.AbstractText?.trim() || NO_RESULTS
	} catch {
		return NO_RESULTS
	}
}
