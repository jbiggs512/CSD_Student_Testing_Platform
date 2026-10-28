# CSD Student Testing Platform

UFCFCR-30-3 Collaborative Software Development project.

## Quick Start (Docker Compose)

Run the frontend, backend and PostgreSQL database with live reloading using Docker Compose.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- Git, to clone the repository.

### Setup

1. Clone the repository and navigate to its root directory.
2. Create a `.env` file in the repository root containing:

   ```dotenv
   POSTGRES_PASSWORD=your_local_development_password
   ```

   Replace the example password with your own local development password. Do not commit this file.

3. Start the application:

   ```bash
   docker compose up --build
   ```

   This will automatically build the frontend, backend, and database, start the containers, and apply database migrations.

4. If you need to apply database migrations manually, you can run:

   ```bash
   docker compose exec backend uv run alembic upgrade head
   ```

   This creates the database schema in PostgreSQL.

### Application URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API documentation (Swagger UI):** http://localhost:8000/docs

### Stopping the application

Stop the containers with:

```bash
docker compose down
```

PostgreSQL data is stored in a Docker named volume and persists when containers are stopped or recreated. To deliberately remove the database volume, use `docker compose down -v`; **this deletes the persisted database data**.

### Running tests

To run backend tests, execute:

```bash
docker compose exec backend uv run pytest
```

## Project Structure

- [`backend/`](backend/README.md) — FastAPI Python backend managed with `uv`, SQLAlchemy and Alembic.
- [`frontend/`](frontend/README.md) — React 19, TypeScript and Vite frontend.
- `compose.yaml` — Docker Compose configuration for the frontend, backend and PostgreSQL.
- `.env` — Local environment configuration; do not commit secrets.