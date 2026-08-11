"""
Pydantic schemas for the cleaning API (PDF §13).
"""

from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


# ── Request models ───────────────────────────────────────────────────────────

class CleanRequest(BaseModel):
    """Query parameters for the cleaning endpoint."""
    pipeline: str = Field(
        default="basic",
        description="Pipeline to run: basic | advanced | agent",
    )


# ── Response models ──────────────────────────────────────────────────────────

class RowStats(BaseModel):
    before: int
    after: int


class DuplicateStats(BaseModel):
    removed: int


class ValidationResult(BaseModel):
    status: str
    errors: list[str] = []
    rows_before: int = 0
    rows_after: int = 0
    rows_removed: int = 0
    columns_before: int = 0
    columns_after: int = 0
    columns_dropped: list[str] = []
    duplicate_rows: int = 0
    missing_values: int = 0
    dtype_changes: dict[str, Any] = {}


class CleanResponse(BaseModel):
    """JSON body returned alongside the cleaned CSV download."""
    pipeline: str
    rows: RowStats
    duplicates: DuplicateStats
    missing_values: dict[str, str] = {}
    dropped_columns: list[str] = []
    outliers: dict[str, str] = {}
    type_changes: dict[str, Any] = {}
    validation: ValidationResult


class ProfileColumnResponse(BaseModel):
    name: str
    dtype: str
    missing_count: int
    missing_percentage: float
    unique_count: int
    quality_flags: list[str] = []
    numerical_stats: Optional[dict[str, Any]] = None
    categorical_stats: Optional[dict[str, Any]] = None


class ProfileDatasetResponse(BaseModel):
    rows: int
    columns: int
    duplicate_rows: int


class ProfileResponse(BaseModel):
    dataset: ProfileDatasetResponse
    columns: list[ProfileColumnResponse]
