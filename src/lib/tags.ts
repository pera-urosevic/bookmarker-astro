/** Trims values, drops empties and non-strings, lowercases, and removes duplicates. */
export function normalizeTags(values: unknown): string[] {
	if (!Array.isArray(values)) return []

	const seen = new Set<string>()
	const tags: string[] = []
	for (const value of values) {
		if (typeof value !== 'string') continue
		const tag = value.trim().toLowerCase()
		if (!tag || seen.has(tag)) continue
		seen.add(tag)
		tags.push(tag)
	}
	return tags
}

/** Splits comma-separated input into lowercase, de-duplicated tags. */
export function parseTags(value: string): string[] {
	return normalizeTags(value.split(','))
}
