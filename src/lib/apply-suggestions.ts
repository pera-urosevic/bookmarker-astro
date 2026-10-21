import type { Suggestion } from './suggest.ts'
import { normalizeTags, parseTags } from './tags.ts'

export interface FormValues {
	tags: string
	notes: string
}

/**
 * Replaces the form's tags and notes with the suggested values.
 * A field keeps its current value when the corresponding suggestion is empty,
 * so a partial suggestion never clears existing content. Tags are lowercased
 * and de-duplicated; whitespace-only values count as blank.
 */
export function applySuggestions(current: FormValues, suggestion: Suggestion): FormValues {
	const suggestedTags = normalizeTags(suggestion.tags)
	const suggestedNotes = suggestion.notes.trim()

	return {
		tags: (suggestedTags.length > 0 ? suggestedTags : parseTags(current.tags)).join(', '),
		notes: suggestedNotes || current.notes.trim(),
	}
}
