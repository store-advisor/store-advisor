"""
Store Advisor — Data Cleaning Frontend (Streamlit)

Three pipeline modes:
  🟢 Basic    — one-click automated cleaning
  🟡 Advanced — per-column strategy choices + custom Python code editor
  🔴 Agent    — future LLM-powered cleaning (placeholder)
"""

import io
import traceback
import numpy as np
import pandas as pd
import streamlit as st

# ── must be first Streamlit call ─────────────────────────────────────────────
st.set_page_config(
    page_title="Store Advisor — Data Cleaning",
    page_icon="🧹",
    layout="wide",
    initial_sidebar_state="expanded",
)

from app.services.profiler import profile_dataset
from app.services.validator import validate_dataset
from app.cleaning.operations.duplicates import remove_duplicates
from app.cleaning.operations.missing_values import (
    handle_missing_values_basic,
    handle_missing_values_advanced,
)
from app.cleaning.operations.outliers import (
    detect_outliers_iqr,
    remove_outliers_iqr,
    cap_outliers,
)
from app.cleaning.operations.types import fix_data_types
from app.cleaning.pipelines.basic import basic_pipeline
from app.cleaning.pipelines.advanced import advanced_pipeline
from app.cleaning.report import CleaningReport


# ═══════════════════════════════════════════════════════════════════════════════
# CUSTOM CSS
# ═══════════════════════════════════════════════════════════════════════════════

st.markdown("""
<style>
    /* ── Global ─────────────────────────────────────────────── */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    html, body, [class*="css"] { font-family: 'Inter', sans-serif; }

    /* ── Sidebar ────────────────────────────────────────────── */
    section[data-testid="stSidebar"] {
        background: linear-gradient(180deg, #0f0c29, #302b63, #24243e);
    }
    section[data-testid="stSidebar"] * { color: #e0e0e0 !important; }

    /* ── Metric cards ───────────────────────────────────────── */
    [data-testid="stMetric"] {
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 12px;
        padding: 16px 20px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    }
    [data-testid="stMetric"] label { color: #8892b0 !important; font-size: 0.82rem; }
    [data-testid="stMetricValue"] { color: #ccd6f6 !important; font-weight: 700; }
    [data-testid="stMetricDelta"] { font-size: 0.75rem; }

    /* ── Tabs ───────────────────────────────────────────────── */
    .stTabs [data-baseweb="tab-list"] {
        gap: 8px;
        background: rgba(255,255,255,0.03);
        border-radius: 12px;
        padding: 4px;
    }
    .stTabs [data-baseweb="tab"] {
        border-radius: 10px;
        padding: 10px 28px;
        font-weight: 600;
        transition: all 0.2s;
    }
    .stTabs [aria-selected="true"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
        color: white !important;
        box-shadow: 0 4px 15px rgba(102,126,234,0.35);
    }

    /* ── Buttons ─────────────────────────────────────────────── */
    .stButton > button {
        border-radius: 10px;
        font-weight: 600;
        padding: 0.6rem 2rem;
        transition: all 0.3s ease;
        border: none;
    }
    .stButton > button:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 20px rgba(102,126,234,0.4);
    }
    div.stButton > button[kind="primary"] {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
    }

    /* ── Expander ────────────────────────────────────────────── */
    .streamlit-expanderHeader {
        font-weight: 600;
        font-size: 1rem;
        border-radius: 8px;
    }

    /* ── Code editor area ────────────────────────────────────── */
    .stTextArea textarea {
        font-family: 'JetBrains Mono', 'Fira Code', 'Consolas', monospace !important;
        font-size: 14px !important;
        background: #0d1117 !important;
        color: #c9d1d9 !important;
        border: 1px solid #30363d !important;
        border-radius: 8px;
    }

    /* ── Success/Info boxes ──────────────────────────────────── */
    .success-box {
        background: linear-gradient(135deg, #0d3320 0%, #0a2f1f 100%);
        border-left: 4px solid #10b981;
        padding: 16px 20px;
        border-radius: 0 10px 10px 0;
        margin: 10px 0;
    }
    .warning-box {
        background: linear-gradient(135deg, #3d2e0a 0%, #332800 100%);
        border-left: 4px solid #f59e0b;
        padding: 16px 20px;
        border-radius: 0 10px 10px 0;
        margin: 10px 0;
    }
    .agent-placeholder {
        text-align: center;
        padding: 80px 40px;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        border-radius: 16px;
        border: 2px dashed rgba(255,255,255,0.1);
    }
</style>
""", unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

@st.cache_data
def load_file(uploaded) -> pd.DataFrame:
    name = uploaded.name.lower()
    if name.endswith(".csv"):
        return pd.read_csv(uploaded)
    elif name.endswith((".xlsx", ".xls")):
        return pd.read_excel(uploaded)
    elif name.endswith(".json"):
        return pd.read_json(uploaded)
    else:
        st.error("Unsupported file. Use CSV, XLSX, or JSON.")
        st.stop()


def show_profile_metrics(profile: dict):
    """Display dataset-level metrics in a nice row."""
    ds = profile["dataset"]
    c1, c2, c3 = st.columns(3)
    c1.metric("Rows", f"{ds['rows']:,}")
    c2.metric("Columns", f"{ds['columns']:,}")
    c3.metric("Duplicate Rows", f"{ds['duplicate_rows']:,}")


def show_column_table(profile: dict):
    """Show a profiling table of all columns."""
    rows = []
    for col in profile["columns"]:
        row = {
            "Column": col["name"],
            "Type": col["dtype"],
            "Missing": col["missing_count"],
            "Missing %": col["missing_percentage"],
            "Unique": col["unique_count"],
            "Flags": ", ".join(col["quality_flags"]) or "—",
        }
        rows.append(row)
    st.dataframe(pd.DataFrame(rows), use_container_width=True, hide_index=True)


def show_report(report: CleaningReport):
    """Render a cleaning report."""
    r = report.to_dict()

    st.markdown("### 📋 Cleaning Report")

    c1, c2, c3, c4 = st.columns(4)
    c1.metric("Pipeline", r["pipeline"].title())
    c2.metric("Rows Before", f"{r['rows']['before']:,}")
    c3.metric("Rows After", f"{r['rows']['after']:,}")
    removed = r["rows"]["before"] - r["rows"]["after"]
    c4.metric("Rows Removed", f"{removed:,}",
              delta=f"-{removed}" if removed else "0", delta_color="inverse")

    col1, col2 = st.columns(2)

    with col1:
        st.markdown("**Duplicates Removed:** " + str(r["duplicates"]["removed"]))
        if r["missing_values"]:
            st.markdown("**Missing Value Actions:**")
            for col_name, strategy in r["missing_values"].items():
                st.markdown(f"- `{col_name}` → {strategy}")

    with col2:
        if r["dropped_columns"]:
            st.markdown("**Dropped Columns:** " + ", ".join(f"`{c}`" for c in r["dropped_columns"]))
        if r["outliers"]:
            st.markdown("**Outlier Actions:**")
            for col_name, action in r["outliers"].items():
                st.markdown(f"- `{col_name}` → {action}")

    # Validation status
    v = r.get("validation", {})
    status = v.get("status", "N/A")
    if status == "PASS":
        st.success(f"✅ Validation: **{status}**")
    else:
        st.error(f"❌ Validation: **{status}**")
        for err in v.get("errors", []):
            st.warning(err)


def download_button(df: pd.DataFrame, label: str = "📥 Download Cleaned CSV"):
    csv = df.to_csv(index=False)
    st.download_button(
        label=label,
        data=csv,
        file_name="cleaned_dataset.csv",
        mime="text/csv",
        type="primary",
    )


# ═══════════════════════════════════════════════════════════════════════════════
# SIDEBAR
# ═══════════════════════════════════════════════════════════════════════════════

with st.sidebar:
    st.markdown("# 🧹 Store Advisor")
    st.markdown("### Data Cleaning System")
    st.markdown("---")

    uploaded_file = st.file_uploader(
        "📁 Upload Dataset",
        type=["csv", "xlsx", "xls", "json"],
        help="Supported: CSV, Excel, JSON",
    )

    st.markdown("---")
    st.markdown(
        "<small>Store Advisor © 2026</small>",
        unsafe_allow_html=True,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN CONTENT
# ═══════════════════════════════════════════════════════════════════════════════

st.markdown("# 🧹 Store Advisor — Data Cleaning")
st.markdown("Upload a dataset and clean it with **Basic**, **Advanced**, or **Agent** pipelines.")

if uploaded_file is None:
    st.markdown("""
    <div style="text-align:center; padding:80px 40px; background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);
                border-radius:16px; border:2px dashed rgba(255,255,255,0.1); margin-top:30px;">
        <h2 style="color:#ccd6f6;">📂 Upload a dataset to get started</h2>
        <p style="color:#8892b0;">Use the sidebar to upload a CSV, Excel, or JSON file</p>
    </div>
    """, unsafe_allow_html=True)
    st.stop()

# Load data
df_original = load_file(uploaded_file)
profile = profile_dataset(df_original)

# ── Tabs ─────────────────────────────────────────────────────────────────────
tab_basic, tab_advanced, tab_agent = st.tabs([
    "🟢 Basic Pipeline",
    "🟡 Advanced Pipeline",
    "🔴 Agent Pipeline",
])

# ═══════════════════════════════════════════════════════════════════════════════
# TAB 1: BASIC
# ═══════════════════════════════════════════════════════════════════════════════
with tab_basic:
    st.markdown("### 🟢 Basic Pipeline")
    st.markdown("Fixed sequence: **Dedup → Median/Mode Imputation → IQR Outlier Removal**")
    st.markdown("---")

    # Show profile
    with st.expander("📊 Dataset Profile", expanded=True):
        show_profile_metrics(profile)
        show_column_table(profile)

    # Preview
    with st.expander("👀 Data Preview"):
        st.dataframe(df_original.head(20), use_container_width=True)

    # Clean button
    st.markdown("---")
    if st.button("🚀 Run Basic Cleaning", key="btn_basic", type="primary"):
        with st.spinner("Cleaning with Basic pipeline..."):
            cleaned_df, report = basic_pipeline(df_original)

        st.session_state["basic_cleaned"] = cleaned_df
        st.session_state["basic_report"] = report

    if "basic_cleaned" in st.session_state:
        show_report(st.session_state["basic_report"])

        st.markdown("---")
        with st.expander("👀 Cleaned Data Preview"):
            st.dataframe(st.session_state["basic_cleaned"].head(20), use_container_width=True)

        download_button(st.session_state["basic_cleaned"])


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 2: ADVANCED
# ═══════════════════════════════════════════════════════════════════════════════
with tab_advanced:
    st.markdown("### 🟡 Advanced Pipeline")
    st.markdown("Choose your cleaning strategies **per column**, or write **custom Python code**.")
    st.markdown("---")

    # Show profile
    with st.expander("📊 Dataset Profile", expanded=True):
        show_profile_metrics(profile)
        show_column_table(profile)

    # ── Step 1: Strategy selection ───────────────────────────────────────────
    st.markdown("### ⚙️ Step 1: Choose Cleaning Strategies")

    col_profiles = {c["name"]: c for c in profile["columns"]}

    # Duplicates
    st.markdown("#### 🔁 Duplicates")
    dup_strategy = st.radio(
        "How to handle duplicate rows?",
        ["Remove all duplicates", "Keep duplicates"],
        key="dup_strategy",
        horizontal=True,
    )

    # Missing values per column
    st.markdown("#### ❓ Missing Values")
    missing_strategies = {}
    cols_with_missing = [
        c["name"] for c in profile["columns"] if c["missing_count"] > 0
    ]

    if not cols_with_missing:
        st.info("No missing values found in the dataset! ✨")
    else:
        for col_name in cols_with_missing:
            cp = col_profiles[col_name]
            is_num = cp["dtype"] in ("int64", "float64", "int32", "float32")

            if is_num:
                options = ["Median", "Mean", "Drop column", "Fill with 0"]
            else:
                options = ["Mode", "Fill with 'Unknown'", "Drop column"]

            missing_strategies[col_name] = st.selectbox(
                f"`{col_name}` — {cp['missing_count']} missing ({cp['missing_percentage']}%)",
                options,
                key=f"miss_{col_name}",
            )

    # Outliers per numerical column
    st.markdown("#### 📈 Outliers")
    outlier_strategies = {}
    num_cols = [
        c["name"] for c in profile["columns"]
        if c.get("numerical_stats") is not None
    ]

    if not num_cols:
        st.info("No numerical columns to check for outliers.")
    else:
        for col_name in num_cols:
            mask = detect_outliers_iqr(df_original, col_name)
            outlier_count = int(mask.sum())
            outlier_pct = round(outlier_count / len(df_original) * 100, 1) if len(df_original) else 0

            if outlier_count > 0:
                outlier_strategies[col_name] = st.selectbox(
                    f"`{col_name}` — {outlier_count} outliers ({outlier_pct}%)",
                    ["Remove", "Cap (Winsorise)", "Keep"],
                    key=f"out_{col_name}",
                )

        if not outlier_strategies:
            st.info("No outliers detected in numerical columns! ✨")

    # ── Step 2: Run with strategies ──────────────────────────────────────────
    st.markdown("---")
    st.markdown("### 🚀 Step 2: Run Advanced Cleaning")

    adv_col1, adv_col2 = st.columns(2)

    with adv_col1:
        if st.button("▶️ Run with Selected Strategies", key="btn_adv_strategies", type="primary"):
            with st.spinner("Cleaning with your strategies..."):
                df_work = df_original.copy()
                report = CleaningReport(pipeline="advanced (custom)", rows_before=len(df_work))

                # Duplicates
                if dup_strategy == "Remove all duplicates":
                    df_work, dup_count = remove_duplicates(df_work)
                    report.record_duplicates(dup_count)

                # Missing values
                for col_name, strategy in missing_strategies.items():
                    if col_name not in df_work.columns:
                        continue
                    if strategy == "Median":
                        val = df_work[col_name].median()
                        df_work[col_name] = df_work[col_name].fillna(val)
                        report.record_missing({col_name: "median"})
                    elif strategy == "Mean":
                        val = df_work[col_name].mean()
                        df_work[col_name] = df_work[col_name].fillna(val)
                        report.record_missing({col_name: "mean"})
                    elif strategy == "Mode":
                        mode = df_work[col_name].mode()
                        if not mode.empty:
                            df_work[col_name] = df_work[col_name].fillna(mode.iloc[0])
                        report.record_missing({col_name: "mode"})
                    elif strategy == "Fill with 'Unknown'":
                        df_work[col_name] = df_work[col_name].fillna("Unknown")
                        report.record_missing({col_name: "unknown"})
                    elif strategy == "Fill with 0":
                        df_work[col_name] = df_work[col_name].fillna(0)
                        report.record_missing({col_name: "zero"})
                    elif strategy == "Drop column":
                        df_work = df_work.drop(columns=[col_name])
                        report.record_dropped_columns([col_name])
                        report.record_missing({col_name: "dropped"})

                # Outliers
                for col_name, strategy in outlier_strategies.items():
                    if col_name not in df_work.columns:
                        continue
                    if strategy == "Remove":
                        df_work, removed = remove_outliers_iqr(df_work, col_name)
                        report.record_outlier(col_name, f"removed ({removed} rows)")
                    elif strategy == "Cap (Winsorise)":
                        df_work, capped = cap_outliers(df_work, col_name)
                        report.record_outlier(col_name, f"capped ({capped} values)")
                    elif strategy == "Keep":
                        report.record_outlier(col_name, "retained")

                report.rows_after = len(df_work)
                validation = validate_dataset(df_original, df_work)
                report.record_validation(validation)

            st.session_state["adv_cleaned"] = df_work
            st.session_state["adv_report"] = report

    with adv_col2:
        if st.button("▶️ Run Auto-Advanced Pipeline", key="btn_adv_auto"):
            with st.spinner("Running profile-driven advanced cleaning..."):
                cleaned_df, report = advanced_pipeline(df_original)
            st.session_state["adv_cleaned"] = cleaned_df
            st.session_state["adv_report"] = report

    if "adv_cleaned" in st.session_state:
        show_report(st.session_state["adv_report"])
        st.markdown("---")
        with st.expander("👀 Cleaned Data Preview"):
            st.dataframe(st.session_state["adv_cleaned"].head(20), use_container_width=True)
        download_button(st.session_state["adv_cleaned"], "📥 Download Advanced-Cleaned CSV")

    # ── Step 3: Custom Python Code ───────────────────────────────────────────
    st.markdown("---")
    st.markdown("### 🐍 Step 3: Custom Python Cleaning (Optional)")
    st.markdown(
        "Write your own cleaning code below. The variable `df` contains your dataset. "
        "Your code must produce a cleaned DataFrame in a variable called `df`."
    )

    default_code = '''# Your custom cleaning code
# The DataFrame is available as `df`
# Make sure the final result is stored in `df`

# Example:
# df = df.dropna(subset=["important_column"])
# df["price"] = df["price"].clip(lower=0)
# df = df[df["quantity"] > 0]
'''

    custom_code = st.text_area(
        "✏️ Python Code Editor",
        value=default_code,
        height=300,
        key="custom_code",
        help="Write pandas/numpy code. `df` is your DataFrame.",
    )

    if st.button("🐍 Run Custom Code", key="btn_custom", type="primary"):
        with st.spinner("Executing your code..."):
            try:
                # Use the already-cleaned df if available, otherwise original
                if "adv_cleaned" in st.session_state:
                    df = st.session_state["adv_cleaned"].copy()
                else:
                    df = df_original.copy()

                # Restricted execution environment
                exec_globals = {
                    "pd": pd,
                    "np": np,
                    "df": df,
                    "__builtins__": {
                        "print": print,
                        "len": len,
                        "range": range,
                        "list": list,
                        "dict": dict,
                        "set": set,
                        "tuple": tuple,
                        "str": str,
                        "int": int,
                        "float": float,
                        "bool": bool,
                        "min": min,
                        "max": max,
                        "sum": sum,
                        "abs": abs,
                        "round": round,
                        "sorted": sorted,
                        "enumerate": enumerate,
                        "zip": zip,
                        "isinstance": isinstance,
                        "type": type,
                        "True": True,
                        "False": False,
                        "None": None,
                    },
                }

                exec(custom_code, exec_globals)

                result_df = exec_globals.get("df", None)
                if result_df is None or not isinstance(result_df, pd.DataFrame):
                    st.error("❌ Your code must produce a DataFrame stored in `df`.")
                else:
                    # Build a minimal report
                    report = CleaningReport(
                        pipeline="custom python",
                        rows_before=len(df),
                        rows_after=len(result_df),
                    )
                    validation = validate_dataset(df, result_df)
                    report.record_validation(validation)

                    st.session_state["custom_cleaned"] = result_df
                    st.session_state["custom_report"] = report

                    st.success(f"✅ Code executed successfully! "
                              f"Rows: {len(df):,} → {len(result_df):,}")

            except Exception:
                st.error("❌ Error in your code:")
                st.code(traceback.format_exc(), language="python")

    if "custom_cleaned" in st.session_state:
        show_report(st.session_state["custom_report"])
        with st.expander("👀 Custom-Cleaned Data Preview"):
            st.dataframe(st.session_state["custom_cleaned"].head(20), use_container_width=True)
        download_button(st.session_state["custom_cleaned"], "📥 Download Custom-Cleaned CSV")


# ═══════════════════════════════════════════════════════════════════════════════
# TAB 3: AGENT
# ═══════════════════════════════════════════════════════════════════════════════
with tab_agent:
    st.markdown("""
    <div class="agent-placeholder">
        <h2 style="color:#ccd6f6; margin-bottom:16px;">🤖 Agent Pipeline</h2>
        <h4 style="color:#f59e0b; margin-bottom:24px;">Coming Soon — Phase 3</h4>
        <p style="color:#8892b0; max-width:600px; margin:0 auto; line-height:1.7;">
            The <strong>Smart Agent</strong> will use an LLM planner to automatically
            analyse your dataset, create a structured cleaning plan, execute only
            approved operations, validate results, and explain every decision.
        </p>
        <br>
        <p style="color:#4a5568; font-size:0.9rem;">
            ✅ Profiler → ✅ Planner → ✅ Controlled Tools → ✅ Validator → ✅ Explanation
        </p>
        <br>
        <p style="color:#4a5568; font-size:0.85rem;">
            Use <strong>Basic</strong> or <strong>Advanced</strong> pipelines in the meantime.
        </p>
    </div>
    """, unsafe_allow_html=True)

    # Still show its profile
    with st.expander("📊 Dataset Profile"):
        show_profile_metrics(profile)
        show_column_table(profile)
