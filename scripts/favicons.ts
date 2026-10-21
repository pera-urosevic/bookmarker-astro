#!/usr/bin/env node
import { getSql } from '../src/lib/db.ts'
import { listBookmarksMissingFavicon, setBookmarkFavicon } from '../src/lib/bookmarks.ts'
import { downloadFavicon } from '../src/lib/favicon.ts'

async function run(): Promise<void> {
	const bookmarks = await listBookmarksMissingFavicon()
	if (bookmarks.length === 0) {
		console.log('No bookmarks are missing a favicon.')
		return
	}

	let stored = 0

	for (const [index, bookmark] of bookmarks.entries()) {
		const label = `[${index + 1}/${bookmarks.length}] ${bookmark.url}`
		const favicon = await downloadFavicon(bookmark.url)

		if (!favicon) {
			console.log(`${label} -> failed`)
			continue
		}

		await setBookmarkFavicon(bookmark.id, favicon)
		stored += 1
		console.log(`${label} -> stored`)
	}

	console.log(`Stored ${stored} of ${bookmarks.length} favicons.`)
}

run()
	.catch(error => {
		console.error(error instanceof Error ? error.message : String(error))
		process.exitCode = 1
	})
	.finally(() => getSql().end())
