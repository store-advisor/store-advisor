"""
Single entry point for the cleaning system (PDF §15).

    run_pipeline(df, pipeline="basic")
    run_pipeline(df, pipeline="manual", dup_strategy="remove",
                 missing_strategies={...}, outlier_strategies={...})
"""

from __future__ import annotations

import pandas as pd

from app.cleaning.pipelines.basic import basic_pipeline
from app.cleaning.pipelines.advanced import advanced_pipeline, manual_pipeline
from app.cleaning.pipelines.agent import agent_pipeline
from app.cleaning.report import CleaningReport


def run_pipeline(
    df: pd.DataFrame,
    pipeline: str = "basic",
    dup_strategy: str = "remove",
    missing_strategies: dict[str, str] | None = None,
    outlier_strategies: dict[str, str] | None = None,
) -> tuple[pd.DataFrame, CleaningReport]:
    """Execute a named cleaning pipeline.

    Parameters
    ----------
    df : DataFrame to clean.
    pipeline : one of ``"basic"``, ``"advanced"``, ``"manual"``, ``"agent"``.
    dup_strategy : (manual only) 'remove' | 'keep'.
    missing_strategies : (manual only) column_name -> strategy label.
    outlier_strategies : (manual only) column_name -> strategy label.

    Returns
    -------
    (cleaned_df, CleaningReport)
    """
    if pipeline == "basic":
        return basic_pipeline(df)
    if pipeline == "advanced":
        return advanced_pipeline(df)
    if pipeline == "manual":
        return manual_pipeline(
            df,
            dup_strategy=dup_strategy,
            missing_strategies=missing_strategies,
            outlier_strategies=outlier_strategies,
        )
    if pipeline == "agent":
        return agent_pipeline(df)
    raise ValueError(
        f"Invalid pipeline '{pipeline}'. "
        "Choose from: basic, advanced, manual, agent."
    )
