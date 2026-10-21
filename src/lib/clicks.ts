export function normalizeClicks(value: unknown): number {
	return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : 0
}

export function parseClicks(value: unknown, fallback = 0): number {
	const text = typeof value === 'string' ? value.trim() : ''
	if (text === '') return fallback

	const clicks = Number(text)
	return Number.isInteger(clicks) && clicks >= 0 ? clicks : fallback
}
