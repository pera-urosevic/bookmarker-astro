# Bookmarker

A small self-hosted bookmarks manager built with Astro, React and PostgreSQL. It suggests tags and notes with Ollama and ranks bookmarks by how often you open them.

## Setup

Requires Node.js >= 22 and a running PostgreSQL database.

```sh
pnpm install
cp .env.example .env   # then set DATABASE_URL
pnpm db:migrate
pnpm dev
```

`OLLAMA_MODEL` is optional (defaults to `qwen3.5:9b`).

## Scripts

| Command           | Description             |
| ----------------- | ----------------------- |
| `pnpm dev`        | Start the dev server    |
| `pnpm build`      | Build for production    |
| `pnpm preview`    | Preview the build       |
| `pnpm db:migrate` | Run database migrations |
| `pnpm test`       | Run tests               |

## Pages

- `/` — search, create and edit bookmarks
- `/home` — launcher with keyboard search and click tracking
- `/import`, `/export` — Netscape bookmarks HTML import/export

## Notes

- Developed with OpenCode + DeepSeek 4.1 Flash
- Plan skill (not included): e.g. `@plan <feature description>` creates a task markdown file in tasks folder
- Develop skill (not included): e.g. `@develop <task id>` implements the task and marks it as complete
