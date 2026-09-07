# Store Advisor — AI service

One FastAPI process, two surfaces.

**Data cleaning.** An intelligent, modular data cleaning system built for the **Store Advisor** graduation project. Upload any tabular dataset and clean it using **Basic**, **Advanced**, or future **Agent** pipelines — with full audit reports, validation, and a REST API. That is the rest of this document.

**Explain.** Takes a finding's evidence and returns a plain-language explanation, a confidence and a severity, and refuses to invent a number while doing it. See [Explain](#-explain) below.

Proposal §6.3 layer 2 is where the cleaning work is headed: type coercion, deduplication and cross-source ID resolution over connector output, which the proposal calls "a core deliverable rather than housekeeping". Today the same operations run over an uploaded file.

---

## 🚀 Step-by-Step Setup & Run Guide

### Step 1: Install Conda (if not installed)

Download and install [Miniconda](https://docs.conda.io/en/latest/miniconda.html) for your operating system.

Verify the installation:
```bash
conda --version
```

### Step 2: Create the Conda Environment

```bash
conda create -n mini-rag python=3.12 -y
```

### Step 3: Activate the Environment

```bash
conda activate mini-rag
```

### Step 4: Navigate to the Project

```bash
cd path/to/store-advisor/ai
```

### Step 5: Install Dependencies

```bash
pip install -r requirements.txt
```

### Step 6: Run the Tests (verify everything works)

```bash
python -m pytest tests/ -v
```

You should see **53 passed** ✅ (34 cleaning, 19 explain)

### Step 7: Start the Backend API

Open a terminal and run:
```bash
conda activate mini-rag
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be live at **http://localhost:8000**
- Swagger docs: **http://localhost:8000/docs**

### Step 8: Start the Frontend

Open a **second terminal** and run:
```bash
conda activate mini-rag
streamlit run frontend.py --server.port 8501
```

The frontend will be live at **http://localhost:8501**

---

## 🖥️ Frontend — Three Modes

### 🟢 Basic Pipeline
Upload a file → click **Run Basic Cleaning** → download cleaned CSV.

Fixed sequence: Dedup → Median/Mode Imputation → IQR Outlier Removal.

### 🟡 Advanced Pipeline
1. **Strategy Picker** — choose per-column how to handle:
   - **Duplicates**: remove or keep
   - **Missing values**: median / mean / mode / zero / "Unknown" / drop column
   - **Outliers**: remove / cap (winsorise) / keep
2. **Run** — apply your custom strategies, or run auto-advanced
3. **🐍 Custom Python Editor** — write your own pandas/numpy cleaning code:
   ```python
   # The DataFrame is available as `df`
   df = df.dropna(subset=["important_column"])
   df["price"] = df["price"].clip(lower=0)
   ```

### 🔴 Agent Pipeline *(Coming Soon — Phase 3)*
LLM-powered intelligent cleaning with planning, controlled tools, and explanations.

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `POST` | `/api/profile` | Upload file → data profile JSON |
| `POST` | `/api/clean?pipeline=basic` | Upload file → cleaning report + CSV |
| `POST` | `/api/clean/download?pipeline=basic` | Upload file → download cleaned CSV |
| `POST` | `/api/explain` | Finding evidence → explanation, confidence, severity |
| `GET` | `/health` | Liveness. Answers even with no Anthropic key |

**Example:**
```bash
curl -X POST http://localhost:8000/api/profile -F "file=@your_data.csv"
curl -X POST "http://localhost:8000/api/clean?pipeline=advanced" -F "file=@your_data.csv"
```

---

## 📁 Project Structure

```
ai/
├── app/
│   ├── main.py                        # FastAPI entry point, mounts both routers
│   ├── api/cleaning.py                # REST endpoints
│   ├── api/explain.py                 # POST /api/explain
│   ├── explain/
│   │   ├── grounding.py               # Refuses numbers the evidence does not prove
│   │   ├── schemas.py
│   │   └── service.py
│   ├── schemas/cleaning.py            # Pydantic models
│   ├── services/
│   │   ├── profiler.py                # Data profiling engine
│   │   └── validator.py               # Post-cleaning validation
│   └── cleaning/
│       ├── report.py                  # Cleaning report builder
│       ├── pipeline_runner.py         # run_pipeline() dispatcher
│       ├── operations/                # Reusable cleaning operations
│       │   ├── duplicates.py
│       │   ├── missing_values.py
│       │   ├── outliers.py
│       │   └── types.py
│       └── pipelines/
│           ├── basic.py               # Fixed-rule pipeline
│           ├── advanced.py            # Profile-driven pipeline
│           └── agent.py               # Future LLM agent (stub)
├── tests/                             # 53 pytest tests (34 cleaning, 19 explain)
├── frontend.py                        # Streamlit UI
├── basic_cleaning.py                  # CLI entry point
└── requirements.txt
```

---

## 🏗️ Architecture

```
USER / WEB APPLICATION
        |
        v
  DATA UPLOAD / API
        |
        v
   DATA PROFILER
        |
   +---------+---------+
   |         |         |
   v         v         v
 BASIC   ADVANCED    AGENT
  |         |         |
  +---------+---------+
        |
        v
 CLEANING OPERATIONS
        |
        v
    VALIDATOR
        |
        v
 CLEANED DATA + REPORT
```

---

## 🧠 Explain

`POST /api/explain` takes a finding's evidence and returns a plain-language
explanation, a confidence between 0 and 1, and a severity.

It does not find problems and it does not compute numbers. Both belong to the
check engine in `backend/`, and that separation is what lets a merchant trust
the result.

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

```json
{
  "explanation": "...",
  "confidence": 0.95,
  "severity": "high",
  "grounded": true,
  "ungrounded_numbers": []
}
```

### The grounding check

`grounded: false` means the model wrote a number that does not appear anywhere
in the evidence. **Do not show an ungrounded explanation to a merchant.**

The rule is that the LLM never invents a number. A rule nobody checks is a
wish, so `app/explain/grounding.py` checks it: every figure in the explanation
has to trace back to a value the check proved, allowing for the roundings a
correct explanation would legitimately make (`$283.50` written as `$284`, a
confidence of `0.95` written as `95%`).

This is what answers "how do you know the AI is not hallucinating the
numbers?" with something stronger than a prompt instruction. Proposal §5 names
it as one of the two properties that survive comparison with existing systems.

**Without `ANTHROPIC_API_KEY` this endpoint answers 503 and everything else
still works.** The service boots, serves `/health`, profiles and cleans as
normal. Findings are still detected, priced and served; they simply have no
prose.

---

## 📜 License

Part of the **Store Advisor** graduation project — August 2026.
