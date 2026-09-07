"""
Store Advisor — FastAPI application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.cleaning import router as cleaning_router

app = FastAPI(
    title="Store Advisor — Data Cleaning API",
    description=(
        "Upload tabular data and clean it using Basic or Advanced pipelines. "
        "Profile datasets before cleaning to understand their structure."
    ),
    version="1.0.0",
)

# ── CORS (allow the frontend to call the API) ───────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── routers ─────────────────────────────────────────────────────────────────
app.include_router(cleaning_router)


@app.get("/")
async def root():
    return {
        "service": "Store Advisor — Data Cleaning API",
        "version": "1.0.0",
        "endpoints": [
            "/api/profile",
            "/api/clean",
            "/api/clean/download",
            "/docs",
        ],
    }
