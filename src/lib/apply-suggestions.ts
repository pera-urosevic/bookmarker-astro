import type { Suggestion } from './suggest.ts'
import { normalizeTags } from './tags.ts'

export interface FormValues {
	tags?: string | null
	notes?: string | null
}

/**
 * Fills the form's empty tags and notes with the suggested values. Fields that
 * already have content keep their current value, so the AI never overwrites
 * what the user typed. Nullish and whitespace-only values count as empty.
 */
export function applySuggestions(current: FormValues, suggestion: Suggestion): FormValues {
	const currentTags = current.tags?.trim() ? current.tags : ''
	const currentNotes = current.notes?.trim() ? current.notes : ''

	return {
		tags: currentTags || normalizeTags(suggestion.tags).join(', '),
		notes: currentNotes || suggestion.notes.trim(),
	}
}
