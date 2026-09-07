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


# ── Manual (per-column strategy) pipeline ──────────────────────────────

# Maps frontend label strings → internal action keys
_MISSING_STRATEGY_MAP: dict[str, str] = {
    "Median": "median",
    "Mean": "mean",
    "Mode": "mode",
    "Drop column": "drop",
    "Fill with 0": "fill_zero",
    "Fill with 'Unknown'": "fill_unknown",
    "Fill with Unknown": "fill_unknown",
}

_OUTLIER_STRATEGY_MAP: dict[str, str] = {
    "Remove": "remove",
    "Cap (Winsorise)": "cap",
    "Cap": "cap",
    "Keep": "keep",
}


def _apply_missing_strategy(
    df: pd.DataFrame,
    col: str,
    strategy: str,
    actions: dict[str, str],
    dropped: list[str],
) -> pd.DataFrame:
    """Apply a single missing-value strategy to one column."""
    key = _MISSING_STRATEGY_MAP.get(strategy, strategy.lower())

    if key == "drop":
        df = df.drop(columns=[col])
        dropped.append(col)
        actions[col] = f"dropped (user selected)"
        return df

    if key == "median":
        df[col] = df[col].fillna(df[col].median())
        actions[col] = "median"
    elif key == "mean":
        df[col] = df[col].fillna(df[col].mean())
        actions[col] = "mean"
    elif key == "mode":
        mode = df[col].mode()
        fill = mode.iloc[0] if not mode.empty else ("Unknown" if not pd.api.types.is_numeric_dtype(df[col]) else 0)
        df[col] = df[col].fillna(fill)
        actions[col] = "mode"
    elif key == "fill_zero":
        df[col] = df[col].fillna(0)
        actions[col] = "fill_zero"
    elif key == "fill_unknown":
        df[col] = df[col].fillna("Unknown")
        actions[col] = "fill_unknown"
    else:
        # Fallback: mode for categoricals, median for numerics
        if pd.api.types.is_numeric_dtype(df[col]):
            df[col] = df[col].fillna(df[col].median())
            actions[col] = "median (fallback)"
        else:
            mode = df[col].mode()
            df[col] = df[col].fillna(mode.iloc[0] if not mode.empty else "Unknown")
            actions[col] = "mode (fallback)"

    return df


def manual_pipeline(
    df: pd.DataFrame,
    dup_strategy: str = "remove",
    missing_strategies: dict[str, str] | None = None,
    outlier_strategies: dict[str, str] | None = None,
) -> tuple[pd.DataFrame, CleaningReport]:
    """Run the manual (user-configured per-column) cleaning pipeline.

    Parameters
    ----------
    df : DataFrame to clean.
    dup_strategy : 'remove' or 'keep'.
    missing_strategies : column_name -> strategy label from the frontend.
    outlier_strategies : column_name -> strategy label from the frontend.

    Returns
    -------
    (cleaned_df, CleaningReport)
    """
    missing_strategies = missing_strategies or {}
    outlier_strategies = outlier_strategies or {}

    original = df.copy()
    df = df.copy()
    report = CleaningReport(pipeline="manual", rows_before=len(df))

    # 1. Duplicates
    if dup_strategy == "remove":
        df, dup_count = remove_duplicates(df)
        report.record_duplicates(dup_count)
    else:
        report.record_duplicates(0)

    # 2. Missing values — apply per-column user strategy
    mv_actions: dict[str, str] = {}
    dropped: list[str] = []

    for col in list(df.columns):  # list() because we may drop columns mid-loop
        if df[col].isna().sum() == 0:
            continue  # no missing — skip
        strategy = missing_strategies.get(col)
        if not strategy:
            continue  # no strategy specified — leave as-is
        df = _apply_missing_strategy(df, col, strategy, mv_actions, dropped)

    report.record_missing(mv_actions)
    report.record_dropped_columns(dropped)

    # 3. Outliers — apply per-column user strategy
    for col in list(df.columns):
        if not pd.api.types.is_numeric_dtype(df[col]):
            continue
        strategy_label = outlier_strategies.get(col)
        if not strategy_label:
            continue
        key = _OUTLIER_STRATEGY_MAP.get(strategy_label, "keep")
        pct = _outlier_percentage(df, col)

        if key == "remove" and pct > 0:
            df, removed = remove_outliers_iqr(df, col)
            report.record_outlier(col, f"removed ({removed} rows, {pct:.1f}%)")
        elif key == "cap" and pct > 0:
            df, capped = cap_outliers(df, col)
            report.record_outlier(col, f"capped ({capped} values, {pct:.1f}%)")
        else:
            if pct > 0:
                report.record_outlier(col, f"kept (user selected, {pct:.1f}%)")

    # Validation
    report.rows_after = len(df)
    validation = validate_dataset(original, df)
    report.record_validation(validation)

    return df, report
