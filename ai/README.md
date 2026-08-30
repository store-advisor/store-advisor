# AI service

Takes a finding's evidence and returns a plain-language explanation, a
confidence, and a severity. That is its whole job.

It does not find problems and it does not compute numbers. Both belong to the
check engine. See HANDBOOK.md section 3 for why that separation is the most
important rule in the project.

## Running it

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...
uvicorn app.main:app --reload --port 8000
```

`POST /api/explain`

```json
{
  "check_id": "ad_spend_on_oos",
  "estimated_cost": 283.5,
  "evidence": {
    "product_title": "Blue Hoodie",
    "campaign_name": "Spring Sale",
    "average_daily_spend": 40.5,
    "spend_since_stockout": 243,
    "clicks_since_stockout": 1200,
    "conversions_since_stockout": 0
  }
}
```

Returns the explanation, a confidence between 0 and 1, a severity, and two
fields worth understanding before you use the response:

```json
{
  "explanation": "...",
  "confidence": 0.95,
  "severity": "high",
  "grounded": true,
  "ungrounded_numbers": []
}
```

## The grounding check

`grounded: false` means the model wrote a number that does not appear anywhere
in the evidence. **Do not show an ungrounded explanation to a merchant.**

The golden rule says the LLM never invents a number. A rule nobody checks is a
wish, so `app/explain/grounding.py` checks it: every figure in the explanation
has to trace back to a value the check proved, allowing for the roundings a
correct explanation would legitimately make (`$283.50` written as `$284`, a
confidence of `0.95` written as `95%`).

This is what lets us answer "how do you know the AI is not hallucinating the
numbers?" with something stronger than a prompt instruction.

## Tests

```bash
python -m pytest
```

The suite never calls the real API. The Anthropic client is stubbed
throughout - a test suite that costs money per run is one people stop running.
