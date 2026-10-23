FROM ghcr.io/astral-sh/uv:python3.11-bookworm-slim

RUN useradd --create-home appuser
WORKDIR /app
RUN chown appuser:appuser /app

USER appuser

COPY --chown=appuser:appuser pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project --no-build

COPY --chown=appuser:appuser src ./src

ENV PATH="/app/.venv/bin:$PATH"
ENV PYTHONPATH="/app/src"

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

