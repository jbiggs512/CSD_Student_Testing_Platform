FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim AS base

RUN useradd --create-home appuser
WORKDIR /app
RUN chown appuser:appuser /app

USER appuser

COPY --chown=appuser:appuser pyproject.toml uv.lock README.md ./

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

FROM base AS dev

RUN uv sync --locked --no-install-project --no-build

COPY --chown=appuser:appuser alembic.ini ./
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser src ./src
COPY --chown=appuser:appuser tests ./tests

EXPOSE 8000

# Run database migrations and start the development server with auto-reload
CMD ["sh", "-c", "uv run --no-sync alembic upgrade head && exec uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]

FROM base AS prod

RUN uv sync --locked --no-dev --no-install-project --no-build

COPY --chown=appuser:appuser alembic.ini ./
COPY --chown=appuser:appuser alembic ./alembic
COPY --chown=appuser:appuser src ./src

EXPOSE 8000

# Run database migrations and start the production server
CMD ["sh", "-c", "uv run --no-sync alembic upgrade head && exec uv run --no-sync uvicorn app.main:app --host 0.0.0.0 --port 8000"]
