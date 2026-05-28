# Code Review Memory

An AI code-review service that reviews GitHub pull requests and remembers your
team's coding-style preferences across reviews. It streams review feedback over
SSE and stores style "memory" so future reviews stay consistent with your
conventions.

Style rules are parsed from `coding_style.md` and review memory is persisted to
`review_memory_store.json` — no database is required to run the app.

## Live demo

- **Review UI:** https://code-review-memory.onrender.com/api/
- **Health check:** https://code-review-memory.onrender.com/api/healthz

> Hosted on Render's free tier — the instance sleeps after inactivity, so the
> first request may take ~50s to wake. All routes are served under `/api`.

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

- Node.js 22.9+ (uses `--env-file-if-exists`)
- [pnpm](https://pnpm.io/installation)

Runs on macOS, Linux, and Windows — the correct native binaries are installed
automatically for your platform.

### Setup

```bash
pnpm install
cp .env.example .env   # then fill in the values
```

Environment variables (see `.env.example`):

| Variable         | Purpose                                | Required |
| ---------------- | -------------------------------------- | -------- |
| `OPENAI_API_KEY` | Used by the review harness             | yes      |
| `GITHUB_TOKEN`   | Repo read access to fetch PR diffs     | yes      |
| `PORT`           | Server port                            | yes (5000 in `.env.example`) |

`.env` is loaded automatically at startup — no need to export variables.

### Run

```bash
pnpm dev            # start the API server (loads .env, defaults to port 5000)
pnpm typecheck      # typecheck all packages
pnpm build          # typecheck + build all packages
```

Once running:

- `GET /api/healthz` — health check (`{"status":"ok"}`)
- `GET /api/` — review web UI
- `GET /api/review/stream?pr_url=<github-pr-url>` — stream a review over SSE

> **macOS note:** port 5000 is used by the AirPlay Receiver (Control Center).
> Set `PORT` to something else (e.g. `5050`) in your `.env`, or disable AirPlay
> Receiver in System Settings → General → AirDrop & Handoff.

## Deploy

The repo includes a [`render.yaml`](./render.yaml) Blueprint for one-click
deploys on [Render](https://render.com):

1. **New +** → **Blueprint** → connect this repository.
2. Render reads `render.yaml` and creates the web service automatically.
3. Set `OPENAI_API_KEY` and `GITHUB_TOKEN` when prompted (stored in Render, not
   the repo). `PORT` is injected by Render; no database is needed.
4. Deploy. The service builds with esbuild and health-checks `/api/healthz`.

## License

[MIT](./LICENSE)
