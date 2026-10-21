import postgres from 'postgres'

type Client = ReturnType<typeof postgres>

let client: Client | undefined

function resolveDatabaseUrl(): string {
	const url = import.meta.env?.DATABASE_URL ?? process.env.DATABASE_URL

	if (!url) {
		throw new Error(
			'DATABASE_URL is not set. Point it at a PostgreSQL database, e.g. postgres://user:pass@localhost:5432/bookmarker',
		)
	}

	return url
}

/** Returns the shared client, creating it on first use so importing this module never needs DATABASE_URL. */
export function getSql(): Client {
	client ??= postgres(resolveDatabaseUrl(), { onnotice: () => {} })
	return client
}
