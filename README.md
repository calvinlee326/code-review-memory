# Code Review Memory

An AI code-review service that reviews GitHub pull requests and remembers your
team's coding-style preferences across reviews. It streams review feedback over
SSE and stores style "memory" so future reviews stay consistent with your
conventions.

Style rules are parsed from `coding_style.md` and review memory is persisted to
`review_memory_store.json` — no database is required to run the app.

## Stack

- **Runtime:** Node.js 24, TypeScript 5.9, pnpm workspaces
- **API:** Express 5 (`artifacts/api-server`)
- **Storage:** JSON file (`review_memory_store.json`)
- **Validation:** Zod (`zod/v4`)
- **API codegen:** Orval (from an OpenAPI spec)
- **Build:** esbuild

> A Drizzle/PostgreSQL package exists in `lib/db` as scaffolding, but it is not
> imported by the running server.

## Getting started

### Prerequisites

- Node.js 24+
- pnpm

### Setup

```bash
pnpm install
cp .env.example .env   # then fill in the values
```

Required environment variables (see `.env.example`):

| Variable         | Purpose                                  |
| ---------------- | ---------------------------------------- |
| `OPENAI_API_KEY` | Used by the review harness               |
| `GITHUB_TOKEN`   | Repo read access to fetch PR diffs       |
| `PORT`           | Server port (optional, defaults to 5000) |

### Run

```bash
pnpm --filter @workspace/api-server run dev   # API server on port 5000
pnpm run typecheck                            # typecheck all packages
pnpm run build                                # typecheck + build all packages
```

## License

[MIT](./LICENSE)
