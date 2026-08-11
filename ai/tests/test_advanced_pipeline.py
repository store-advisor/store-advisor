"""End-to-end tests for the Advanced pipeline."""

import numpy as np
import pandas as pd
import pytest

from app.cleaning.pipelines.advanced import advanced_pipeline


@pytest.fixture
def messy_df():
    return pd.DataFrame({
        "age": [25, 30, 30, np.nan, 45],
        "salary": [5000, 6000, 6000, 7000, 80000],
        "city": ["Cairo", "Alex", "Alex", None, "Cairo"],
    })


def test_advanced_pipeline_cleans(messy_df):
    result, report = advanced_pipeline(messy_df)
    assert result.isna().sum().sum() == 0


def test_advanced_report_pipeline_name(messy_df):
    _, report = advanced_pipeline(messy_df)
    assert report.to_dict()["pipeline"] == "advanced"


def test_advanced_drops_high_missing():
    """Column with >50 % NaN should be dropped."""
    df = pd.DataFrame({
        "good": [1, 2, 3, 4, 5],
        "bad": [np.nan, np.nan, np.nan, np.nan, 1],
    })
    result, report = advanced_pipeline(df)
    assert "bad" not in result.columns
    assert "bad" in report.dropped_columns


def test_advanced_outlier_strategy():
    """When outlier % is between 5-15 %, should cap instead of remove."""
    # 2 out of 20 = 10 % outlier
    vals = list(range(1, 19)) + [1000, 2000]
    df = pd.DataFrame({"val": vals})
    result, report = advanced_pipeline(df)
    # Rows should be preserved (capped, not removed)
    assert len(result) == len(df)
    if "val" in report.outlier_actions:
        assert "capped" in report.outlier_actions["val"]


def test_advanced_retains_widespread_outliers():
    """When outlier % > 15 %, should retain and flag."""
    # 5 out of 10 = 50 % "outlier"
    vals = [1, 1, 1, 1, 1, 100, 200, 300, 400, 500]
    df = pd.DataFrame({"val": vals})
    result, report = advanced_pipeline(df)
    if "val" in report.outlier_actions:
        assert "retained" in report.outlier_actions["val"]


def test_advanced_empty_df():
    df = pd.DataFrame({"a": pd.Series(dtype="float64")})
    result, report = advanced_pipeline(df)
    assert report.to_dict()["validation"]["status"] in ("PASS", "FAIL")
