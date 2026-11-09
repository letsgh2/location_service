# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Backend service (`services/backend/`) of a Polish real-estate listings app: async FastAPI + SQLAlchemy 2.0 (aiosqlite) REST API. The frontend lives separately in `services/frontend/`. Python >= 3.11. Project docs (`user_stories*.md`, in the repo root) and code comments are largely in Polish. Tests live in `tests/` (pytest); no linter is configured.

## Commands

```bash
./setup.sh                       # create venv/, install deps via `pip install -e .` (deps are pinned in pyproject.toml)
source venv/bin/activate
python -m sql_app.init_db        # create/upgrade DB: runs `alembic upgrade head`
uvicorn main:app --reload        # run the API (docs at /docs)
pip install -e ".[dev]"          # test deps: pytest, pytest-asyncio, httpx
pytest -q                        # run tests (in-memory SQLite, see tests/conftest.py; `make_listing` fixture builds a Listing with its required FKs)

alembic revision --autogenerate -m "message"   # generate a migration after changing sql_app/models.py
alembic upgrade head
alembic downgrade -1
```

Run these from `services/backend/` — `alembic.ini` and the default SQLite URL (`./sql_app.db`) are relative to it.

## Architecture

- `main.py` — the whole HTTP layer: a single `FastAPI` app with route handlers written directly against `AsyncSession` (no router/service/repository layers). `Location` has CRUD endpoints (`/locations/`, PATCH for partial update, DELETE returns 409 if listings reference the location). `Listing` is read-only: `GET /listings/` and `GET /listings/count` share the `listing_filters` dependency (FastAPI 0.104 has no Query parameter models, so filters are a function dependency returning the `ListingFilters` dataclass; `min > max` raises 422) and `apply_listing_filters(stmt, f)`; `/listings/` uses `selectinload(Listing.location)` (lazy loading in async raises `MissingGreenlet`). `GET /listings/cities` and `/listings/districts` give prefix suggestions (wildcards escaped); they live under `/listings/` because `/locations/cities` would be captured by `/locations/{location_id}` — declare them before any future `/listings/{listing_id}`. City/district filters use exact `==`, since SQLite `lower()` only folds ASCII. `Building`, `Owner` and `Features` have models and schemas but no endpoints yet.
- `sql_app/database.py` — async engine (`echo=True`), `AsyncSessionLocal` (`expire_on_commit=False`), declarative `Base`, and the `get_db` FastAPI dependency.
- `sql_app/models.py` — SQLAlchemy models. `Listing` is the central table with non-null FKs to `location`, `building`, `owner` and `features`.
- `sql_app/schemas.py` — Pydantic v2 schemas following a `XBase` / `XCreate` / `X` (with `from_attributes=True`) pattern; `ListingDetail` embeds the related objects. `LocationUpdate` makes every field optional and handlers apply it with `model_dump(exclude_unset=True)` for PATCH semantics.
- `config.py` — `pydantic-settings` `Settings` (`database_url`, overridable via env or `.env`; see `.env.example`). Imported by both `sql_app/database.py` and `alembic/env.py`.

### Database schema management

Alembic is the source of truth for the schema (`alembic/versions/`). `sql_app/init_db.py` just calls `alembic upgrade head` — it does not use `Base.metadata.create_all`. `sql_app/schema.sql` is a raw-SQL reference copy of the original schema and is not executed by anything; keep it in mind if models change, but migrations are what actually apply.

`alembic/env.py` takes the URL from `config.settings` and rewrites `sqlite+aiosqlite` → `sqlite`, because migrations run on a **sync** engine while the app uses the async driver. It also sets `render_as_batch=True` (needed for SQLite `ALTER TABLE`), and imports `sql_app.models` so autogenerate sees all tables — new models must be importable via that module.

## CI

`.github/workflows/agent-review.yml` (in the repo root) runs an automated PR review with OpenAI Codex CLI using the repo-root `.agent/review-prompt.md`, `.agent/review-schema.json` and `.agent/post-review-comment.js`. The review prompt specifically looks for missing Alembic migrations, API-contract breaks, and bad queries, so model changes should ship with a migration.
