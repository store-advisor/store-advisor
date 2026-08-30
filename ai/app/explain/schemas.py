"""Request and response shapes for the explain endpoint."""

from typing import Any, Literal

from pydantic import BaseModel, Field

Severity = Literal["low", "medium", "high", "critical"]


class ExplainRequest(BaseModel):
    """
    What the check proved. Mirrors a row in `findings`.

    Note what is absent: the raw store or ad-account data. The AI service sees
    only what a deterministic check already established, which is what keeps
    the golden rule enforceable rather than aspirational.
    """

    check_id: str = Field(..., description="Which check produced this finding")
    estimated_cost: float = Field(
        ..., description="Dollars per week, computed by the check"
    )
    evidence: dict[str, Any] = Field(
        ..., description="The raw facts the check proved"
    )


class Explanation(BaseModel):
    """
    What the model is allowed to return.

    Deliberately narrow. The model writes prose, judges its own confidence,
    and ranks severity. It does not return a cost, because it is not allowed
    to have an opinion about the cost - that number is the check's.
    """

    explanation: str = Field(
        ...,
        description=(
            "Two or three plain sentences a shop owner would understand: what "
            "is happening, why it is costing money, and what to do about it. "
            "No jargon, no hedging, no restating the numbers as a list."
        ),
    )
    confidence: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description=(
            "How confident you are that this is a real problem worth acting "
            "on, given only the evidence provided. Low when the evidence is "
            "thin or ambiguous."
        ),
    )
    severity: Severity = Field(
        ...,
        description=(
            "How urgently a merchant should act. Judge from the size of the "
            "loss and how fast it is accruing."
        ),
    )


class ExplainResponse(Explanation):
    """The explanation plus what it was derived from, for auditability."""

    check_id: str
    grounded: bool = Field(
        ...,
        description=(
            "Whether every number in the explanation traces back to the "
            "evidence. False means the model invented a figure and the text "
            "should not be shown to a merchant."
        ),
    )
    ungrounded_numbers: list[str] = Field(
        default_factory=list,
        description="Numbers found in the explanation that are not in the evidence.",
    )
