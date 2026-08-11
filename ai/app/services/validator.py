"""
Post-cleaning validator — checks that a cleaned DataFrame is structurally
sound and reports what changed compared to the original.

Validation rules (from PDF §16):
- Dataset must not become empty unless explicitly intended.
- Column count must not unexpectedly become zero.
- Duplicate count should be reported after cleaning.
- Missing-value count should be reported after cleaning.
- Data types should be compared before and after cleaning.
- Number of removed rows should be recorded.
"""

from __future__ import annotations

import pandas as pd


def validate_dataset(
    original: pd.DataFrame,
    cleaned: pd.DataFrame,
    *,
    allow_empty: bool = False,
) -> dict:
    """Compare *original* and *cleaned* DataFrames and return a validation
    report.

    Returns
    -------
    dict with keys:
        status             — "PASS" or "FAIL"
        errors             — list of human-readable error strings
        rows_before        — int
        rows_after         — int
        rows_removed       — int
        columns_before     — int
        columns_after      — int
        columns_dropped    — list of dropped column names
        duplicate_rows     — int  (in cleaned)
        missing_values     — int  (total in cleaned)
        dtype_changes      — dict mapping column -> {"before": ..., "after": ...}
    """
    errors: list[str] = []

    rows_before = len(original)
    rows_after = len(cleaned)
    cols_before = len(original.columns)
    cols_after = len(cleaned.columns)

    dropped_cols = sorted(set(original.columns) - set(cleaned.columns))

    # ── structural checks ────────────────────────────────────────────────
    if rows_after == 0 and not allow_empty:
        errors.append("Cleaned dataset is empty (0 rows).")
    if cols_after == 0:
        errors.append("Cleaned dataset has 0 columns.")

    # ── dtype comparison ─────────────────────────────────────────────────
    dtype_changes: dict[str, dict[str, str]] = {}
    for col in cleaned.columns:
        if col in original.columns:
            before_dt = str(original[col].dtype)
            after_dt = str(cleaned[col].dtype)
            if before_dt != after_dt:
                dtype_changes[col] = {"before": before_dt, "after": after_dt}

    # ── summary stats on cleaned ─────────────────────────────────────────
    dup_count = int(cleaned.duplicated().sum())
    missing_count = int(cleaned.isna().sum().sum())

    status = "FAIL" if errors else "PASS"

    return {
        "status": status,
        "errors": errors,
        "rows_before": rows_before,
        "rows_after": rows_after,
        "rows_removed": rows_before - rows_after,
        "columns_before": cols_before,
        "columns_after": cols_after,
        "columns_dropped": dropped_cols,
        "duplicate_rows": dup_count,
        "missing_values": missing_count,
        "dtype_changes": dtype_changes,
    }
