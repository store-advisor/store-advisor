"""
Enforces the golden rule.

HANDBOOK.md section 3: "The check finds the problem. The LLM explains it. The
LLM never invents a number." That is a rule about behaviour, and a rule nobody
checks is a wish. This module checks it.

Every number appearing in an explanation must trace back to a value in the
evidence the check proved. If one does not, the explanation is marked
ungrounded and must not be shown to a merchant - because the entire argument
for letting this system pause a real ad campaign is that it never touches the
numbers.
"""

from __future__ import annotations

import re
from typing import Any

# Matches numbers as a person writes them: 284, 40.50, $1,200, 95%.
_NUMBER = re.compile(r"\d[\d,]*\.?\d*")

# Small integers that are almost always prose rather than a claim about data
# ("a couple of days", "the first thing to do"). Flagging these would make the
# guard cry wolf, and a guard nobody trusts gets switched off.
_PROSE_NUMBERS = {0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0, 7.0, 10.0, 12.0, 24.0, 100.0}


def _to_float(raw: str) -> float | None:
    try:
        return float(raw.replace(",", ""))
    except ValueError:
        return None


def _collect(value: Any, into: set[float]) -> None:
    """Walk any JSON shape and gather every number it contains."""
    if isinstance(value, bool):
        return
    if isinstance(value, (int, float)):
        into.add(round(float(value), 2))
    elif isinstance(value, str):
        for match in _NUMBER.findall(value):
            parsed = _to_float(match)
            if parsed is not None:
                into.add(round(parsed, 2))
    elif isinstance(value, dict):
        for item in value.values():
            _collect(item, into)
    elif isinstance(value, (list, tuple)):
        for item in value:
            _collect(item, into)


def evidence_numbers(evidence: dict[str, Any], estimated_cost: float) -> set[float]:
    """
    Every number the model is permitted to use.

    Includes derived forms a correct explanation would legitimately produce:
    the cost rounded to whole dollars (a merchant reads "$284", not "$283.50"),
    and percentages of a fraction (confidence 0.95 written as "95%").
    """
    allowed: set[float] = set()
    _collect(evidence, allowed)
    _collect(estimated_cost, allowed)

    for number in list(allowed):
        allowed.add(round(number))
        if 0.0 < number <= 1.0:
            allowed.add(round(number * 100, 2))

    return allowed


def check_grounding(
    text: str, evidence: dict[str, Any], estimated_cost: float
) -> list[str]:
    """
    Returns the numbers in `text` that no evidence value accounts for.

    An empty list means the explanation is grounded.
    """
    allowed = evidence_numbers(evidence, estimated_cost)
    ungrounded: list[str] = []

    for raw in _NUMBER.findall(text):
        parsed = _to_float(raw)
        if parsed is None:
            continue
        value = round(parsed, 2)
        if value in _PROSE_NUMBERS or value in allowed:
            continue
        # Tolerate rounding either way: the model may write $284 for 283.50,
        # or $283.5 for 283.50.
        if any(abs(value - candidate) < 0.51 for candidate in allowed):
            continue
        ungrounded.append(raw)

    return ungrounded
