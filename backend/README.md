# Backend Setup Guide

This backend uses [`uv`](https://github.com/astral-sh/uv), an extremely fast Python package and project manager.

## 1. Install `uv`

If you haven't installed `uv` on your system yet, you can install it using one of the following methods:

**Windows (PowerShell):**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
```

**macOS / Linux:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
```

_(For other installation methods like Homebrew or pip, check the [official uv docs](https://docs.astral.sh/uv/getting-started/installation/))._

---

## 2. Setup the Project (Install Dependencies)

Once `uv` is installed, you need to set up the project locally. Make sure you are inside the `backend/` directory, then run:

```bash
uv sync
```

**What this does:**

- Creates an isolated virtual environment (`.venv`) for you automatically.
- Installs all the dependencies listed in `pyproject.toml` and locks them to the exact versions in `uv.lock`.

---

## 3. Adding New Packages

To add a new library to the project, use the `uv add` command:

```bash
uv add <package_name>
```

This will automatically download the package, update your `pyproject.toml`, and update the `uv.lock` file. (Make sure to commit the updated `uv.lock` file to version control).

---

## 4. Running the Backend

Whenever you need to run a script, start a server, or run a database migration, you should prefix your command with `uv run`.

This ensures that the command executes _inside_ the isolated virtual environment without you needing to manually activate it.

**General Syntax:**

```bash
uv run <command>
```

**Examples:**

- Running a custom python script: `uv run python src/app/script.py`
- Running the API web server:

  ```bash
  uv run uvicorn app.main:app --reload
  ```

  _(**Note:** FastAPI is just the framework we write our code in. **Uvicorn** is the actual server engine that listens for web traffic on port 8000 and hands it to our app)._

- Running database migrations (e.g., using alembic): `uv run alembic upgrade head`

---

## 5. Project Structure

```
src/app/
├── main.py              # App entry point — creates the FastAPI instance, registers middleware
├── core/
│   └── config.py        # App settings loaded from .env (project name, CORS origins, etc.)
└── api/
    ├── deps.py          # Shared dependencies used by all routes (auth checks, DB sessions)
    └── v1/
        ├── router.py    # Combines all domain routers into one (/auth, /users, /tests, etc.)
        └── auth/        # Example domain module — each feature gets its own folder like this
            ├── router.py    # Route handlers — kept thin, just wires requests to the service
            ├── schemas.py   # Pydantic models — defines what request/response JSON looks like
            └── service.py   # Business logic — the actual work (DB queries, hashing, etc.)
```

When adding a new feature (e.g. `users`), just copy the `auth/` folder structure, rename it, and plug it into `v1/router.py`.
