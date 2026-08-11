"""
FastAPI router for cleaning & profiling endpoints (PDF §13).
"""

from __future__ import annotations

import io
import tempfile
from pathlib import Path

import pandas as pd
from fastapi import APIRouter, File, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from app.cleaning.pipeline_runner import run_pipeline
from app.schemas.cleaning import CleanResponse, ProfileResponse
from app.services.profiler import profile_dataset

router = APIRouter(prefix="/api", tags=["cleaning"])

# ── helpers ──────────────────────────────────────────────────────────────────

_SUPPORTED_EXTENSIONS = {".csv", ".xlsx", ".xls", ".json"}


def _load_upload(upload: UploadFile) -> pd.DataFrame:
    """Read an uploaded file into a DataFrame."""
    suffix = Path(upload.filename or "").suffix.lower()

    if suffix not in _SUPPORTED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Unsupported file type '{suffix}'. "
                f"Supported: {', '.join(sorted(_SUPPORTED_EXTENSIONS))}"
            ),
        )

    content = upload.file.read()
    buf = io.BytesIO(content)

    if suffix == ".csv":
        return pd.read_csv(buf)
    elif suffix in (".xlsx", ".xls"):
        return pd.read_excel(buf)
    elif suffix == ".json":
        return pd.read_json(buf)
    else:
        raise HTTPException(status_code=400, detail="Unsupported file type.")


# ── endpoints ────────────────────────────────────────────────────────────────


@router.post("/profile", response_model=ProfileResponse)
async def profile_endpoint(file: UploadFile = File(...)):
    """Upload a file and receive its data profile."""
    df = _load_upload(file)
    profile = profile_dataset(df)
    return profile


@router.post("/clean")
async def clean_endpoint(
    file: UploadFile = File(...),
    pipeline: str = Query(
        default="basic",
        description="Pipeline to run: basic | advanced",
    ),
):
    """Upload a file, clean it with the chosen pipeline, and receive
    the cleaned CSV plus a JSON report.

    Returns
    -------
    JSON body with the cleaning report and a ``download_url`` hint.
    The cleaned CSV is returned as a streaming file attachment.
    """
    if pipeline not in ("basic", "advanced"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pipeline '{pipeline}'. Use 'basic' or 'advanced'.",
        )

    df = _load_upload(file)

    try:
        cleaned_df, report = run_pipeline(df, pipeline=pipeline)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))

    # Prepare CSV bytes for download
    csv_buffer = io.StringIO()
    cleaned_df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue().encode("utf-8")

    return {
        "report": report.to_dict(),
        "cleaned_csv_base64": __import__("base64").b64encode(csv_bytes).decode(),
    }


@router.post("/clean/download")
async def clean_download_endpoint(
    file: UploadFile = File(...),
    pipeline: str = Query(default="basic"),
):
    """Same as /api/clean but returns the cleaned CSV directly as a file."""
    if pipeline not in ("basic", "advanced"):
        raise HTTPException(
            status_code=400,
            detail=f"Invalid pipeline '{pipeline}'. Use 'basic' or 'advanced'.",
        )

    df = _load_upload(file)
    cleaned_df, _ = run_pipeline(df, pipeline=pipeline)

    csv_buffer = io.StringIO()
    cleaned_df.to_csv(csv_buffer, index=False)
    csv_bytes = csv_buffer.getvalue().encode("utf-8")

    return StreamingResponse(
        io.BytesIO(csv_bytes),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=cleaned.csv"},
    )
