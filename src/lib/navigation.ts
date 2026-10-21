export type Direction = 'up' | 'down'

/**
 * Returns the next cursor index within a list of `count` items.
 * With no selection (-1), down selects the first item and up the last.
 * Movement stops at both ends instead of wrapping.
 */
export function nextCursor(cursor: number, direction: Direction, count: number): number {
	if (count <= 0) return -1
	if (cursor < 0 || cursor >= count) return direction === 'down' ? 0 : count - 1
	return direction === 'down' ? Math.min(cursor + 1, count - 1) : Math.max(cursor - 1, 0)
}
