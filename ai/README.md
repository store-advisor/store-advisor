# Store Advisor — Data Cleaning System

An intelligent, modular data cleaning system built for the **Store Advisor** graduation project. Upload any tabular dataset and clean it using **Basic**, **Advanced**, or future **Agent** pipelines — with full audit reports, validation, and a REST API.

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

You should see **34 passed** ✅

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
│   ├── main.py                        # FastAPI entry point
│   ├── api/cleaning.py                # REST endpoints
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
├── tests/                             # 34 pytest tests
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

## 📜 License

Part of the **Store Advisor** graduation project — August 2026.
