# AI service

Two surfaces in one FastAPI process.

**Explain** takes a finding's evidence and returns a plain-language
explanation, a confidence, and a severity. That is its whole job. It does not
find problems and it does not compute numbers: both belong to the check
engine. See HANDBOOK.md section 3 for why that separation is the most
important rule in the project.

**Clean** profiles and cleans tabular data. Upload a CSV, Excel or JSON file,
get back a profile of what is in it, or a cleaned copy with a report of every
change made.

They share a process because they share a runtime and nothing else. Neither
touches a database, neither holds state, and no module on one side imports
anything from the other. Two deployments would buy an isolation neither needs
and cost a second image, a second health check, and a second thing to start.

## Running it

```bash
pip install -r requirements.txt
export ANTHROPIC_API_KEY=...        # explain only; clean works without it
uvicorn app.main:app --reload --port 8000
```

Or `docker compose up ai` from the repository root, which is what the rest of
the stack talks to.

Interactive documentation for every endpoint below is at `/docs`.

---

## Explain

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

Without `ANTHROPIC_API_KEY` this endpoint answers 503 with a message saying
so. The service still starts, still serves `/health`, and still cleans. An
explanation is an enrichment: nothing in the pipeline waits on it.

### The grounding check

`grounded: false` means the model wrote a number that does not appear anywhere
in the evidence. **Do not show an ungrounded explanation to a merchant.**

The golden rule says the LLM never invents a number. A rule nobody checks is a
wish, so `app/explain/grounding.py` checks it: every figure in the explanation
has to trace back to a value the check proved, allowing for the roundings a
correct explanation would legitimately make (`$283.50` written as `$284`, a
confidence of `0.95` written as `95%`).

This is what lets us answer "how do you know the AI is not hallucinating the
numbers?" with something stronger than a prompt instruction.

---

## Clean

`POST /api/profile` — what is in this dataset, before changing anything.
Column types, missing counts, duplicate rows, outliers, cardinality.

`POST /api/clean` — a cleaned copy plus a report of every operation applied.

`POST /api/clean/download` — the same, streamed back as a file.

Each takes a multipart upload named `file`. Accepted extensions are `.csv`,
`.xlsx`, `.xls` and `.json`.

```bash
curl -F "file=@samples/spotify.csv" http://localhost:8000/api/profile
curl -F "file=@samples/spotify.csv" "http://localhost:8000/api/clean?pipeline=basic"
```

Three pipelines, in `app/cleaning/pipelines/`:

| Pipeline | What it does |
|---|---|
| `basic` | A fixed sequence: drop exact duplicates, impute numerics with the median and categories with the mode, remove IQR outliers |
| `advanced` | The same operations, each one configurable per column |
| `agent` | Chooses a strategy per column rather than applying one everywhere. Earliest of the three |

`samples/spotify.csv` is the fixture the tests and the `/tool` page in the
dashboard both use.

---

## Tests

```bash
python -m pytest
```

The suite never calls the real Anthropic API. The client is stubbed
throughout: a test suite that costs money per run is one people stop running.
