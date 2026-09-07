"""
Structured cleaning report — first-class output of every pipeline run.

Collects per-operation actions, before/after metrics, and serialises to
a dict/JSON that the frontend can display.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CleaningReport:
    """Accumulates cleaning actions and produces a summary dict."""

    pipeline: str = "basic"
    rows_before: int = 0
    rows_after: int = 0
    duplicates_removed: int = 0
    missing_value_actions: dict[str, str] = field(default_factory=dict)
    dropped_columns: list[str] = field(default_factory=list)
    outlier_actions: dict[str, str] = field(default_factory=dict)
    type_changes: dict[str, dict[str, str]] = field(default_factory=dict)
    validation: dict[str, Any] = field(default_factory=dict)

    # ── convenience mutators ─────────────────────────────────────────────

    def record_duplicates(self, count: int) -> None:
        self.duplicates_removed = count

    def record_missing(self, actions: dict[str, str]) -> None:
        self.missing_value_actions.update(actions)

    def record_dropped_columns(self, cols: list[str]) -> None:
        self.dropped_columns.extend(cols)

    def record_outlier(self, column: str, strategy: str) -> None:
        self.outlier_actions[column] = strategy

    def record_type_changes(
        self, changes: dict[str, dict[str, str]]
    ) -> None:
        self.type_changes.update(changes)

    def record_validation(self, result: dict) -> None:
        self.validation = result

    # ── serialisation ────────────────────────────────────────────────────

    def to_dict(self) -> dict[str, Any]:
        return {
            "pipeline": self.pipeline,
            "rows": {
                "before": self.rows_before,
                "after": self.rows_after,
            },
            "duplicates": {
                "removed": self.duplicates_removed,
            },
            "missing_values": self.missing_value_actions,
            "dropped_columns": self.dropped_columns,
            "outliers": self.outlier_actions,
            "type_changes": self.type_changes,
            "validation": self.validation,
        }
