"""End-to-end tests for the Basic pipeline."""

import numpy as np
import pandas as pd
import pytest

from app.cleaning.pipelines.basic import basic_pipeline


@pytest.fixture
def messy_df():
    """DataFrame with duplicates, missing values, and an outlier."""
    return pd.DataFrame({
        "age": [25, 30, 30, np.nan, 45],
        "salary": [5000, 6000, 6000, 7000, 80000],
        "city": ["Cairo", "Alex", "Alex", None, "Cairo"],
    })


def test_basic_pipeline_cleans(messy_df):
    result, report = basic_pipeline(messy_df)
    # Should have fewer or equal rows (duplicates + outliers removed)
    assert len(result) <= len(messy_df)
    # No missing values remain
    assert result.isna().sum().sum() == 0


def test_basic_report_structure(messy_df):
    _, report = basic_pipeline(messy_df)
    d = report.to_dict()
    assert d["pipeline"] == "basic"
    assert "rows" in d
    assert d["rows"]["before"] == 5
    assert d["validation"]["status"] in ("PASS", "FAIL")


def test_basic_no_duplicates(messy_df):
    result, report = basic_pipeline(messy_df)
    assert report.duplicates_removed >= 1
    assert result.duplicated().sum() == 0


def test_basic_empty_df():
    df = pd.DataFrame({"a": pd.Series(dtype="float64")})
    result, report = basic_pipeline(df)
    assert report.to_dict()["validation"]["status"] in ("PASS", "FAIL")


def test_basic_only_numeric():
    df = pd.DataFrame({
        "x": [1, 2, 3, 4, 5],
        "y": [10, 20, 30, 40, 500],
    })
    result, report = basic_pipeline(df)
    assert result.isna().sum().sum() == 0


def test_basic_only_categorical():
    df = pd.DataFrame({
        "a": ["x", "y", "z", None],
        "b": ["p", "q", "p", "q"],
    })
    result, report = basic_pipeline(df)
    assert result.isna().sum().sum() == 0
