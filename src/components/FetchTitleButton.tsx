import { useState } from 'react'
import './FetchTitleButton.css'

export default function FetchTitleButton() {
	const [status, setStatus] = useState('')
	const [loading, setLoading] = useState(false)

	const onClick = async () => {
		const url = document.getElementById('url') as HTMLInputElement | null
		if (!url) return

		if (!url.value.trim()) {
			setStatus('Enter a URL first')
			return
		}

		setStatus('')
		setLoading(true)

		try {
			const response = await fetch(`/api/title?url=${encodeURIComponent(url.value.trim())}`)
			if (!response.ok) throw new Error(`Request failed: ${response.status}`)

			const data = (await response.json()) as { title?: unknown; description?: unknown }
			const title = typeof data.title === 'string' ? data.title.trim() : ''
			const description = typeof data.description === 'string' ? data.description.trim() : ''

			const titleInput = document.getElementById('title') as HTMLInputElement | null
			const notes = document.getElementById('notes') as HTMLTextAreaElement | null

			if (titleInput && title) titleInput.value = title
			if (notes && description) notes.value = description
			if (!title && !description) setStatus('No title or description found')
		} catch {
			setStatus('Fetch failed')
		} finally {
			setLoading(false)
		}
	}

	return (
		<>
			<button type="button" onClick={onClick} disabled={loading} aria-busy={loading || undefined}>
				{loading ? 'Fetching…' : 'Fetch'}
			</button>
			<p id="title-status" role="status" aria-live="polite">
				{status}
			</p>
		</>
	)
}
