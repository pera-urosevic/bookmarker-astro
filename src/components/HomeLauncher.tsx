import { useEffect, useMemo, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { bookmarkSearchText, matchesQuery } from '../lib/filter'
import { nextCursor } from '../lib/navigation'
import type { Bookmark } from '../types'
import './HomeLauncher.css'

function increment(id: string) {
	void fetch('/api/clicks', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ id }),
		keepalive: true,
	}).catch(() => {})
}

export default function HomeLauncher({ bookmarks }: { bookmarks: Bookmark[] }) {
	const listRef = useRef<HTMLUListElement>(null)
	const [query, setQuery] = useState('')
	const [selectedId, setSelectedId] = useState<string | null>(null)
	const [resultsHidden, setResultsHidden] = useState(true)

	const visible = useMemo(
		() =>
			query.trim() === ''
				? bookmarks
				: bookmarks.filter(item => matchesQuery(bookmarkSearchText(item), query)),
		[bookmarks, query],
	)
	const selected = visible.find(item => item.id === selectedId)

	useEffect(() => {
		const item = listRef.current?.querySelector('.result.selected')
		item?.scrollIntoView({ block: 'nearest' })
	}, [selectedId])

	const onChange = (value: string) => {
		setQuery(value)

		if (value.trim() === '') {
			setResultsHidden(true)
			setSelectedId(null)
			return
		}

		setResultsHidden(false)
		const first = bookmarks.find(item => matchesQuery(bookmarkSearchText(item), value))
		setSelectedId(first?.id ?? null)
	}

	useEffect(() => {
		const move = (direction: 'up' | 'down') => {
			const index = selectedId ? visible.findIndex(item => item.id === selectedId) : -1
			const next = nextCursor(index, direction, visible.length)
			if (next !== -1) setSelectedId(visible[next].id)
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey || event.metaKey || event.ctrlKey) return

			const target = event.target
			const isControl =
				target instanceof HTMLElement &&
				(target.isContentEditable ||
					['TEXTAREA', 'SELECT', 'BUTTON'].includes(target.tagName) ||
					target.tagName === 'A')
			if (isControl) return

			if (event.key === 'Escape') {
				event.preventDefault()
				setResultsHidden(true)
				setSelectedId(null)
				return
			}

			if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
				if (resultsHidden || visible.length === 0) return
				event.preventDefault()
				move(event.key === 'ArrowDown' ? 'down' : 'up')
				return
			}

			if (event.key !== 'Enter') return

			const value = query.trim()

			if (/^[a-z][a-z0-9+.-]*:\/\//i.test(value)) {
				event.preventDefault()
				window.location.assign(value)
				return
			}

			if (selected) {
				event.preventDefault()
				increment(selected.id)
				window.location.assign(selected.url)
				return
			}

			if (!value || (!resultsHidden && visible.length > 0)) return

			event.preventDefault()
			window.location.assign(`https://www.google.com/search?q=${encodeURIComponent(value)}`)
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [bookmarks, query, resultsHidden, selected, visible])

	const onClick = (event: MouseEvent<HTMLAnchorElement>, id: string) => {
		if (event.button !== 0 || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return
		increment(id)
	}

	return (
		<main className="launcher">
			<input
				id="home-search"
				className="home-search"
				type="search"
				placeholder="Search"
				aria-label="Search"
				autoComplete="off"
				autoFocus
				value={query}
				onChange={event => onChange(event.target.value)}
			/>
			<div id="home-results" className="results" hidden={resultsHidden}>
				<ul ref={listRef} id="home-list" className="result-list" aria-label="Matching bookmarks">
					{visible.map(bookmark => (
						<li
							key={bookmark.id}
							className={`result${bookmark.id === selectedId ? ' selected' : ''}`}
							aria-current={bookmark.id === selectedId ? 'true' : undefined}
						>
							<a
								href={bookmark.url}
								title={bookmark.notes + '\n\n' + bookmark.tags}
								onClick={event => onClick(event, bookmark.id)}
							>
								{bookmark.title || bookmark.url}
							</a>
						</li>
					))}
				</ul>
				<p id="home-no-results" className="no-results" role="status" aria-live="polite" hidden={visible.length > 0}>
					Press Enter to search the web.
				</p>
			</div>
		</main>
	)
}
