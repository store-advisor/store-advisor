# Store Advisor — Data Cleaning System

An intelligent, modular data cleaning system built for the **Store Advisor** graduation project. Upload any tabular dataset and clean it using **Basic** (fixed rules) or **Advanced** (profile-driven) pipelines — with full audit reports, validation, and a REST API.

---

## ✨ Features

| Feature | Description |
|---|---|
| **Data Profiling** | Schema, types, missing %, duplicates, distribution, outlier signals, quality flags |
| **Basic Pipeline** | Predictable fixed sequence: dedup → median/mode imputation → IQR outlier removal |
| **Advanced Pipeline** | Profile-driven: drops high-missing columns, caps or retains outliers by percentage |
| **Cleaning Report** | Structured JSON report of every action taken — auditable and frontend-ready |
| **Validation** | Checks cleaned data isn't empty, reports before/after metrics and dtype changes |
| **REST API** | FastAPI endpoints for profiling and cleaning with file upload |
| **Agent Pipeline** | Future-ready stub interface for LLM-powered intelligent cleaning |

---

## 📁 Project Structure

```
ai/
├── app/
│   ├── main.py                        # FastAPI entry point
│   ├── api/cleaning.py                # REST endpoints
│   ├── schemas/cleaning.py            # Pydantic models
│   ├── services/
│   │   ├── profiler.py                # Data profiling engine
│   │   └── validator.py               # Post-cleaning validation
│   └── cleaning/
│       ├── report.py                  # Cleaning report builder
│       ├── pipeline_runner.py         # run_pipeline() dispatcher
│       ├── operations/
│       │   ├── duplicates.py          # Duplicate removal
│       │   ├── missing_values.py      # Basic & advanced imputation
│       │   ├── outliers.py            # IQR detect / remove / cap
│       │   └── types.py              # Data type fixing
│       └── pipelines/
│           ├── basic.py               # Fixed-rule pipeline
│           ├── advanced.py            # Profile-driven pipeline
│           └── agent.py               # Future LLM agent (stub)
├── tests/                             # pytest test suites (34 tests)
├── basic_cleaning.py                  # CLI entry point
└── requirements.txt
```

---

## 🚀 Quick Start

### Prerequisites

- [Miniconda](https://docs.conda.io/en/latest/miniconda.html) with the `mini-rag` environment
- Python 3.10+

### 1. Install Dependencies

```bash
conda activate mini-rag
pip install -r requirements.txt
```

### 2. Run Tests

```bash
python -m pytest tests/ -v
```

### 3. Start the API Server

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Then open **http://localhost:8000/docs** for the interactive Swagger UI.

### 4. CLI Mode

```bash
python basic_cleaning.py
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Service info |
| `POST` | `/api/profile` | Upload a file → get data profile JSON |
| `POST` | `/api/clean?pipeline=basic` | Upload a file → get cleaning report + cleaned CSV (base64) |
| `POST` | `/api/clean/download?pipeline=basic` | Upload a file → download cleaned CSV directly |

### Example: Profile a Dataset

```bash
curl -X POST http://localhost:8000/api/profile -F "file=@spotify.csv"
```

### Example: Clean a Dataset

```bash
curl -X POST "http://localhost:8000/api/clean?pipeline=advanced" -F "file=@spotify.csv"
```

---

## 🧪 Pipelines

### Basic Pipeline
Fixed, predictable sequence — always does the same thing:
1. Remove exact duplicate rows
2. Fill missing values (numerical → median, categorical → mode)
3. Remove IQR outliers on numerical columns

### Advanced Pipeline
Reads the dataset profile first, then applies smarter rules:
- **Missing > 50%** → drop the column
- **Outliers < 5%** → remove
- **Outliers 5–15%** → cap (winsorise)
- **Outliers > 15%** → keep and flag

### Agent Pipeline *(Future)*
Will use an LLM planner to create structured cleaning plans with controlled tools, validation loops, and human approval for risky operations.

---

## 📊 Cleaning Report

Every pipeline run produces a structured report:

```json
{
  "pipeline": "advanced",
  "rows": { "before": 10000, "after": 9820 },
  "duplicates": { "removed": 180 },
  "missing_values": { "age": "median", "city": "mode" },
  "dropped_columns": ["sparse_col"],
  "outliers": { "salary": "capped (52 values, 8.2%)" },
  "validation": { "status": "PASS" }
}
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

## 📜 License

Part of the **Store Advisor** graduation project — August 2026.
