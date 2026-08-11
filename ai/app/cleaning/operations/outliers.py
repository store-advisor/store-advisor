"""
Outlier detection and handling operations.

Methods: IQR-based detection, removal, and capping (winsorisation).
Only applied to truly numerical columns — never to categoricals,
identifiers, or text (PDF §8 restriction).
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def _iqr_bounds(series: pd.Series) -> tuple[float, float]:
    """Return (lower_bound, upper_bound) for IQR fencing."""
    q1 = series.quantile(0.25)
    q3 = series.quantile(0.75)
    iqr = q3 - q1
    return float(q1 - 1.5 * iqr), float(q3 + 1.5 * iqr)


def detect_outliers_iqr(
    df: pd.DataFrame, column: str
) -> pd.Series:
    """Return a boolean mask (True = outlier) for *column*."""
    lower, upper = _iqr_bounds(df[column])
    return (df[column] < lower) | (df[column] > upper)


def remove_outliers_iqr(
    df: pd.DataFrame, column: str
) -> tuple[pd.DataFrame, int]:
    """Remove rows where *column* has IQR outliers.

    Returns
    -------
    (cleaned_df, count_removed)
    """
    mask = detect_outliers_iqr(df, column)
    removed = int(mask.sum())
    return df[~mask].reset_index(drop=True), removed


def cap_outliers(
    df: pd.DataFrame, column: str
) -> tuple[pd.DataFrame, int]:
    """Winsorise: cap values at the IQR lower/upper bounds.

    Returns
    -------
    (cleaned_df, count_capped)
    """
    df = df.copy()
    lower, upper = _iqr_bounds(df[column])
    mask = detect_outliers_iqr(df, column)
    count_capped = int(mask.sum())
    df[column] = df[column].clip(lower=lower, upper=upper)
    return df, count_capped
