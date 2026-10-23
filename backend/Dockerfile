FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

RUN useradd --create-home appuser
WORKDIR /app

COPY --chown=appuser:appuser pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project --no-build

COPY --chown=appuser:appuser src ./src
RUN uv sync --locked --no-dev --no-editable # NOSONAR

ENV PATH="/app/.venv/bin:$PATH"
USER appuser

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
