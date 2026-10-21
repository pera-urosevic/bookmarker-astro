import { useEffect, useRef, useState } from 'react'
import { filterCategories } from '../lib/categories.ts'
import './CategorySuggestions.css'

const LISTBOX_ID = 'category-suggestions'

interface CategorySuggestionsProps {
	categories: string[]
}

export default function CategorySuggestions({ categories }: CategorySuggestionsProps) {
	const [open, setOpen] = useState(false)
	const [query, setQuery] = useState('')
	const [highlighted, setHighlighted] = useState(-1)
	const inputRef = useRef<HTMLInputElement | null>(null)

	const matches = filterCategories(categories, query)
	const latest = useRef({ open, highlighted, matches })
	latest.current = { open, highlighted, matches }

	const select = (category: string) => {
		const input = inputRef.current
		if (!input) return

		input.value = category
		setQuery(category)
		setOpen(false)
		setHighlighted(-1)
		input.focus()
	}

	useEffect(() => {
		const input = document.getElementById('category') as HTMLInputElement | null
		if (!input) return
		inputRef.current = input
		input.setAttribute('role', 'combobox')
		input.setAttribute('aria-autocomplete', 'list')
		input.setAttribute('aria-controls', LISTBOX_ID)
		input.setAttribute('aria-expanded', 'false')

		function close() {
			setOpen(false)
			setHighlighted(-1)
		}

		function onFocus() {
			setQuery('')
			setOpen(true)
			setHighlighted(-1)
		}

		function onInput() {
			setQuery(input.value)
			setOpen(true)
			setHighlighted(-1)
		}

		function onKeyDown(event: KeyboardEvent) {
			const state = latest.current
			const category = state.matches[state.highlighted]

			if (!state.open) {
				if (event.key === 'ArrowDown' && state.matches.length > 0) {
					event.preventDefault()
					setOpen(true)
					setHighlighted(0)
				}
				return
			}

			if (event.key === 'ArrowDown') {
				event.preventDefault()
				setHighlighted(index => Math.min(index + 1, state.matches.length - 1))
			} else if (event.key === 'ArrowUp') {
				event.preventDefault()
				setHighlighted(index => Math.max(index - 1, 0))
			} else if (event.key === 'Enter' && category !== undefined) {
				event.preventDefault()
				select(category)
			} else if (event.key === 'Tab') {
				if (category !== undefined) select(category)
				else close()
			} else if (event.key === 'Escape') {
				event.preventDefault()
				close()
			}
		}

		input.addEventListener('focus', onFocus)
		input.addEventListener('input', onInput)
		input.addEventListener('blur', close)
		input.addEventListener('keydown', onKeyDown)

		return () => {
			input.removeEventListener('focus', onFocus)
			input.removeEventListener('input', onInput)
			input.removeEventListener('blur', close)
			input.removeEventListener('keydown', onKeyDown)
			for (const attribute of ['role', 'aria-autocomplete', 'aria-controls', 'aria-expanded', 'aria-activedescendant']) {
				input.removeAttribute(attribute)
			}
		}
	}, [])

	useEffect(() => {
		const input = inputRef.current
		if (!input) return

		input.setAttribute('aria-expanded', String(open))
		const active = open ? matches[highlighted] : undefined
		if (active !== undefined) input.setAttribute('aria-activedescendant', `category-option-${highlighted}`)
		else input.removeAttribute('aria-activedescendant')
	}, [open, highlighted, matches])

	useEffect(() => {
		if (highlighted < 0) return
		document.getElementById(`category-option-${highlighted}`)?.scrollIntoView({ block: 'nearest' })
	}, [highlighted])

	if (!open || matches.length === 0) return null

	return (
		<ul id={LISTBOX_ID} className="category-suggestions" role="listbox">
			{matches.map((category, index) => (
				<li
					key={category}
					id={`category-option-${index}`}
					className="category-suggestions__option"
					role="option"
					aria-selected={index === highlighted}
					onMouseDown={event => event.preventDefault()}
					onMouseEnter={() => setHighlighted(index)}
					onClick={() => select(category)}
				>
					{category}
				</li>
			))}
		</ul>
	)
}
