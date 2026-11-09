# programming_tools_ai — backend

This is the backend service (`services/backend/`). Run all commands below from this directory.

A real-estate listings API built with **FastAPI**, **SQLAlchemy (async)** and **SQLite**, with schema migrations managed by **Alembic**.

> **Status:** early development. The `Location` resource has full CRUD endpoints; `Listing` has read-only endpoints (filtered list, result count, city/district suggestions). `Building`, `Owner` and `Features` are defined in the database layer and Pydantic schemas, but have no API endpoints yet.

## Tech stack

| Area | Tool |
| --- | --- |
| Web framework | FastAPI 0.104 + Uvicorn |
| ORM | SQLAlchemy 2.0 (async) with `aiosqlite` |
| Migrations | Alembic |
| Configuration | pydantic-settings |
| Database | SQLite |
| Python | 3.11+ |

## Getting started

### 1. Install

```bash
./setup.sh
```

The script creates a `venv/` virtual environment, upgrades `pip` and installs the project in editable mode (`pip install -e .`). Activate the environment afterwards with:

```bash
source venv/bin/activate
```

### 2. Configure

Copy the example environment file and adjust it if needed:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `sqlite+aiosqlite:///./sql_app.db` | Async SQLAlchemy connection URL |
| `SECRET_KEY` | — (required) | Secret used to sign JWT tokens. Generate one, e.g. `python -c "import secrets; print(secrets.token_urlsafe(32))"` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Lifetime of access tokens |

Settings are loaded by `config.py` from environment variables or the `.env` file.

### 3. Create the database

Apply all Alembic migrations:

```bash
alembic upgrade head
```

or, equivalently:

```bash
python -m sql_app.init_db
```

Both are safe to run repeatedly; migrations that are already applied are skipped.

### 4. Run the API

```bash
uvicorn main:app --reload
```

The API is available at <http://127.0.0.1:8000>. Interactive documentation is generated automatically:

- Swagger UI: <http://127.0.0.1:8000/docs>
- ReDoc: <http://127.0.0.1:8000/redoc>

## API reference

| Method | Path | Description | Responses |
| --- | --- | --- | --- |
| `GET` | `/` | Health check (`{"message": "API is running"}`) | `200` |
| `POST` | `/auth/register` | Register a user (`email`, `password` min. 8 chars) | `201`, `409`, `422` |
| `POST` | `/auth/login` | Log in (form data `username` = email, `password`); returns `access_token` | `200`, `401` |
| `GET` | `/auth/me` | Current user (requires token) | `200`, `401` |
| `POST` | `/locations/` | Create a location (auth required) | `200`, `401` |
| `GET` | `/locations/` | List locations (`skip`, `limit` query params; defaults `0` and `100`) | `200` |
| `GET` | `/locations/{location_id}` | Get a single location | `200`, `404` |
| `PATCH` | `/locations/{location_id}` | Partially update a location (auth required; only the supplied fields change) | `200`, `401`, `404` |
| `DELETE` | `/locations/{location_id}` | Delete a location (auth required) | `204`, `401`, `404`, `409` |

`DELETE` returns `409 Conflict` when the location is still referenced by one or more listings.

#### Listings (public, read-only)

| Method | Path | Description | Responses |
| --- | --- | --- | --- |
| `GET` | `/listings/` | Filtered list of `ListingSummary` (`skip` ≥ 0, `limit` 1–500, default `100`), ordered by `listing_id` | `200`, `422` |
| `GET` | `/listings/count` | `{"count": n}` for the same filters (ignores `skip`/`limit`) | `200`, `422` |
| `GET` | `/listings/cities` | City suggestions: `q` (case-insensitive prefix, ASCII), `limit` 1–50 (default `10`) | `200`, `422` |
| `GET` | `/listings/districts` | District suggestions: `q`, optional `city` (exact), `limit` 1–50 | `200`, `422` |

Filters (all optional, combined with AND): `price_total_min`/`price_total_max`, `price_sqm_min`/`price_sqm_max`, `area_min`/`area_max` (inclusive, ≥ 0), `rooms` (repeatable, 1–20: `?rooms=2&rooms=3`), `city`, `city_district` (exact match). A negative bound, `min > max` or `rooms` out of range returns `422` (for `min > max` the `detail` is a string, e.g. `"area_min must be <= area_max"`). Listings with `NULL` in a filtered column are excluded while that filter is active. Suggestions only return values that have at least one listing.

### Authentication

Write endpoints for locations require a JWT in the `Authorization: Bearer <token>` header. Get a token from `/auth/login`:

```bash
curl -X POST http://127.0.0.1:8000/auth/register -H "Content-Type: application/json" \
  -d '{"email": "jan@example.com", "password": "haslo-12345"}'

TOKEN=$(curl -s -X POST http://127.0.0.1:8000/auth/login \
  -d 'username=jan@example.com&password=haslo-12345' | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -X POST http://127.0.0.1:8000/locations/ \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"city": "Warsaw"}'
```

Passwords are hashed with bcrypt. Tokens are HS256 JWTs valid for `ACCESS_TOKEN_EXPIRE_MINUTES`.

### Example

```bash
# Create a location
curl -X POST http://127.0.0.1:8000/locations/ \
  -H "Content-Type: application/json" \
  -d '{"city": "Warsaw", "street": "Marszalkowska", "latitude": 52.2297, "longitude": 21.0122}'

# List locations with pagination
curl "http://127.0.0.1:8000/locations/?skip=0&limit=10"

# Update a single field
curl -X PATCH http://127.0.0.1:8000/locations/1 \
  -H "Content-Type: application/json" \
  -d '{"city_district": "Srodmiescie"}'

# Delete
curl -X DELETE http://127.0.0.1:8000/locations/1
```

All `Location` fields (`city`, `locality`, `city_district`, `street`, `full_address`, `latitude`, `longitude`) are optional.

## Data model

```
location ──┐
building ──┤
owner    ──┼──< listing
features ──┘
```

Each `listing` references exactly one `location`, `building`, `owner` and `features` row.

| Table | Main columns |
| --- | --- |
| `location` | `city`, `locality`, `city_district`, `street`, `full_address`, `latitude`, `longitude` |
| `building` | `year_built`, `building_type`, `floor` |
| `owner` | `owner_type`, `contact_name`, `contact_phone`, `contact_email` |
| `features` | `has_basement`, `has_parking`, `kitchen_type`, `window_type`, `ownership_type`, `equipment` |
| `listing` | `rooms`, `area`, `price_total_zl`, `price_sqm_zl`, `price_per_sqm_detailed`, `date_posted`, `photo_count`, `url`, `image_url`, `description_text` + foreign keys to the four tables above |

## Database migrations

The schema is owned by Alembic (`alembic/versions/`). After changing `sql_app/models.py`:

```bash
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Alembic uses a synchronous engine, so `alembic/env.py` converts `sqlite+aiosqlite://` to `sqlite://` automatically; you only need to maintain `DATABASE_URL`.

## Project structure

```
services/backend/
├── main.py                  # FastAPI app, route handlers, auth dependency
├── config.py                # Settings (pydantic-settings)
├── sql_app/
│   ├── database.py          # Async engine, session factory, get_db dependency
│   ├── models.py            # SQLAlchemy ORM models
│   ├── security.py          # Password hashing (bcrypt) and JWT helpers
│   ├── schemas.py           # Pydantic request/response schemas
│   ├── init_db.py           # Runs `alembic upgrade head`
│   └── schema.sql           # Reference SQL schema (not used at runtime)
├── alembic/                 # Migration environment and versions
├── alembic.ini
├── setup.sh                 # Virtualenv + dependency installation
├── pyproject.toml
├── .env.example
└── .claude/                 # Claude Code settings
```

## Automated pull-request review

`.github/workflows/agent-review.yml` (repo root) runs an AI code review on every pull request. It uses the Codex CLI with the prompt in `.agent/review-prompt.md` and posts the findings as a PR comment. It requires an `OPENAI_API_KEY` repository secret.

## Notes

- `sql_app/database.py` creates the engine with `echo=True`, which logs every SQL statement. Turn it off before deploying to production.
- Local database files (`*.db`) and `.env` are git-ignored.
- Tests live in `tests/` and run with `pytest -q` (in-memory SQLite).
