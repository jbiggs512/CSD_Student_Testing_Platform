# Backend Setup Guide

This backend uses [uv](https://docs.astral.sh/uv/) for Python dependency management, FastAPI for the API, SQLAlchemy for database access, and Alembic for database migrations.

You can run the backend independently on your machine or run the complete application using Docker Compose. **Docker Compose with PostgreSQL is the recommended development setup** so the team uses a consistent database configuration.

## 1. Prerequisites

For local development, install:

- Python 3.11
- [uv](https://docs.astral.sh/uv/getting-started/installation/)

For the Docker-based setup, install [Docker Desktop](https://www.docker.com/products/docker-desktop/) and ensure it is running.

### Install uv

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

For other installation methods, see the [official uv installation guide](https://docs.astral.sh/uv/getting-started/installation/).

## 2. Recommended Setup: Docker Compose

The root `compose.yaml` starts the frontend, backend and PostgreSQL database together.

From the repository root, create a `.env` file containing:

```dotenv
POSTGRES_PASSWORD=your_local_development_password
```

Replace the example password with your own local development password. Keep this file out of version control.

Start the application:

```bash
docker compose up --build
```

Database migrations are applied automatically when the backend container starts. If you need to apply migrations manually, run:

```bash
docker compose exec backend uv run alembic upgrade head
```

The application will be available at:

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

### Docker database configuration

Inside Docker Compose, the backend connects to PostgreSQL using the service hostname `db`:

```text
postgresql+psycopg://student_app:<password>@db:5432/student_testing
```

The actual password is supplied through the root `.env` file and the Compose configuration.

PostgreSQL data is stored in the Docker named volume `postgres_data`. It persists across normal container stops and rebuilds, but it is not a backup.

Stop the application without deleting the database volume:

```bash
docker compose down
```

**Warning:** `docker compose down -v` removes the named volume and deletes its persisted database data.

## 3. Local Setup (Without Docker)

If you want to run the backend directly on your machine, navigate to `backend/`:

```bash
cd backend
uv sync
```

This creates a local virtual environment and installs the project dependencies specified in `pyproject.toml` and `uv.lock`.

Configure the backend's environment variables in `backend/.env`, using the settings expected by the application.

For example, to use SQLite locally:

```dotenv
DATABASE_URL=sqlite:///./dev.db
```

This creates or accesses `dev.db` relative to the backend's working directory.

If you want to run the backend locally against the PostgreSQL database started by Docker Compose, use `localhost:5432` as the database host rather than `db:5432`. The `db` hostname is intended for communication between Compose services.

## 4. Managing Dependencies

Use `uv add` to add a dependency:

```bash
uv add <package_name>
```

This updates `pyproject.toml` and `uv.lock`. Commit both files when the dependency change is ready to share.

To run commands inside the project's virtual environment, use `uv run`:

```bash
uv run <command>
```

**Examples:**

```bash
uv run python src/app/script.py
uv run pytest
```

## 5. Running the Backend Locally

From `backend/`, start the API server with:

```bash
uv run uvicorn app.main:app --reload
```

Uvicorn is the server that listens for HTTP requests and serves the FastAPI application.

The backend will normally be available at http://localhost:8000.

When using Docker Compose, the backend starts through the container configuration instead; you do not need to start a second local Uvicorn process.

## 6. Environment Configuration

The application settings are defined in `src/app/core/config.py`.

Keep the following distinction in mind:

- **Repository root `.env`:** supplies variables used by Docker Compose, including `POSTGRES_PASSWORD`.
- **`backend/.env`:** supplies application settings when running the backend directly on your machine.
- **Container environment:** Compose passes the backend's database URL and other configured variables into the container.

The database URL depends on where the backend is running:

| Backend location | Database host |
|---|---|
| Inside Docker Compose | `db:5432` |
| Directly on your machine | `localhost:5432` |

Do not commit passwords, secrets or local environment files.

## 7. Database and Migrations

The backend uses SQLAlchemy for database access and Alembic to manage schema changes. The recommended Docker Compose database is PostgreSQL.

Migration files live in `backend/alembic/versions/`, and the Alembic configuration is in `backend/alembic.ini`.

### Apply migrations

When running the backend locally, from `backend/`:

```bash
uv run alembic upgrade head
```

When using Docker Compose, from the repository root:

```bash
docker compose exec backend uv run alembic upgrade head
```

Note: This is applied automatically when the backend container starts, so you normally do not need to run it manually.
This applies outstanding migrations to the database configured for that execution environment.

### Check the current migration revision

Local backend:

```bash
uv run alembic current
```

Docker Compose:

```bash
docker compose exec backend uv run alembic current
```

### View migration history

```bash
uv run alembic history
```

Or, when using Docker Compose:

```bash
docker compose exec backend uv run alembic history
```

### Create a migration

After modifying SQLAlchemy models, generate a migration:

Local backend:

```bash
uv run alembic revision --autogenerate -m "describe your change"
```

Docker Compose:

```bash
docker compose exec backend uv run alembic revision --autogenerate -m "describe your change"
```

Review the generated migration carefully before applying it. Autogeneration does not identify every possible schema change correctly, and database-specific SQL or defaults may need adjustment.

Apply the migration using `uv run alembic upgrade head` in the environment you intend to update.

### Team workflow

1. Update the relevant SQLAlchemy model.
2. Generate and review the migration.
3. Test the migration against the project's target database, PostgreSQL.
4. Apply it locally and test the affected functionality.
5. Commit the model and migration files together.
6. Other developers pull the changes and apply the shared migration to their own database.

Do not commit local database files or database credentials.

## 8. Project Structure

```text
backend/
├── alembic/
│   ├── versions/          # Database migration scripts
│   └── env.py             # Alembic migration environment
├── alembic.ini            # Alembic configuration
├── src/
│   └── app/
│       ├── main.py        # FastAPI application entry point
│       ├── core/
│       │   └── config.py  # Application configuration
│       ├── db/
│       │   ├── base.py    # SQLAlchemy declarative base
│       │   ├── session.py # Engine and session configuration
│       │   └── models/    # Database models
│       └── api/
│           ├── deps.py    # Shared route dependencies
│           └── v1/
│               ├── router.py
│               └── auth/
│                   ├── router.py
│                   ├── schemas.py
│                   └── service.py
├── pyproject.toml
└── uv.lock
```

The exact modules may grow as new features are added. Keep route handlers focused on HTTP concerns, use Pydantic schemas for request and response validation, and put reusable business logic in service modules.

## 9. Accessing the API

When the backend is running locally or through Docker Compose, use:

| Resource | URL |
|---|---|
| Interactive API documentation | http://localhost:8000/docs |
| Alternative API documentation | http://localhost:8000/redoc |
| Health check | http://localhost:8000/health |
| Database health check, if implemented | http://localhost:8000/health/database |

The health-check endpoints depend on their implementation in the application. Swagger UI allows you to inspect available endpoints and send test requests directly from your browser.

## 10. Running Tests

From `backend/`, run:

```bash
uv run pytest
```

When using Docker Compose:

```bash
docker compose exec backend uv run pytest
```

Ensure tests are configured for the intended database. Tests that use SQLite do not, by themselves, demonstrate that PostgreSQL migrations and database operations work correctly.