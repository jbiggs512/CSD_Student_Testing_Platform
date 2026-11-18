FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

RUN useradd --create-home appuser
WORKDIR /app
RUN chown appuser:appuser /app

USER appuser

COPY --chown=appuser:appuser pyproject.toml uv.lock README.md ./
COPY --chown=appuser:appuser alembic.ini ./
COPY --chown=appuser:appuser alembic ./alembic

RUN uv sync --locked --no-dev --no-install-project --no-build

COPY --chown=appuser:appuser src ./src

# Tests are copied to allow running them in the container, but they are not required for the application to run.
# Temporary: Not necessary for live deployment, but useful for testing in the container. 
# Remove this line when tests are no longer needed in the container.
COPY --chown=appuser:appuser tests ./tests

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

EXPOSE 8000

# Run database migrations and start the application
CMD ["sh", "-c", "uv run alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"]
