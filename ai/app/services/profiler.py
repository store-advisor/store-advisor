"""
Data Profiler — produces machine-readable metadata about a DataFrame.

Covers:
- Dataset-level stats  (rows, columns, duplicate_rows)
- Per-column stats     (dtype, missing_count, missing_percentage, unique_count)
- Numerical stats      (mean, median, min, max, Q1, Q3, skewness)
- Categorical stats    (top values / frequencies)
- Quality flags        (constant column, high missingness, possible identifier)
"""

from __future__ import annotations

import numpy as np
import pandas as pd
from scipy import stats as sp_stats


# ── helpers ──────────────────────────────────────────────────────────────────

def _is_possible_identifier(series: pd.Series) -> bool:
    """Heuristic: a column is a possible identifier if every value is unique
    and the column is either integer or object type."""
    if series.nunique() != len(series.dropna()):
        return False
    return series.dtype.kind in ("i", "u", "O")


def _column_quality_flags(series: pd.Series, missing_pct: float) -> list[str]:
    """Return a list of quality-flag strings for one column."""
    flags: list[str] = []
    if series.nunique() <= 1:
        flags.append("constant_column")
    if missing_pct > 50:
        flags.append("high_missingness")
    if _is_possible_identifier(series):
        flags.append("possible_identifier")
    return flags


# ── per-column profiling ─────────────────────────────────────────────────────

def _profile_numerical(series: pd.Series) -> dict:
    """Statistics for a numerical column."""
    clean = series.dropna()
    if clean.empty:
        return {}
    return {
        "mean": float(clean.mean()),
        "median": float(clean.median()),
        "min": float(clean.min()),
        "max": float(clean.max()),
        "q1": float(clean.quantile(0.25)),
        "q3": float(clean.quantile(0.75)),
        "std": float(clean.std()),
        "skewness": float(sp_stats.skew(clean, nan_policy="omit")),
    }


def _profile_categorical(series: pd.Series, top_n: int = 5) -> dict:
    """Statistics for a categorical / object column."""
    counts = series.value_counts(dropna=True)
    top = counts.head(top_n)
    return {
        "top_values": {str(k): int(v) for k, v in top.items()},
    }


def _profile_column(series: pd.Series) -> dict:
    """Full profile for a single column."""
    total = len(series)
    missing = int(series.isna().sum())
    missing_pct = round(missing / total * 100, 2) if total else 0.0

    info: dict = {
        "name": series.name,
        "dtype": str(series.dtype),
        "missing_count": missing,
        "missing_percentage": missing_pct,
        "unique_count": int(series.nunique()),
        "quality_flags": _column_quality_flags(series, missing_pct),
    }

    if pd.api.types.is_numeric_dtype(series):
        info["numerical_stats"] = _profile_numerical(series)
    else:
        info["categorical_stats"] = _profile_categorical(series)

    return info


# ── dataset-level profiling ──────────────────────────────────────────────────

def profile_dataset(df: pd.DataFrame) -> dict:
    """Return a complete, JSON-serialisable profile of *df*.

    Returns
    -------
    dict with keys:
        dataset   — row/column/duplicate-level summary
        columns   — list of per-column profiles
    """
    rows, cols = df.shape

    dataset_info = {
        "rows": rows,
        "columns": cols,
        "duplicate_rows": int(df.duplicated().sum()),
    }

    column_profiles = [_profile_column(df[c]) for c in df.columns]

    return {
        "dataset": dataset_info,
        "columns": column_profiles,
    }
