"""Tests for individual cleaning operations."""

import numpy as np
import pandas as pd
import pytest

from app.cleaning.operations.duplicates import remove_duplicates
from app.cleaning.operations.missing_values import (
    handle_missing_values_basic,
    handle_missing_values_advanced,
)
from app.cleaning.operations.outliers import (
    cap_outliers,
    detect_outliers_iqr,
    remove_outliers_iqr,
)
from app.cleaning.operations.types import fix_data_types
from app.services.profiler import profile_dataset


# ── Duplicates ───────────────────────────────────────────────────────────────

class TestDuplicates:
    def test_remove_duplicates(self):
        df = pd.DataFrame({"age": [20, 20, 30]})
        result, count = remove_duplicates(df)
        assert len(result) == 2
        assert count == 1

    def test_no_duplicates(self):
        df = pd.DataFrame({"a": [1, 2, 3]})
        result, count = remove_duplicates(df)
        assert len(result) == 3
        assert count == 0

    def test_all_duplicates(self):
        df = pd.DataFrame({"a": [1, 1, 1]})
        result, count = remove_duplicates(df)
        assert len(result) == 1
        assert count == 2


# ── Missing Values ───────────────────────────────────────────────────────────

class TestMissingBasic:
    def test_numeric_median(self):
        df = pd.DataFrame({"age": [20, np.nan, 30]})
        result, actions = handle_missing_values_basic(df)
        assert result["age"].isna().sum() == 0
        assert actions["age"] == "median"

    def test_categorical_mode(self):
        df = pd.DataFrame({"city": ["A", "A", None]})
        result, actions = handle_missing_values_basic(df)
        assert result["city"].isna().sum() == 0
        assert actions["city"] == "mode"

    def test_no_missing(self):
        df = pd.DataFrame({"x": [1, 2, 3]})
        result, actions = handle_missing_values_basic(df)
        assert len(actions) == 0

    def test_all_missing_categorical(self):
        df = pd.DataFrame({"x": [None, None, None]})
        result, actions = handle_missing_values_basic(df)
        assert result["x"].isna().sum() == 0


class TestMissingAdvanced:
    def test_high_missing_dropped(self):
        df = pd.DataFrame({
            "good": [1, 2, 3, 4],
            "bad": [np.nan, np.nan, np.nan, 1],
        })
        profile = profile_dataset(df)
        result, actions, dropped = handle_missing_values_advanced(df, profile)
        assert "bad" in dropped
        assert "bad" not in result.columns


# ── Outliers ─────────────────────────────────────────────────────────────────

class TestOutliers:
    @pytest.fixture
    def df_with_outlier(self):
        return pd.DataFrame({"val": [10, 12, 11, 13, 12, 100]})

    def test_detect_outliers(self, df_with_outlier):
        mask = detect_outliers_iqr(df_with_outlier, "val")
        assert mask.sum() >= 1  # 100 is an outlier

    def test_remove_outliers(self, df_with_outlier):
        result, removed = remove_outliers_iqr(df_with_outlier, "val")
        assert removed >= 1
        assert len(result) < len(df_with_outlier)

    def test_cap_outliers(self, df_with_outlier):
        result, capped = cap_outliers(df_with_outlier, "val")
        assert capped >= 1
        assert len(result) == len(df_with_outlier)  # no rows removed
        assert result["val"].max() < 100

    def test_no_outliers(self):
        df = pd.DataFrame({"val": [10, 11, 12]})
        mask = detect_outliers_iqr(df, "val")
        assert mask.sum() == 0


# ── Types ────────────────────────────────────────────────────────────────────

class TestTypes:
    def test_auto_detect_numeric_string(self):
        df = pd.DataFrame({"price": ["100", "200", "300"]})
        result, changes = fix_data_types(df)
        assert pd.api.types.is_numeric_dtype(result["price"])
        assert "price" in changes

    def test_explicit_rule(self):
        df = pd.DataFrame({"age": [20.0, 30.0, 40.0]})
        result, changes = fix_data_types(df, rules={"age": "int64"})
        assert result["age"].dtype == np.int64

    def test_no_change_needed(self):
        df = pd.DataFrame({"name": ["Alice", "Bob"]})
        result, changes = fix_data_types(df)
        assert len(changes) == 0
