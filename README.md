# programming_tools_ai

A real-estate listings application organized as a **monorepo**: every deployable part lives in its own service under `services/`, and everything shared (requirements, CI) lives at the repo root.

## Repository layout

```
.
├── services/
│   ├── backend/             # FastAPI + SQLAlchemy (async) + SQLite + Alembic
│   ├── frontend/            # React + Vite
│   └── e2e/                 # End-to-end tests: pytest + Playwright (Python)
├── .github/workflows/       # CI (automated PR review)
├── .agent/                  # Prompt, schema and script used by the PR review
└── user_stories*.md         # Requirements notes (in Polish)
```

## Services

| Service | Directory | Description | Status |
| --- | --- | --- | --- |
| Backend | [`services/backend`](services/backend) | REST API for listings: FastAPI, async SQLAlchemy 2.0, SQLite, Alembic migrations | In development (`Location` CRUD, read-only `Listing` list with filters, count and suggestions) |
| Frontend | [`services/frontend`](services/frontend) | Web UI consuming the backend API (React + Vite) | In development (`Location` list/add/delete, listings view with filters) |
| E2E tests | [`services/e2e`](services/e2e) | Browser tests of the UI with pytest + Playwright (Python); starts backend and frontend itself | In development (auth and `Location` flows) |

Each service is self-contained: it has its own dependencies, configuration, tests and README, and is run from its own directory. Services communicate only over HTTP – the frontend talks to the backend API (by default `http://127.0.0.1:8000`).

## Getting started

Work from the directory of the service you are changing. For the backend:

```bash
cd services/backend
./setup.sh
source venv/bin/activate
python -m sql_app.init_db
uvicorn main:app --reload
```

See [`services/backend/README.md`](services/backend/README.md) for configuration, the API reference, migrations and tests.

## Conventions

- **One service, one directory.** Code, dependency manifests, `.env.example` and tests stay inside the service; do not import code across services.
- **Shared files stay at the root.** Documentation of requirements (`user_stories*.md`), CI workflows (`.github/`) and review tooling (`.agent/`) apply to the whole repository.
- **Per-service tooling config.** Claude Code settings (`CLAUDE.md`, `.claude/`) are scoped per service – start Claude Code from the service directory you are working on.
- **Schema changes ship with a migration.** Backend model changes require an Alembic migration (`alembic revision --autogenerate`); the PR review checks for it.

## Continuous integration

`.github/workflows/agent-review.yml` runs an automated AI code review on every pull request using the Codex CLI and the prompt in `.agent/review-prompt.md`. It requires an `OPENAI_API_KEY` repository secret.
