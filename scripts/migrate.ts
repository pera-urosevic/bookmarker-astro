#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'
import { getSql } from '../src/lib/db.ts'

const migrationsDir = path.resolve(process.cwd(), 'db/migrations')
const sql = getSql()

async function run(): Promise<void> {
	await sql`
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version text PRIMARY KEY,
			applied_at timestamptz NOT NULL DEFAULT now()
		)
	`

	const appliedRows = await sql<{ version: string }[]>`SELECT version FROM schema_migrations`
	const applied = new Set(appliedRows.map(row => row.version))

	const files = fs
		.readdirSync(migrationsDir)
		.filter(file => file.endsWith('.sql'))
		.sort()

	const pending = files.filter(file => !applied.has(file))

	if (pending.length === 0) {
		console.log('No pending migrations.')
		return
	}

	for (const file of pending) {
		const statement = fs.readFileSync(path.join(migrationsDir, file), 'utf8')

		await sql.begin(async tx => {
			await tx.unsafe(statement)
			await tx`INSERT INTO schema_migrations (version) VALUES (${file})`
		})

		console.log(`Applied ${file}`)
	}
}

run()
	.catch(error => {
		console.error(error instanceof Error ? error.message : String(error))
		process.exitCode = 1
	})
	.finally(() => sql.end())
