"""
Turns a finding's evidence into a plain-language explanation.

Uses structured outputs so the model returns a validated object rather than
prose we have to parse. The result is then checked against the evidence: see
grounding.py for why that matters more than it might look.
"""

from __future__ import annotations

import logging
import os

import anthropic

from .grounding import check_grounding
from .schemas import ExplainRequest, ExplainResponse, Explanation

logger = logging.getLogger(__name__)


class ExplainConfigurationError(RuntimeError):
    """The service cannot reach the model because it is not configured."""

MODEL = os.environ.get("ANTHROPIC_MODEL", "claude-opus-5")

SYSTEM_PROMPT = """\
You explain findings for Store Advisor, which tells online shop owners where \
they are losing money.

A deterministic check has already proved what follows. Your job is to make it \
understandable and to judge how urgent it is. You are talking to a shop owner, \
not an analyst: no jargon, no hedging, no bullet lists.

The one rule that matters: **every number you write must come from the \
evidence you were given.** Do not estimate, extrapolate, annualise, or compute \
new figures - not even ones that seem obviously implied. If you want to say \
something a number would support and you were not given that number, say it \
in words instead. A single invented figure makes the whole finding unusable, \
because the reason a merchant can trust us to pause a real ad campaign is that \
we never make numbers up.

Say what is happening, why it costs money, and what to do. Three sentences at \
most."""


def _build_user_message(request: ExplainRequest) -> str:
    lines = [
        f"Check: {request.check_id}",
        f"Cost to the merchant: ${request.estimated_cost:.2f} per week",
        "",
        "Evidence the check proved:",
    ]
    for key, value in request.evidence.items():
        # Internal bookkeeping is not evidence, and offering it invites the
        # model to write it into the explanation.
        if key == "dedupe_key":
            continue
        lines.append(f"  {key}: {value}")
    return "\n".join(lines)


def _default_client() -> anthropic.Anthropic:
    """
    Build a client, failing loudly and early if it has no credentials.

    The SDK constructs happily without a key and only raises at request time,
    as a bare TypeError from deep inside header building. Left alone that
    reaches the caller as an opaque 500, which reads as a server bug rather
    than the deployment mistake it is. Checking the resolved credentials up
    front turns it into an answerable error.
    """
    client = anthropic.Anthropic()
    if getattr(client, "api_key", None) or getattr(client, "auth_token", None):
        return client
    raise ExplainConfigurationError(
        "No Anthropic credentials resolved. Set ANTHROPIC_API_KEY."
    )


def explain(request: ExplainRequest, client: anthropic.Anthropic | None = None) -> ExplainResponse:
    client = client or _default_client()

    response = client.messages.parse(
        model=MODEL,
        max_tokens=2000,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": _build_user_message(request)}],
        output_format=Explanation,
    )

    parsed: Explanation = response.parsed_output

    ungrounded = check_grounding(
        parsed.explanation, request.evidence, request.estimated_cost
    )
    if ungrounded:
        # Logged rather than raised: the caller decides what to do with an
        # ungrounded explanation, and we want the evidence in the logs when a
        # prompt change starts producing them. HANDBOOK section 7: log every
        # prompt and every response.
        logger.warning(
            "Ungrounded numbers in explanation for check %s: %s",
            request.check_id,
            ungrounded,
        )

    return ExplainResponse(
        check_id=request.check_id,
        explanation=parsed.explanation,
        confidence=parsed.confidence,
        severity=parsed.severity,
        grounded=not ungrounded,
        ungrounded_numbers=ungrounded,
    )
