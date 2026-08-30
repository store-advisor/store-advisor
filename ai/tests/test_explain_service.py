"""
Tests for the explain service and its HTTP surface.

The Anthropic client is stubbed throughout. These tests must not make real API
calls: they run on every PR, and a test suite that costs money per run is a
test suite people start skipping.
"""

from unittest.mock import MagicMock

import anthropic
import pytest
from fastapi.testclient import TestClient

from app.explain.schemas import ExplainRequest, Explanation
from app.explain.service import explain, _build_user_message
from app.main import app

EVIDENCE = {
    "product_title": "Blue Hoodie",
    "campaign_name": "Spring Sale",
    "average_daily_spend": 40.5,
    "spend_since_stockout": 243,
    "clicks_since_stockout": 1200,
    "dedupe_key": "p1:c1",
}


def make_client(explanation: str, confidence: float = 0.9, severity: str = "high"):
    client = MagicMock()
    client.messages.parse.return_value = MagicMock(
        parsed_output=Explanation(
            explanation=explanation, confidence=confidence, severity=severity
        )
    )
    return client


def request() -> ExplainRequest:
    return ExplainRequest(
        check_id="ad_spend_on_oos", estimated_cost=283.5, evidence=EVIDENCE
    )


def test_returns_the_models_explanation_and_judgement():
    client = make_client("You are spending $40.50 a day on a sold-out product.")
    result = explain(request(), client=client)

    assert result.check_id == "ad_spend_on_oos"
    assert result.confidence == 0.9
    assert result.severity == "high"
    assert result.grounded is True
    assert result.ungrounded_numbers == []


def test_flags_an_explanation_that_invented_a_number():
    client = make_client("You will lose $9999 this quarter.")
    result = explain(request(), client=client)

    assert result.grounded is False
    assert result.ungrounded_numbers == ["9999"]
    # The text still comes back. The caller decides whether to show it; the
    # service's job is to be honest about it, not to silently discard.
    assert "9999" in result.explanation


def test_does_not_offer_the_model_our_internal_bookkeeping():
    # dedupe_key is an implementation detail. Putting it in the prompt invites
    # the model to write it into merchant-facing text.
    message = _build_user_message(request())
    assert "dedupe_key" not in message
    assert "Blue Hoodie" in message


def test_the_prompt_states_the_cost_the_check_computed():
    assert "$283.50 per week" in _build_user_message(request())


def test_health_endpoint():
    with TestClient(app) as http:
        assert http.get("/health").json() == {"status": "ok"}


def test_explain_endpoint_rejects_a_malformed_body():
    with TestClient(app) as http:
        # estimated_cost missing: the contract is enforced at the edge.
        response = http.post("/api/explain", json={"check_id": "x", "evidence": {}})
        assert response.status_code == 422


def test_explain_endpoint_rejects_an_out_of_range_confidence():
    with pytest.raises(ValueError):
        Explanation(explanation="x", confidence=1.5, severity="high")


def test_explain_endpoint_rejects_an_unknown_severity():
    with pytest.raises(ValueError):
        Explanation(explanation="x", confidence=0.5, severity="catastrophic")


def test_missing_credentials_is_a_503_with_something_actionable(monkeypatch):
    # The SDK constructs happily without a key and only fails deep inside
    # header building, as a bare TypeError. Unhandled that becomes a 500,
    # which sends whoever is on call looking for a bug instead of a config
    # value. This is the regression test for that.
    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    monkeypatch.delenv("ANTHROPIC_AUTH_TOKEN", raising=False)

    with TestClient(app, raise_server_exceptions=False) as http:
        response = http.post(
            "/api/explain",
            json={
                "check_id": "ad_spend_on_oos",
                "estimated_cost": 283.5,
                "evidence": {"product_title": "Blue Hoodie"},
            },
        )

    assert response.status_code == 503
    assert "ANTHROPIC_API_KEY" in response.json()["detail"]
