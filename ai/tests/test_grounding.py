"""
Tests for the golden rule.

These are the most important tests in this service. If the grounding guard is
wrong, the project's central safety claim - that the LLM never touches the
numbers - is unenforced.
"""

from app.explain.grounding import check_grounding, evidence_numbers

EVIDENCE = {
    "product_title": "Blue Hoodie",
    "campaign_name": "Spring Sale",
    "stock_out_at": "2026-03-04T09:12:00.000Z",
    "days_with_spend": 6,
    "spend_since_stockout": 243,
    "average_daily_spend": 40.5,
    "clicks_since_stockout": 1200,
    "conversions_since_stockout": 0,
}
COST = 283.5


def test_accepts_an_explanation_using_only_evidence_numbers():
    text = (
        "Your Spring Sale campaign has spent $243 since Blue Hoodie sold out, "
        "at $40.50 a day, sending 1200 people to a page where they cannot buy."
    )
    assert check_grounding(text, EVIDENCE, COST) == []


def test_accepts_the_rounded_headline_figure():
    # The check computes 283.50; a merchant reads "$284". Both are the same
    # fact, and flagging the rounded form would make the guard useless.
    assert check_grounding("You are losing $284 a week.", EVIDENCE, COST) == []


def test_catches_an_invented_number():
    # 8500 appears nowhere. This is exactly the failure the guard exists for.
    text = "At this rate you will lose $8500 over the next year."
    assert check_grounding(text, EVIDENCE, COST) == ["8500"]


def test_catches_an_extrapolation_that_looks_plausible():
    # 283.50 x 4 is arithmetic the model is not allowed to do, however
    # reasonable it looks.
    text = "That is $1134 a month."
    assert check_grounding(text, EVIDENCE, COST) == ["1134"]


def test_ignores_small_numbers_that_are_ordinary_prose():
    text = "There are 2 things to do here, and the first one takes 5 minutes."
    assert check_grounding(text, EVIDENCE, COST) == []


def test_handles_thousands_separators():
    text = "You sent 1,200 clicks to a dead page."
    assert check_grounding(text, EVIDENCE, COST) == []


def test_reads_numbers_out_of_nested_evidence():
    evidence = {"campaign": {"budget": {"daily": 77.25}}}
    assert check_grounding("The budget is $77.25.", evidence, 0.0) == []


def test_allows_a_fraction_written_as_a_percentage():
    evidence = {"conversion_rate": 0.12}
    assert check_grounding("Conversion sits at 12%.", evidence, 0.0) == []


def test_evidence_numbers_includes_the_cost_and_its_rounding():
    allowed = evidence_numbers(EVIDENCE, COST)
    assert 283.5 in allowed
    assert 284 in allowed
    assert 40.5 in allowed


def test_a_date_in_the_evidence_does_not_license_arbitrary_numbers():
    # The stock-out timestamp contains 2026, 03, 04, 09, 12 - all legitimately
    # quotable. 999 is not.
    assert check_grounding("It has been 999 days.", EVIDENCE, COST) == ["999"]
