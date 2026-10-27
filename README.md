# CSD Student Testing Platform

UFCFCR-30-3 Collaborative Software Development project.

## Quick Start (Docker Compose)

Run both the frontend and backend with live-reloading using Docker Compose:

```bash
docker compose up --build
```

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Docs (Swagger UI)**: http://localhost:8000/docs

To stop the containers:

```bash
docker compose down
```

## Project Structure

- [`backend/`](backend/README.md) - FastAPI Python backend managed with `uv`
- [`frontend/`](frontend/README.md) - React 19, TypeScript, and Vite frontend
