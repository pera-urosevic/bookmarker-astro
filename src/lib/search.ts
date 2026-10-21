/** True when the trimmed input starts with the SQL keyword WHERE. */
export function isSqlQuery(input: string): boolean {
	return /^where\b/i.test(input.trim())
}

/** Splits a plain-text query into its non-empty whitespace-separated terms. */
export function searchTerms(input: string): string[] {
	return input.trim().split(/\s+/).filter(Boolean)
}

/** Escapes LIKE wildcards so a term is matched as literal text. */
export function escapeLike(term: string): string {
	return term.replace(/[\\%_]/g, character => `\\${character}`)
}

/** True when a custom query contains a statement separator. */
export function hasStatementSeparator(input: string): boolean {
	return input.includes(';')
}

export class SearchQueryError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'SearchQueryError'
	}
}
