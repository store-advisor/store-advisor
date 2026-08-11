"""
Agent Pipeline — Future Architecture (PDF §11-12).

Stub implementation behind a feature flag.
The interface exists now so the API contract does not change later.
"""

from __future__ import annotations

import pandas as pd

from app.cleaning.report import CleaningReport


class DataCleaningAgent:
    """Placeholder for the future LLM-powered cleaning agent.

    The agent will eventually:
    1. Profile the dataset.
    2. Create a structured cleaning plan.
    3. Execute only approved tools.
    4. Validate the result.
    5. Explain decisions.
    """

    def run(
        self,
        df: pd.DataFrame,
        user_preferences: dict | None = None,
    ) -> tuple[pd.DataFrame, CleaningReport]:
        raise NotImplementedError(
            "The Agent pipeline is behind a feature flag and is not "
            "available in the current MVB.  Use 'basic' or 'advanced'."
        )


def agent_pipeline(
    df: pd.DataFrame,
) -> tuple[pd.DataFrame, CleaningReport]:
    """Entry point matching the other pipeline signatures."""
    agent = DataCleaningAgent()
    return agent.run(df)
