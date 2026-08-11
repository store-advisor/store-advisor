"""
Single entry point for the cleaning system (PDF §15).

    run_pipeline(df, pipeline="basic")
"""

from __future__ import annotations

import pandas as pd

from app.cleaning.pipelines.basic import basic_pipeline
from app.cleaning.pipelines.advanced import advanced_pipeline
from app.cleaning.pipelines.agent import agent_pipeline
from app.cleaning.report import CleaningReport


def run_pipeline(
    df: pd.DataFrame,
    pipeline: str = "basic",
) -> tuple[pd.DataFrame, CleaningReport]:
    """Execute a named cleaning pipeline.

    Parameters
    ----------
    df : DataFrame to clean.
    pipeline : one of ``"basic"``, ``"advanced"``, ``"agent"``.

    Returns
    -------
    (cleaned_df, CleaningReport)
    """
    if pipeline == "basic":
        return basic_pipeline(df)
    if pipeline == "advanced":
        return advanced_pipeline(df)
    if pipeline == "agent":
        return agent_pipeline(df)
    raise ValueError(
        f"Invalid pipeline '{pipeline}'. "
        "Choose from: basic, advanced, agent."
    )
