"""
basic_cleaning.py — Refactored to use the modular cleaning system.

This file now delegates to the pipeline runner for actual cleaning and
keeps a standalone CLI interface for quick use.
"""

import pandas as pd
from app.cleaning.pipeline_runner import run_pipeline
from app.services.profiler import profile_dataset


# ── File loading (preserved for CLI use) ─────────────────────────────────────

def load_data(file_path: str) -> pd.DataFrame:
    """Load data from a supported file format."""
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    elif file_path.endswith(".xlsx"):
        return pd.read_excel(file_path)
    elif file_path.endswith(".json"):
        return pd.read_json(file_path)
    elif file_path.endswith(".html"):
        tables = pd.read_html(file_path)
        return tables[0]
    elif file_path.endswith(".xml"):
        return pd.read_xml(file_path)
    else:
        raise ValueError(
            "Unsupported file type. "
            "Supported formats: csv, xlsx, json, html, xml"
        )


def display_basic_info(df: pd.DataFrame) -> None:
    """Display basic information about the dataset."""
    print("Dataset Shape:", df.shape)
    print("\nDataset Info:")
    df.info()
    print("\nFirst 5 rows:")
    print(df.head())


def main():
    file_path = input("Enter the file path: ")
    df = load_data(file_path)

    print("\n===== BEFORE CLEANING =====")
    display_basic_info(df)

    # Show profiling
    profile = profile_dataset(df)
    print("\n===== DATA PROFILE =====")
    print(f"Rows: {profile['dataset']['rows']}")
    print(f"Columns: {profile['dataset']['columns']}")
    print(f"Duplicates: {profile['dataset']['duplicate_rows']}")
    for col in profile["columns"]:
        flags = ", ".join(col["quality_flags"]) if col["quality_flags"] else "none"
        print(f"  {col['name']:20s}  type={col['dtype']:10s}  "
              f"missing={col['missing_percentage']}%  flags={flags}")

    # Choose pipeline
    choice = input("\nPipeline (basic/advanced) [basic]: ").strip().lower()
    if choice not in ("basic", "advanced"):
        choice = "basic"

    cleaned_df, report = run_pipeline(df, pipeline=choice)

    print("\n===== AFTER CLEANING =====")
    display_basic_info(cleaned_df)

    # Print report
    r = report.to_dict()
    print("\n===== CLEANING REPORT =====")
    print(f"Pipeline: {r['pipeline']}")
    print(f"Rows: {r['rows']['before']} → {r['rows']['after']}")
    print(f"Duplicates removed: {r['duplicates']['removed']}")
    if r["missing_values"]:
        print("Missing values:")
        for col, strategy in r["missing_values"].items():
            print(f"  {col} → {strategy}")
    if r["dropped_columns"]:
        print(f"Dropped columns: {', '.join(r['dropped_columns'])}")
    if r["outliers"]:
        print("Outliers:")
        for col, action in r["outliers"].items():
            print(f"  {col} → {action}")
    print(f"Validation: {r['validation'].get('status', 'N/A')}")


if __name__ == "__main__":
    main()