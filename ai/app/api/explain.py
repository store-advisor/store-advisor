"""HTTP surface for the explain service."""

from __future__ import annotations

import logging

import anthropic
from fastapi import APIRouter, HTTPException

from ..explain.schemas import ExplainRequest, ExplainResponse
from ..explain.service import ExplainConfigurationError, explain

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["explain"])


@router.post("/explain", response_model=ExplainResponse)
def post_explain(request: ExplainRequest) -> ExplainResponse:
    """
    Explain one finding.

    Stage 3 of the pipeline in HANDBOOK.md section 4: the check engine queues a
    finding here, and the backend writes the explanation and confidence back
    onto the findings row.
    """
    try:
        return explain(request)
    except ExplainConfigurationError as error:
        logger.error("Explain service misconfigured: %s", error)
        raise HTTPException(status_code=503, detail=str(error)) from error
    except anthropic.APIStatusError as error:
        # A finding without an explanation is still a real finding worth
        # showing, so surface the failure rather than pretending it succeeded
        # with empty text.
        logger.error("Anthropic API error explaining %s: %s", request.check_id, error)
        raise HTTPException(
            status_code=502, detail="The explanation service is unavailable."
        ) from error
