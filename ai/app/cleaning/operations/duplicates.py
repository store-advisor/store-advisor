"""
Duplicate-handling operation.
"""

from __future__ import annotations

import pandas as pd


def remove_duplicates(df: pd.DataFrame) -> tuple[pd.DataFrame, int]:
    """Remove exact duplicate rows.

    Returns
    -------
    (cleaned_df, count_removed)
    """
    before = len(df)
    cleaned = df.drop_duplicates().reset_index(drop=True)
    return cleaned, before - len(cleaned)
