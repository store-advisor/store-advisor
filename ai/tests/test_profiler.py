"""Tests for the data profiler."""

import numpy as np
import pandas as pd
import pytest

from app.services.profiler import profile_dataset


@pytest.fixture
def sample_df():
    return pd.DataFrame({
        "age": [25, 30, np.nan, 45, 30],
        "city": ["Cairo", "Alex", "Cairo", None, "Alex"],
        "salary": [5000, 6000, 7000, 80000, 5500],
        "id": [1, 2, 3, 4, 5],
    })


def test_profile_dataset_shape(sample_df):
    profile = profile_dataset(sample_df)
    assert profile["dataset"]["rows"] == 5
    assert profile["dataset"]["columns"] == 4


def test_profile_duplicate_count():
    df = pd.DataFrame({"a": [1, 1, 2], "b": ["x", "x", "y"]})
    profile = profile_dataset(df)
    assert profile["dataset"]["duplicate_rows"] == 1


def test_profile_missing_percentage(sample_df):
    profile = profile_dataset(sample_df)
    col_lookup = {c["name"]: c for c in profile["columns"]}
    assert col_lookup["age"]["missing_count"] == 1
    assert col_lookup["age"]["missing_percentage"] == 20.0


def test_profile_numerical_stats(sample_df):
    profile = profile_dataset(sample_df)
    col_lookup = {c["name"]: c for c in profile["columns"]}
    stats = col_lookup["salary"]["numerical_stats"]
    assert "mean" in stats
    assert "median" in stats
    assert "skewness" in stats
    assert stats["min"] == 5000


def test_profile_categorical_stats(sample_df):
    profile = profile_dataset(sample_df)
    col_lookup = {c["name"]: c for c in profile["columns"]}
    cat = col_lookup["city"]["categorical_stats"]
    assert "top_values" in cat


def test_profile_quality_flags():
    df = pd.DataFrame({
        "constant": [1, 1, 1],
        "uid": [100, 200, 300],
        "sparse": [np.nan, np.nan, 1],
    })
    profile = profile_dataset(df)
    col_lookup = {c["name"]: c for c in profile["columns"]}
    assert "constant_column" in col_lookup["constant"]["quality_flags"]
    assert "possible_identifier" in col_lookup["uid"]["quality_flags"]
    assert "high_missingness" in col_lookup["sparse"]["quality_flags"]


def test_profile_empty_dataframe():
    df = pd.DataFrame()
    profile = profile_dataset(df)
    assert profile["dataset"]["rows"] == 0
    assert profile["dataset"]["columns"] == 0
