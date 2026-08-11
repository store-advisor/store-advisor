"""
Missing-value handling operations.

Basic  — numerical → median, categorical → mode
Advanced — drop columns with >50 % missing, impute the rest
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def handle_missing_values_basic(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, dict[str, str]]:
    """Fill missing values with simple rules.

    Returns
    -------
    (cleaned_df, actions)
        *actions* maps column name → strategy string used
    """
    df = df.copy()
    actions: dict[str, str] = {}

    for col in df.columns:
        if df[col].isna().sum() == 0:
            continue

        if pd.api.types.is_numeric_dtype(df[col]):
            fill_val = df[col].median()
            df[col] = df[col].fillna(fill_val)
            actions[col] = "median"
        else:
            mode = df[col].mode()
            if not mode.empty:
                df[col] = df[col].fillna(mode.iloc[0])
                actions[col] = "mode"
            else:
                df[col] = df[col].fillna("Unknown")
                actions[col] = "unknown_constant"

    return df, actions


def handle_missing_values_advanced(
    df: pd.DataFrame,
    profile: dict,
) -> tuple[pd.DataFrame, dict[str, str], list[str]]:
    """Profile-driven missing-value handling.

    Decision rules (PDF §10):
    - Column with >50 % missing → drop the column.
    - Numerical missing → median.
    - Categorical missing → mode, or "Unknown" if mode is empty.

    Returns
    -------
    (cleaned_df, actions, dropped_columns)
    """
    df = df.copy()
    actions: dict[str, str] = {}
    dropped: list[str] = []

    col_lookup = {c["name"]: c for c in profile.get("columns", [])}

    for col in list(df.columns):
        col_info = col_lookup.get(col, {})
        missing_pct = col_info.get("missing_percentage", 0.0)

        if df[col].isna().sum() == 0:
            continue

        # Drop column if more than 50 % missing
        if missing_pct > 50:
            df = df.drop(columns=[col])
            dropped.append(col)
            actions[col] = "dropped (>50% missing)"
            continue

        # Impute
        if pd.api.types.is_numeric_dtype(df[col]):
            fill_val = df[col].median()
            df[col] = df[col].fillna(fill_val)
            actions[col] = "median"
        else:
            mode = df[col].mode()
            if not mode.empty:
                df[col] = df[col].fillna(mode.iloc[0])
                actions[col] = "mode"
            else:
                df[col] = df[col].fillna("Unknown")
                actions[col] = "unknown_constant"

    return df, actions, dropped
