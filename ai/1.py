import pandas as pd
import numpy as np


# ============================================================
# DATA LOADING
# ============================================================

def load_data(file_path):
    """Load data from a supported file format."""

    file_path = str(file_path).lower()

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
            "Supported formats: CSV, XLSX, JSON, HTML, XML."
        )


# ============================================================
# DATA PROFILING
# ============================================================

def data_profiling(df):
    """Generate a basic profiling report."""

    profile = pd.DataFrame({
        "column": df.columns,
        "dtype": df.dtypes.astype(str).values,
        "missing_count": df.isnull().sum().values,
        "missing_percentage": (
            df.isnull().sum().values / len(df) * 100
        ).round(2),
        "unique_values": [
            df[col].nunique(dropna=True)
            for col in df.columns
        ],
    })

    return profile


def display_basic_info(df):
    """Display basic dataset information."""

    print("\n" + "=" * 60)
    print("DATASET INFORMATION")
    print("=" * 60)

    print(f"Rows    : {df.shape[0]}")
    print(f"Columns : {df.shape[1]}")

    print("\nData Types:")
    print(df.dtypes)

    print("\nFirst 5 rows:")
    print(df.head())


# ============================================================
# DUPLICATES
# ============================================================

def check_duplicates(df):
    """Return number of duplicate rows."""

    return df.duplicated().sum()


def remove_duplicates(df):
    """Remove completely duplicated rows."""

    before = len(df)

    df = df.drop_duplicates().reset_index(drop=True)

    removed = before - len(df)

    print(f"Duplicates removed: {removed}")

    return df


# ============================================================
# MISSING VALUES
# ============================================================

def handle_missing_values_basic(df):
    """
    Basic missing-value strategy.

    Numerical columns -> median
    Categorical columns -> mode
    """

    df = df.copy()

    for column in df.columns:

        if df[column].isnull().sum() == 0:
            continue

        # Numerical column
        if pd.api.types.is_numeric_dtype(df[column]):

            median = df[column].median()

            if pd.notna(median):
                df[column] = df[column].fillna(median)

        # Categorical column
        else:

            mode = df[column].mode()

            if not mode.empty:
                df[column] = df[column].fillna(mode.iloc[0])

    return df


# ============================================================
# OUTLIERS
# ============================================================

def detect_outliers_iqr(df, column):
    """Detect outliers using the IQR method."""

    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)

    IQR = Q3 - Q1

    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR

    mask = (
        (df[column] < lower_bound)
        | (df[column] > upper_bound)
    )

    return mask


def remove_outliers_iqr(df, column):
    """Remove IQR outliers from one numerical column."""

    mask = detect_outliers_iqr(df, column)

    removed = mask.sum()

    if removed > 0:
        print(
            f"{column}: removed {removed} outliers"
        )

    return df.loc[~mask].copy()


# ============================================================
# BASIC PIPELINE
# ============================================================

def basic_pipeline(df):
    """
    Basic fixed cleaning pipeline.

    Steps:
        1. Remove duplicates
        2. Handle missing values
        3. Remove numerical outliers
    """

    print("\n" + "=" * 60)
    print("BASIC CLEANING PIPELINE")
    print("=" * 60)

    df = df.copy()

    # --------------------------------------------------------
    # Step 1: Remove duplicates
    # --------------------------------------------------------

    df = remove_duplicates(df)

    # --------------------------------------------------------
    # Step 2: Handle missing values
    # --------------------------------------------------------

    df = handle_missing_values_basic(df)

    # --------------------------------------------------------
    # Step 3: Remove numerical outliers
    # --------------------------------------------------------

    numerical_columns = df.select_dtypes(
        include=np.number
    ).columns

    for column in numerical_columns:

        df = remove_outliers_iqr(
            df,
            column
        )

    return df


# ============================================================
# ADVANCED MISSING VALUES
# ============================================================

def handle_missing_values_advanced(df):
    """
    Advanced rule-based missing-value handling.

    The strategy depends on the percentage of missing data.
    """

    df = df.copy()

    for column in df.columns:

        missing_count = df[column].isnull().sum()

        if missing_count == 0:
            continue

        missing_percentage = (
            missing_count / len(df)
        ) * 100

        print(
            f"{column}: "
            f"{missing_percentage:.2f}% missing"
        )

        # ----------------------------------------------------
        # More than 50% missing
        # ----------------------------------------------------

        if missing_percentage > 50:

            print(
                f"  -> Dropping column "
                f"(>50% missing)"
            )

            df = df.drop(columns=[column])

        # ----------------------------------------------------
        # Numerical columns
        # ----------------------------------------------------

        elif pd.api.types.is_numeric_dtype(
            df[column]
        ):

            # High missingness
            if missing_percentage > 20:

                print("  -> Median imputation")

                df[column] = df[column].fillna(
                    df[column].median()
                )

            # Low missingness
            else:

                print("  -> Median imputation")

                df[column] = df[column].fillna(
                    df[column].median()
                )

        # ----------------------------------------------------
        # Categorical columns
        # ----------------------------------------------------

        else:

            mode = df[column].mode()

            if not mode.empty:

                print("  -> Mode imputation")

                df[column] = df[column].fillna(
                    mode.iloc[0]
                )

    return df


# ============================================================
# ADVANCED OUTLIERS
# ============================================================

def handle_outliers_advanced(df):
    """
    Advanced rule-based outlier handling.

    Instead of blindly removing every outlier,
    only numerical columns are considered.
    """

    df = df.copy()

    numerical_columns = df.select_dtypes(
        include=np.number
    ).columns

    for column in numerical_columns:

        # Skip columns with very low cardinality
        if df[column].nunique() < 10:
            continue

        mask = detect_outliers_iqr(
            df,
            column
        )

        outlier_percentage = (
            mask.sum() / len(df)
        ) * 100

        print(
            f"{column}: "
            f"{outlier_percentage:.2f}% outliers"
        )

        # ----------------------------------------------------
        # If very few outliers -> remove
        # ----------------------------------------------------

        if outlier_percentage < 5:

            print("  -> Removing outliers")

            df = df.loc[~mask].copy()

        # ----------------------------------------------------
        # If many outliers -> don't remove blindly
        # Cap instead
        # ----------------------------------------------------

        elif outlier_percentage < 15:

            print("  -> Capping outliers")

            Q1 = df[column].quantile(0.25)
            Q3 = df[column].quantile(0.75)

            IQR = Q3 - Q1

            lower_bound = Q1 - 1.5 * IQR
            upper_bound = Q3 + 1.5 * IQR

            df[column] = df[column].clip(
                lower_bound,
                upper_bound
            )

        # ----------------------------------------------------
        # Too many outliers
        # ----------------------------------------------------

        else:

            print(
                "  -> Keeping values "
                "(too many potential outliers)"
            )

    return df


# ============================================================
# ADVANCED PIPELINE
# ============================================================

def advanced_pipeline(df):
    """
    Advanced rule-based cleaning pipeline.

    Steps:
        1. Profile data
        2. Remove duplicates
        3. Advanced missing-value handling
        4. Advanced outlier handling
    """

    print("\n" + "=" * 60)
    print("ADVANCED CLEANING PIPELINE")
    print("=" * 60)

    df = df.copy()

    # --------------------------------------------------------
    # Step 1: Profiling
    # --------------------------------------------------------

    profile = data_profiling(df)

    print("\nInitial Profile:")
    print(profile.to_string(index=False))

    # --------------------------------------------------------
    # Step 2: Remove duplicates
    # --------------------------------------------------------

    df = remove_duplicates(df)

    # --------------------------------------------------------
    # Step 3: Missing values
    # --------------------------------------------------------

    df = handle_missing_values_advanced(df)

    # --------------------------------------------------------
    # Step 4: Outliers
    # --------------------------------------------------------

    df = handle_outliers_advanced(df)

    return df


# ============================================================
# PIPELINE SELECTOR
# ============================================================

def run_pipeline(df, pipeline="basic"):
    """
    Run the selected cleaning pipeline.

    Available:
        basic
        advanced

    Agent will be added later.
    """

    if pipeline == "basic":

        return basic_pipeline(df)

    elif pipeline == "advanced":

        return advanced_pipeline(df)

    else:

        raise ValueError(
            "Invalid pipeline. "
            "Choose 'basic' or 'advanced'."
        )


# ============================================================
# MAIN
# ============================================================

def main():

    file_path = input(
        "Enter dataset path: "
    )

    pipeline = input(
        "Choose pipeline "
        "(basic / advanced): "
    ).lower().strip()

    # --------------------------------------------------------
    # Load
    # --------------------------------------------------------

    df = load_data(file_path)

    print("\nOriginal dataset:")

    display_basic_info(df)

    # --------------------------------------------------------
    # Run pipeline
    # --------------------------------------------------------

    cleaned_df = run_pipeline(
        df,
        pipeline
    )

    # --------------------------------------------------------
    # Results
    # --------------------------------------------------------

    print("\n" + "=" * 60)
    print("CLEANING COMPLETED")
    print("=" * 60)

    print(
        f"Original shape : {df.shape}"
    )

    print(
        f"Cleaned shape  : {cleaned_df.shape}"
    )

    print("\nRemaining missing values:")

    print(
        cleaned_df.isnull().sum()
    )

    print("\nRemaining duplicates:")

    print(
        cleaned_df.duplicated().sum()
    )


if __name__ == "__main__":
    main()