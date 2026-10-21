import { useState } from 'react'
import './PublishButton.css'

export default function PublishButton() {
	const [pending, setPending] = useState(false)
	const [status, setStatus] = useState('')

	async function publish() {
		if (!window.confirm('Please restart the browser')) return

		setPending(true)
		setStatus('Publishing…')

		try {
			const response = await fetch('/api/publish', { method: 'POST' })
			const data = await response.json().catch(() => null)

			if (!response.ok) {
				setStatus((data && data.error) || 'Publish failed')
				return
			}

			setStatus(`Published ${data?.count ?? 0}`)
		} catch {
			setStatus('Request sent')
		} finally {
			setPending(false)
		}
	}

	return (
		<>
			<button type="button" className="ghost" disabled={pending} aria-busy={pending} onClick={publish}>
				{status || 'Publish'}
			</button>
			<span className="sr-only" role="status" aria-live="polite">
				{status}
			</span>
		</>
	)
}
