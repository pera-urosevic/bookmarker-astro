import { useCallback, useEffect, useRef, useState } from 'react'
import { formatVisibleCount } from '../lib/filter'
import { nextCursor } from '../lib/navigation'
import type { Bookmark } from '../types'
import './BookmarkSearch.css'

interface SearchResponse {
	bookmarks: Bookmark[]
	total: number
}

const searchKey = 'bookmarker:search'

function readStoredSearch(): string {
	try {
		return localStorage.getItem(searchKey) ?? ''
	} catch {
		return ''
	}
}

function saveSearch(value: string) {
	try {
		if (value) {
			localStorage.setItem(searchKey, value)
		} else {
			localStorage.removeItem(searchKey)
		}
	} catch {}
}

function syncUrl(value: string) {
	const params = new URLSearchParams(window.location.search)
	if (value) {
		params.set('q', value)
	} else {
		params.delete('q')
	}

	const query = params.toString()
	window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
}

function isControl(target: EventTarget | null): boolean {
	return (
		target instanceof HTMLElement &&
		(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT', 'BUTTON', 'A'].includes(target.tagName))
	)
}

export default function BookmarkSearch() {
	const searchRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLUListElement>(null)
	const controllerRef = useRef<AbortController | null>(null)
	const [query, setQuery] = useState('')
	const [activeQuery, setActiveQuery] = useState('')
	const [bookmarks, setBookmarks] = useState<Bookmark[]>([])
	const [total, setTotal] = useState(0)
	const [loaded, setLoaded] = useState(false)
	const [error, setError] = useState('')
	const [selectedId, setSelectedId] = useState<string | null>(null)

	const load = useCallback(async (value: string) => {
		controllerRef.current?.abort()
		const controller = new AbortController()
		controllerRef.current = controller

		const params = new URLSearchParams()
		if (value) params.set('q', value)
		const suffix = params.toString()

		try {
			const response = await fetch(`/api/bookmarks${suffix ? `?${suffix}` : ''}`, {
				signal: controller.signal,
			})
			const data = (await response.json().catch(() => null)) as (SearchResponse & { error?: string }) | null

			if (!response.ok) {
				throw new Error(data?.error || 'Could not search bookmarks')
			}

			if (!data || !Array.isArray(data.bookmarks)) {
				throw new Error('Unexpected response from the server')
			}

			if (controllerRef.current !== controller) return

			setError('')
			setBookmarks(data.bookmarks)
			setTotal(data.total)
			setActiveQuery(value)
			setSelectedId(null)
			setLoaded(true)
		} catch (e) {
			if (controller.signal.aborted) return

			setError(e instanceof Error ? e.message : 'Could not search bookmarks')
			setBookmarks([])
			setTotal(0)
			setSelectedId(null)
			setLoaded(false)
		}
	}, [])

	useEffect(() => {
		const fromUrl = new URLSearchParams(window.location.search).get('q')
		const initial = fromUrl ?? readStoredSearch()

		if (fromUrl) saveSearch(fromUrl)
		setQuery(initial)
		syncUrl(initial)
		void load(initial)

		return () => controllerRef.current?.abort()
	}, [load])

	useEffect(() => {
		const selected = listRef.current?.querySelector('.bookmark-item.selected')
		selected?.scrollIntoView({ block: 'nearest' })
	}, [selectedId])

	useEffect(() => {
		const runSearch = () => {
			saveSearch(query)
			syncUrl(query)
			void load(query)
		}

		const move = (direction: 'up' | 'down') => {
			const index = selectedId ? bookmarks.findIndex(bookmark => bookmark.id === selectedId) : -1
			const next = nextCursor(index, direction, bookmarks.length)
			if (next !== -1) setSelectedId(bookmarks[next].id)
		}

		const open = (bookmark: Bookmark, newTab: boolean) => {
			if (newTab) {
				window.open(bookmark.url, '_blank', 'noopener,noreferrer')
			} else {
				window.location.assign(bookmark.url)
			}
		}

		const onKeyDown = (event: KeyboardEvent) => {
			if (event.altKey || event.metaKey) return

			if (event.key === 'Enter' && event.target === searchRef.current) {
				event.preventDefault()
				runSearch()
				return
			}

			if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
				if (bookmarks.length === 0) return
				event.preventDefault()
				searchRef.current?.blur()
				move(event.key === 'ArrowDown' ? 'down' : 'up')
				return
			}

			if (isControl(event.target)) return

			const selected = bookmarks.find(bookmark => bookmark.id === selectedId)

			if (event.key === 'Enter' || event.key === ' ') {
				if (!selected) return
				event.preventDefault()
				open(selected, event.shiftKey || event.ctrlKey)
				return
			}

			if (event.ctrlKey) return

			switch (event.key) {
				case 'e':
					if (selected) window.location.assign(`/${selected.id}`)
					break
				case 'a':
					window.location.assign('/new')
					break
			}
		}

		document.addEventListener('keydown', onKeyDown)
		return () => document.removeEventListener('keydown', onKeyDown)
	}, [bookmarks, selectedId, query, load])

	const showEmpty = loaded && total === 0
	const showNoResults = !error && activeQuery.trim() !== '' && total > 0 && bookmarks.length === 0

	return (
		<>
			<header>
				<h1>Bookmarks</h1>
				<input
					ref={searchRef}
					id="bookmark-search"
					type="search"
					className="bookmark-search"
					placeholder="Search bookmarks"
					aria-label="Search bookmarks"
					autoComplete="off"
					autoFocus
					value={query}
					onChange={event => setQuery(event.target.value)}
					onFocus={() => setSelectedId(null)}
				/>
				{!error && total > 0 && (
					<span id="bookmark-count" className="bookmark-count" aria-live="polite">
						{formatVisibleCount(bookmarks.length, total)}
					</span>
				)}
				<nav>
					<a href="/import" className="button ghost">
						Import
					</a>
					<a href="/export" className="button ghost">
						Export
					</a>
					<a href="/new" className="button">
						Add Bookmark
					</a>
				</nav>
			</header>

			<main>
				{error && (
					<p id="search-error" className="error-block" role="alert">
						{error}
					</p>
				)}
				{showNoResults && <p id="no-results">No bookmarks match your search.</p>}
				{showEmpty && <p id="empty-state">No bookmarks yet.</p>}
				<ul ref={listRef} className="bookmark-list">
					{bookmarks.map(bookmark => (
						<BookmarkItem key={bookmark.id} bookmark={bookmark} selected={bookmark.id === selectedId} />
					))}
				</ul>
			</main>
		</>
	)
}

function BookmarkItem({ bookmark, selected }: { bookmark: Bookmark; selected: boolean }) {
	const clicks = bookmark.clicks ?? 0
	const clickLabel = `${clicks} ${clicks === 1 ? 'click' : 'clicks'}`

	return (
		<li className={`bookmark-item${selected ? ' selected' : ''}`} data-id={bookmark.id} data-url={bookmark.url}>
			<div className="bookmark-header">
				<div className="bookmark-heading">
					<a
						className="bookmark-title"
						href={bookmark.url}
						target="_blank"
						rel="noopener noreferrer"
					>
						{bookmark.title || bookmark.url}
					</a>
					<span className="bookmark-category">{bookmark.category}</span>
					<span className="click-badge" aria-label={clickLabel} title={clickLabel}>
						{clicks}
					</span>
				</div>

				<div className="bookmark-actions">
					<a className="button" href={`/${bookmark.id}`}>
						Edit
					</a>
					<a className="button" href={`/delete/${bookmark.id}`}>
						Delete
					</a>
				</div>
			</div>

			{bookmark.notes && <p className="bookmark-notes">{bookmark.notes}</p>}

			{bookmark.tags.length > 0 && (
				<div className="bookmark-tags">
					{bookmark.tags.map(tag => (
						<span key={tag} className="tag">
							{tag}
						</span>
					))}
				</div>
			)}
		</li>
	)
}
