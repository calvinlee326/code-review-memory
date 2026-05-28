# Code Review Memory

An AI code-review service that reviews GitHub pull requests and remembers your team's coding-style preferences across reviews.

- Live: https://code-review-memory.onrender.com/api/
- Repo: https://github.com/calvinlee326/code-review-memory

## Run & Operate

- `pnpm dev` — run the API server (loads `.env`, port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- Required env: `OPENAI_API_KEY`, `GITHUB_TOKEN`, `PORT` (see `.env.example`)
- Deploy: Render Blueprint in `render.yaml` (no database required)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- Storage: JSON file (`review_memory_store.json`) — no database at runtime
- Validation: Zod (`zod/v4`)
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

_Populate as you build — short repo map plus pointers to the source-of-truth file for DB schema, API contracts, theme files, etc._

## Architecture decisions

_Populate as you build — non-obvious choices a reader couldn't infer from the code (3-5 bullets)._

## Product

_Describe the high-level user-facing capabilities of this app once they exist._

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
