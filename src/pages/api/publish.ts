import type { APIRoute } from 'astro'
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { listBookmarks } from '../../lib/bookmarks'
import { bookmarksToChrome } from '../../lib/bookmarks-chrome'

function json(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { 'content-type': 'application/json' },
	})
}


async function isChromeRunning(): Promise<boolean> {
	const command = (import.meta.env.CHROME_PROCESS as string | undefined)?.trim()
	if (!command) return false

	return await new Promise<boolean>(resolve => {
		const child = spawn(command, {
			shell: true,
			stdio: 'ignore',
		})

		child.on('error', () => resolve(false))
		child.on('exit', code => resolve(code === 0))
	})
}

async function waitForChromeToClose(): Promise<boolean> {
	const started = Date.now()
	const timeout = 5 * 60 * 1000

	while (await isChromeRunning()) {
		if (Date.now() - started >= timeout) return false
		await new Promise(resolve => setTimeout(resolve, 1000))
	}

	return true
}

export const POST: APIRoute = async () => {
	const chromeBookmarksPath = import.meta.env.CHROME_BOOKMARKS_PATH as string | undefined
	if (!chromeBookmarksPath) {
		return json({ error: 'CHROME_BOOKMARKS_PATH is not configured' }, 400)
	}


	const closed = await waitForChromeToClose()
	if (!closed) {
		return json({ error: 'Chrome is still running' }, 409)
	}

	let existing: unknown = null
	let count = 0

	try {
		const backupPath = path.join(path.dirname(chromeBookmarksPath), 'Bookmarks.bak')
		if (fs.existsSync(backupPath)) {
			fs.rmSync(backupPath)
		}

		if (fs.existsSync(chromeBookmarksPath)) {
			try {
				existing = JSON.parse(fs.readFileSync(chromeBookmarksPath, 'utf8'))
			} catch {
				existing = null
			}
		}

		const bookmarks = await listBookmarks()
		count = bookmarks.length
		const serialized = bookmarksToChrome(existing, bookmarks, new Date())

		const directory = path.dirname(chromeBookmarksPath)
		fs.mkdirSync(directory, { recursive: true })
		const tempPath = `${chromeBookmarksPath}.tmp.${process.pid}`
		fs.writeFileSync(tempPath, `${JSON.stringify(serialized, null, 3)}\n`)
		fs.renameSync(tempPath, chromeBookmarksPath)

		try {
			const notifier = spawn('notify-send', ['Bookmarks published', `${count} bookmarks written to Chrome Bookmarks`], {
				detached: true,
				stdio: 'ignore',
			})
			notifier.unref()
		} catch {
			// System notifications are optional.
		}

		return json({
			chromeStarted: false,
			count,
			ok: true,
			path: chromeBookmarksPath,
		})
	} catch (error) {
		console.error('Publishing Chrome bookmarks failed:', error)
		return json(
			{
				chromeStarted: false,
				error: error instanceof Error ? error.message : 'Could not publish bookmarks',
				path: chromeBookmarksPath,
			},
			500,
		)
	}
}

export const ALL: APIRoute = () => json({ error: 'Method not allowed' }, 405)
