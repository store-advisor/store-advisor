"""
Store Advisor — AI service.

Two surfaces, one process.

**Explain** (`/api/explain`) is the service's job per proposal section 6.5:
take a finding's evidence and return a plain-language explanation, a
confidence, and a severity. It does not find problems and it does not compute
numbers — both belong to the check engine, and that separation is what lets a
merchant trust the result. See `app/explain/grounding.py`, which refuses an
answer that invents a figure the check did not prove.

**Clean** (`/api/profile`, `/api/clean`) profiles and cleans tabular data:
deduplication, imputation, outlier handling, with a report of what changed.

They share a process because they share a runtime and nothing else — no
database, no state, no imports across the boundary. Splitting them into two
deployments would buy isolation neither one currently needs, and cost a
second image, a second health check and a second thing to start.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.cleaning import router as cleaning_router
from app.api.explain import router as explain_router

app = FastAPI(
    title="Store Advisor — AI service",
    description=(
        "Explains findings without inventing a number, and profiles and "
        "cleans tabular data."
    ),
    version="1.0.0",
)

# ── CORS ────────────────────────────────────────────────────────────────────
# Open because the only callers are the Next.js dashboard and the NestJS API,
# and neither the browser nor this service holds a credential worth stealing:
# there is no session here, no database, and no cookie to ride. Narrow this
# the moment either stops being true.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── routers ─────────────────────────────────────────────────────────────────
app.include_router(explain_router)
app.include_router(cleaning_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Liveness only. Deliberately does not check the Anthropic key.

    The key is needed by /api/explain and by nothing else, so a service
    without one is degraded, not dead: it still profiles, still cleans, and
    still answers this endpoint. docker-compose and CI both gate on it.
    """
    return {"status": "ok"}


@app.get("/")
def root() -> dict[str, object]:
    return {
        "service": "Store Advisor — AI service",
        "version": "1.0.0",
        "endpoints": [
            "/api/explain",
            "/api/profile",
            "/api/clean",
            "/api/clean/download",
            "/health",
            "/docs",
        ],
    }
