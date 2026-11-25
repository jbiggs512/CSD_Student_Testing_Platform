# Altius

UFCFCR-30-3 Collaborative Software Development project (**Altius**), created by **Jack Biggs**, **Emily Shiel**, and **Charlie Eldergill**.

A role-based student testing and assessment platform with a React/TypeScript frontend, FastAPI backend, and PostgreSQL database.

## Features

- **Authentication & Security:** Unified login, student registration with lecturer approval, password reset via email, MFA support, and account lockout protection.
- **Student Dashboard:** View outstanding and completed tests, take timed multiple-choice assessments, view personal statistics and grade history (with Excel/CSV export), and check cohort leaderboards.
- **Lecturer Dashboard:** Manage student accounts (approve, reject, edit, disable, delete), manage subject question pools, and create/edit/delete tests.
- **Administration Dashboard:** Manage subjects (create, edit, archive) and lecturer accounts (create, edit, reset password, disable, soft-delete with audit logging).

## Quick Start (Docker Compose)

Run the frontend, backend, and PostgreSQL database with live reloading using Docker Compose.

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running.
- Git, to clone the repository.

### Setup

1. Clone the repository and navigate to its root directory.
2. Create a `.env` file in the repository root from `.env.example`:

   ```bash
   cp .env.example .env
   ```

   Update `POSTGRES_PASSWORD` with your own local development password. Optionally configure Azure Communication Services variables (`AZURE_COMMUNICATION_CONNECTION_STRING`, `AZURE_COMMUNICATION_SENDER_EMAIL`, `FRONTEND_URL`) if testing email delivery. Do not commit `.env`.

3. Start the application:

   ```bash
   docker compose up --build
   ```

   This builds the frontend, backend, and database containers, starts them with hot reload, and automatically applies database migrations.

4. (Optional) Seed the database with sample data (roles, courses, subjects, question pools, tests, users, and sample attempts):

   ```bash
   docker compose exec backend uv run python -m app.db.scripts.seed_all --migrate
   ```

   Default development demo accounts (password: `Password123!`):
   - **Admin:** `admin`
   - **Lecturer:** `lecturer`
   - **Student:** `student` (and `student.pending` for testing account approval)

5. If you need to apply database migrations manually, run:

   ```bash
   docker compose exec backend uv run alembic upgrade head
   ```

### Application URLs

- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:8000
- **API documentation (Swagger UI):** http://localhost:8000/docs
- **Alternative API documentation (ReDoc):** http://localhost:8000/redoc

### Stopping the application

Stop the containers with:

```bash
docker compose down
```

PostgreSQL data is stored in a Docker named volume (`postgres_data`) and persists when containers are stopped or recreated. To deliberately remove the database volume, use `docker compose down -v`; **this deletes the persisted database data**.

## Running Tests & Checks

### Backend

```bash
docker compose exec backend uv run pytest
```

### Frontend

```bash
docker compose exec frontend npm run test
docker compose exec frontend npm run lint
docker compose exec frontend npm run build
```

For running either service locally without Docker, see [`backend/README.md`](backend/README.md) and [`frontend/README.md`](frontend/README.md).

## Email Configuration (Azure Communication Services)

Outbound transactional emails (using branded HTML templates in `backend/src/app/core/email_templates.py`) are sent through **Azure Communication Services (ACS) Email** (`backend/src/app/core/email.py`).

Configure the following environment variables in `.env` (locally) or in Azure App Service settings:

- `AZURE_COMMUNICATION_CONNECTION_STRING` — Connection string for your Azure Communication Services resource.
- `AZURE_COMMUNICATION_SENDER_EMAIL` — Verified sender address (e.g. `DoNotReply@<domain>.azurecomm.net`).
- `FRONTEND_URL` — Base URL used for links inside emails (defaults to `http://localhost:5173` in local Docker Compose).

If these variables are left unset during local development, the application still runs normally and only raises an error when an email send is triggered.

## Azure Hosting & Deployment

The platform is hosted on **Microsoft Azure** using infrastructure-as-code defined in [`infra/main.bicep`](infra/main.bicep):

- **Azure App Service (Linux, Multi-Container):** Hosts both the frontend and backend containers together via Docker Compose ([`infra/docker-compose.azure.yml`](infra/docker-compose.azure.yml)). The frontend serves the app on port 80 and proxies `/api/v1` requests internally to the backend.
- **Azure Database for PostgreSQL – Flexible Server:** PostgreSQL 16 (`Standard_B1ms`) hosting the `student_testing` database with SSL required (`sslmode=require`).
- **GitHub Container Registry (GHCR):** Stores built frontend and backend Docker images (`ghcr.io`).

### CI/CD Pipeline

Deployments are automated via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) using Azure OIDC authentication:

- Pushing to `development` builds and pushes container images to GHCR and deploys to the **dev** environment (`rg-altius-dev`).
- Pushing to `master` builds and pushes container images to GHCR and deploys to the **production** environment (`rg-altius-prod`).

## Project Structure

- [`backend/`](backend/README.md) — FastAPI Python backend managed with `uv`, SQLAlchemy, and Alembic.
- [`frontend/`](frontend/README.md) — React 19, TypeScript, and Vite frontend.
- `infra/` — Azure deployment scripts, Bicep templates (`main.bicep`), and production Compose configuration (`docker-compose.azure.yml`).
- `docker-compose.yml` — Local Docker Compose configuration for the frontend, backend, and PostgreSQL.
- `.env.example` — Template for local environment variables (copy to `.env`; do not commit secrets).
