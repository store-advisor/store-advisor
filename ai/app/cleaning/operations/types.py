"""
Data-type fixing operation.

Converts columns to specified types and auto-detects numeric-looking
string columns.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


def fix_data_types(
    df: pd.DataFrame,
    rules: dict[str, str] | None = None,
) -> tuple[pd.DataFrame, dict[str, dict[str, str]]]:
    """Fix / convert column data types.

    Parameters
    ----------
    df : DataFrame
    rules : optional dict mapping column_name → target dtype string
            (e.g. ``{"age": "int64", "price": "float64"}``).
            If *None*, the function auto-detects object columns that
            look numeric and converts them.

    Returns
    -------
    (cleaned_df, changes)
        *changes* maps column → {"before": old_dtype, "after": new_dtype}
    """
    df = df.copy()
    changes: dict[str, dict[str, str]] = {}

    if rules:
        for col, target_dtype in rules.items():
            if col not in df.columns:
                continue
            before = str(df[col].dtype)
            try:
                df[col] = df[col].astype(target_dtype)
                after = str(df[col].dtype)
                if before != after:
                    changes[col] = {"before": before, "after": after}
            except (ValueError, TypeError):
                pass  # skip columns that cannot be converted
    else:
        # Auto-detect object columns that can be numeric
        for col in df.select_dtypes(include=["object"]).columns:
            before = str(df[col].dtype)
            converted = pd.to_numeric(df[col], errors="coerce")
            # If at least 80 % of non-null values converted successfully
            non_null = df[col].notna().sum()
            if non_null == 0:
                continue
            converted_ok = converted.notna().sum()
            if converted_ok / non_null >= 0.8:
                df[col] = converted
                after = str(df[col].dtype)
                if before != after:
                    changes[col] = {"before": before, "after": after}

    return df, changes
