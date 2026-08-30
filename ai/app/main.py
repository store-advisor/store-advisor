"""
Store Advisor - AI service.

Its one job, per HANDBOOK.md section 5: take a finding's evidence and return a
plain-language explanation, a confidence, and a severity. It does not find
problems and it does not compute numbers. Both of those belong to the check
engine, and the separation is what lets a merchant trust the result.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.explain import router as explain_router

app = FastAPI(
    title="Store Advisor - AI service",
    description="Explains findings. Never invents a number.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(explain_router)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}
