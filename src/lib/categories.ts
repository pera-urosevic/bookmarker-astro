export function filterCategories(categories: string[], query: string): string[] {
	const term = query.trim().toLowerCase()
	if (!term) return categories
	return categories.filter(category => category.toLowerCase().includes(term))
}
