# Code Review Memory

An AI code-review service that reviews GitHub pull requests and remembers your
team's coding-style preferences across reviews. It streams review feedback over
SSE and stores style "memory" so future reviews stay consistent with your
conventions.

## Stack

- **Runtime:** Node.js 24, TypeScript 5.9, pnpm workspaces
- **API:** Express 5 (`artifacts/api-server`)
- **Database:** PostgreSQL + Drizzle ORM (`lib/db`)
- **Validation:** Zod (`zod/v4`), `drizzle-zod`
- **API codegen:** Orval (from an OpenAPI spec)
- **Build:** esbuild

## Getting started

### Prerequisites

- Node.js 24+
- pnpm
- A PostgreSQL database

### Setup

```bash
pnpm install
cp .env.example .env   # then fill in the values
```

Required environment variables (see `.env.example`):

| Variable         | Purpose                                         |
| ---------------- | ----------------------------------------------- |
| `DATABASE_URL`   | Postgres connection string                      |
| `OPENAI_API_KEY` | Used by the review harness                      |
| `GITHUB_TOKEN`   | Repo read access to fetch PR diffs              |
| `SESSION_SECRET` | Signs sessions (required in production)          |
| `PORT`           | Server port (optional, defaults to 5000)        |

### Database schema

```bash
pnpm --filter @workspace/db run push
```

### Run

```bash
pnpm --filter @workspace/api-server run dev   # API server on port 5000
pnpm run typecheck                            # typecheck all packages
pnpm run build                                # typecheck + build all packages
```

## License

[MIT](./LICENSE)
