FROM python:3.12-slim AS backend-builder

WORKDIR /app/backend

RUN pip install --no-cache-dir uv

COPY backend/pyproject.toml .
RUN uv sync --frozen --no-dev

COPY backend/app/ ./app/

FROM node:20-alpine AS frontend-builder

WORKDIR /app/frontend

COPY frontend/package.json frontend/package-lock.json* ./
RUN npm ci

COPY frontend/ .

RUN npm run build

FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

COPY --from=backend-builder /app/backend /app/backend
COPY --from=frontend-builder /app/frontend /app/frontend

WORKDIR /app/backend

RUN pip install --no-cache-dir uv && \
    uv sync --frozen --no-dev

EXPOSE 8000

ENV PYTHONPATH=/app/backend

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
