"""
Basic Pipeline — MVB (PDF §8).

Fixed sequence:
1. Remove exact duplicate rows.
2. Fill missing values (numerical → median, categorical → mode).
3. Remove IQR outliers on genuinely numerical columns.
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from app.cleaning.operations.duplicates import remove_duplicates
from app.cleaning.operations.missing_values import handle_missing_values_basic
from app.cleaning.operations.outliers import remove_outliers_iqr
from app.cleaning.report import CleaningReport
from app.services.validator import validate_dataset


def basic_pipeline(df: pd.DataFrame) -> tuple[pd.DataFrame, CleaningReport]:
    """Run the basic cleaning pipeline.

    Returns
    -------
    (cleaned_df, report)
    """
    original = df.copy()
    df = df.copy()
    report = CleaningReport(pipeline="basic", rows_before=len(df))

    # 1. Duplicates
    df, dup_count = remove_duplicates(df)
    report.record_duplicates(dup_count)

    # 2. Missing values
    df, mv_actions = handle_missing_values_basic(df)
    report.record_missing(mv_actions)

    # 3. Outliers — only on numerical columns
    for col in df.select_dtypes(include=np.number).columns:
        df, removed = remove_outliers_iqr(df, col)
        if removed > 0:
            report.record_outlier(col, f"removed ({removed} rows)")

    # Validation
    report.rows_after = len(df)
    validation = validate_dataset(original, df)
    report.record_validation(validation)

    return df, report
