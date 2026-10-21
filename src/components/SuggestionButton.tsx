import { useState } from 'react'
import { applySuggestions } from '../lib/apply-suggestions'
import './SuggestionButton.css'

export default function SuggestionButton() {
	const [status, setStatus] = useState('')
	const [loading, setLoading] = useState(false)

	const onClick = async () => {
		const url = document.getElementById('url') as HTMLInputElement | null
		const title = document.getElementById('title') as HTMLInputElement | null
		const tags = document.getElementById('tags') as HTMLInputElement | null
		const notes = document.getElementById('notes') as HTMLTextAreaElement | null

		if (!url || !title || !tags || !notes) return

		if (!url.value.trim()) {
			setStatus('Enter a URL first')
			return
		}

		setStatus('')
		setLoading(true)

		try {
			const response = await fetch('/api/suggest', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ url: url.value.trim(), title: title.value.trim() }),
			})
			if (!response.ok) throw new Error(`Request failed: ${response.status}`)

			const values = applySuggestions({ tags: tags.value, notes: notes.value }, await response.json())
			tags.value = values.tags
			notes.value = values.notes
		} catch {
			setStatus('Could not get suggestions')
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<button type="button" onClick={onClick} disabled={loading} aria-busy={loading || undefined}>
				{loading ? 'Thinking…' : 'AI'}
			</button>
			<p id="ai-status" role="status" aria-live="polite">
				{status}
			</p>
		</>
	)
}
