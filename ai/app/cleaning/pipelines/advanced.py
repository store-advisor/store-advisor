"""
Advanced Pipeline — MVB (PDF §9-10).

Profile-driven decisions:
- Missing >50 %  → drop the column.
- Numerical missing → median.
- Categorical missing → mode / "Unknown".
- Outliers <5 % → remove.
- Outliers 5-15 % → cap (winsorise).
- Outliers >15 % → keep and flag.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.cleaning.operations.duplicates import remove_duplicates
from app.cleaning.operations.missing_values import handle_missing_values_advanced
from app.cleaning.operations.outliers import (
    cap_outliers,
    detect_outliers_iqr,
    remove_outliers_iqr,
)
from app.cleaning.report import CleaningReport
from app.services.profiler import profile_dataset
from app.services.validator import validate_dataset


def _outlier_percentage(df: pd.DataFrame, column: str) -> float:
    """Return the percentage of rows that are IQR outliers."""
    mask = detect_outliers_iqr(df, column)
    total = len(df)
    return (mask.sum() / total * 100) if total else 0.0


def advanced_pipeline(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, CleaningReport]:
    """Run the advanced (profile-driven) cleaning pipeline.

    Returns
    -------
    (cleaned_df, report)
    """
    original = df.copy()
    df = df.copy()
    report = CleaningReport(pipeline="advanced", rows_before=len(df))

    # Profile first
    profile = profile_dataset(df)

    # 1. Duplicates
    df, dup_count = remove_duplicates(df)
    report.record_duplicates(dup_count)

    # 2. Missing values (advanced)
    df, mv_actions, dropped = handle_missing_values_advanced(df, profile)
    report.record_missing(mv_actions)
    report.record_dropped_columns(dropped)

    # 3. Outliers — rule-based on numerical columns
    for col in df.select_dtypes(include=np.number).columns:
        pct = _outlier_percentage(df, col)
        if pct == 0:
            continue

        if pct < 5:
            df, removed = remove_outliers_iqr(df, col)
            report.record_outlier(col, f"removed ({removed} rows, {pct:.1f}%)")
        elif pct <= 15:
            df, capped = cap_outliers(df, col)
            report.record_outlier(col, f"capped ({capped} values, {pct:.1f}%)")
        else:
            report.record_outlier(col, f"retained (flagged, {pct:.1f}%)")

    # Validation
    report.rows_after = len(df)
    validation = validate_dataset(original, df)
    report.record_validation(validation)

    return df, report
