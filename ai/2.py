import pandas as pd
import numpy as np


# ============================================================
# PROFILING
# ============================================================

def profile_dataset(df):
    """Analyze the dataset and return profiling information."""

    profile = {
        "rows": len(df),
        "columns": len(df.columns),
        "duplicate_rows": int(df.duplicated().sum()),
        "columns_info": {}
    }

    for column in df.columns:

        missing_count = int(df[column].isna().sum())
        missing_percentage = (
            missing_count / len(df) * 100
        )

        unique_count = int(
            df[column].nunique(dropna=True)
        )

        info = {
            "dtype": str(df[column].dtype),
            "missing_count": missing_count,
            "missing_percentage": round(
                missing_percentage, 2
            ),
            "unique_count": unique_count,
        }

        if pd.api.types.is_numeric_dtype(df[column]):

            info["numeric"] = True
            info["mean"] = float(
                df[column].mean()
            ) if not df[column].dropna().empty else None

            info["median"] = float(
                df[column].median()
            ) if not df[column].dropna().empty else None

            info["min"] = float(
                df[column].min()
            ) if not df[column].dropna().empty else None

            info["max"] = float(
                df[column].max()
            ) if not df[column].dropna().empty else None

        else:

            info["numeric"] = False

        profile["columns_info"][column] = info

    return profile


# ============================================================
# AGENT DECISION ENGINE
# ============================================================

def decide_cleaning_strategy(profile):
    """
    Decide what should be done with the dataset.

    This is the Agent's decision-making layer.

    Currently rule-based.
    Later this can be replaced/enhanced by an LLM.
    """

    plan = []

    # --------------------------------------------------------
    # 1. DUPLICATES
    # --------------------------------------------------------

    duplicate_count = profile["duplicate_rows"]

    if duplicate_count > 0:

        plan.append({
            "action": "remove_duplicates",
            "reason": (
                f"Found {duplicate_count} "
                "duplicate rows."
            )
        })

    # --------------------------------------------------------
    # 2. COLUMN ANALYSIS
    # --------------------------------------------------------

    for column, info in profile["columns_info"].items():

        missing_percentage = info[
            "missing_percentage"
        ]

        unique_count = info[
            "unique_count"
        ]

        # ----------------------------------------------------
        # Missing values
        # ----------------------------------------------------

        if missing_percentage > 0:

            # More than 50%
            if missing_percentage > 50:

                plan.append({
                    "action": "drop_column",
                    "column": column,
                    "reason": (
                        f"{column} has "
                        f"{missing_percentage:.2f}% "
                        "missing values."
                    )
                })

            # Numerical
            elif info["numeric"]:

                plan.append({
                    "action": "median_imputation",
                    "column": column,
                    "reason": (
                        f"{column} is numerical "
                        f"with {missing_percentage:.2f}% "
                        "missing values."
                    )
                })

            # Categorical
            else:

                plan.append({
                    "action": "mode_imputation",
                    "column": column,
                    "reason": (
                        f"{column} is categorical "
                        f"with {missing_percentage:.2f}% "
                        "missing values."
                    )
                })

        # ----------------------------------------------------
        # Numerical outliers
        # ----------------------------------------------------

        if info["numeric"]:

            if unique_count >= 10:

                plan.append({
                    "action": "analyze_outliers",
                    "column": column,
                    "reason": (
                        f"{column} is numerical "
                        "and has enough unique values "
                        "for outlier analysis."
                    )
                })

    return plan


# ============================================================
# OUTLIER DETECTION
# ============================================================

def get_outlier_mask(df, column):

    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)

    IQR = Q3 - Q1

    lower = Q1 - 1.5 * IQR
    upper = Q3 + 1.5 * IQR

    mask = (
        (df[column] < lower)
        | (df[column] > upper)
    )

    return mask


# ============================================================
# ACTION EXECUTOR
# ============================================================

def execute_action(df, action):

    action_type = action["action"]

    # --------------------------------------------------------
    # Remove duplicates
    # --------------------------------------------------------

    if action_type == "remove_duplicates":

        before = len(df)

        df = df.drop_duplicates()

        removed = before - len(df)

        action["result"] = (
            f"Removed {removed} duplicate rows."
        )

    # --------------------------------------------------------
    # Drop column
    # --------------------------------------------------------

    elif action_type == "drop_column":

        column = action["column"]

        if column in df.columns:

            df = df.drop(columns=[column])

            action["result"] = (
                f"Dropped column '{column}'."
            )

    # --------------------------------------------------------
    # Median
    # --------------------------------------------------------

    elif action_type == "median_imputation":

        column = action["column"]

        if column in df.columns:

            missing_before = df[column].isna().sum()

            median = df[column].median()

            df[column] = df[column].fillna(median)

            action["result"] = (
                f"Filled {missing_before} missing "
                f"values in '{column}' "
                f"using median ({median})."
            )

    # --------------------------------------------------------
    # Mode
    # --------------------------------------------------------

    elif action_type == "mode_imputation":

        column = action["column"]

        if column in df.columns:

            missing_before = df[column].isna().sum()

            mode = df[column].mode()

            if not mode.empty:

                value = mode.iloc[0]

                df[column] = (
                    df[column].fillna(value)
                )

                action["result"] = (
                    f"Filled {missing_before} missing "
                    f"values in '{column}' "
                    f"using mode ({value})."
                )

    # --------------------------------------------------------
    # Outliers
    # --------------------------------------------------------

    elif action_type == "analyze_outliers":

        column = action["column"]

        if column in df.columns:

            mask = get_outlier_mask(
                df,
                column
            )

            count = int(mask.sum())

            percentage = (
                count / len(df) * 100
            )

            # Agent decision
            if percentage < 5:

                df = df.loc[~mask].copy()

                action["decision"] = (
                    "remove"
                )

                action["result"] = (
                    f"Removed {count} outliers "
                    f"from '{column}'."
                )

            elif percentage < 15:

                Q1 = df[column].quantile(0.25)
                Q3 = df[column].quantile(0.75)

                IQR = Q3 - Q1

                lower = Q1 - 1.5 * IQR
                upper = Q3 + 1.5 * IQR

                df[column] = df[column].clip(
                    lower,
                    upper
                )

                action["decision"] = (
                    "cap"
                )

                action["result"] = (
                    f"Capped {count} outliers "
                    f"in '{column}'."
                )

            else:

                action["decision"] = (
                    "keep"
                )

                action["result"] = (
                    f"Found {count} potential "
                    f"outliers ({percentage:.2f}%), "
                    "but kept them because "
                    "the percentage is high."
                )

    return df


# ============================================================
# VALIDATION
# ============================================================

def validate_dataset(df):

    validation = {
        "rows": len(df),
        "columns": len(df.columns),
        "missing_values": int(
            df.isna().sum().sum()
        ),
        "duplicate_rows": int(
            df.duplicated().sum()
        ),
    }

    validation["status"] = "success"

    if validation["rows"] == 0:

        validation["status"] = "failed"

    return validation


# ============================================================
# AGENT
# ============================================================

class DataCleaningAgent:

    def __init__(self):

        self.profile = None
        self.plan = []
        self.actions = []
        self.validation = None

    # --------------------------------------------------------
    # RUN AGENT
    # --------------------------------------------------------

    def run(self, df):

        df = df.copy()

        print("\n" + "=" * 60)
        print("DATA CLEANING AGENT")
        print("=" * 60)

        # ====================================================
        # STEP 1: PROFILE
        # ====================================================

        print("\n[1] Profiling dataset...")

        self.profile = profile_dataset(df)

        # ====================================================
        # STEP 2: DECIDE
        # ====================================================

        print("[2] Creating cleaning plan...")

        self.plan = decide_cleaning_strategy(
            self.profile
        )

        # ====================================================
        # STEP 3: SHOW PLAN
        # ====================================================

        print("\nCleaning Plan:")

        for i, action in enumerate(
            self.plan,
            start=1
        ):

            print(
                f"{i}. "
                f"{action['action']} "
                f"{action.get('column', '')}"
            )

            print(
                f"   Reason: "
                f"{action['reason']}"
            )

        # ====================================================
        # STEP 4: EXECUTE
        # ====================================================

        print("\n[3] Executing plan...")

        for action in self.plan:

            df = execute_action(
                df,
                action
            )

            self.actions.append(action)

        # ====================================================
        # STEP 5: VALIDATE
        # ====================================================

        print("\n[4] Validating dataset...")

        self.validation = validate_dataset(
            df
        )

        # ====================================================
        # STEP 6: RESULT
        # ====================================================

        print("\n[5] Agent finished.")

        print(
            f"Final shape: "
            f"{df.shape}"
        )

        print(
            f"Missing values: "
            f"{self.validation['missing_values']}"
        )

        print(
            f"Duplicates: "
            f"{self.validation['duplicate_rows']}"
        )

        return df

    # --------------------------------------------------------
    # REPORT
    # --------------------------------------------------------

    def get_report(self):

        return {
            "profile": self.profile,
            "plan": self.plan,
            "actions": self.actions,
            "validation": self.validation
        }


# ============================================================
# MAIN
# ============================================================

def main():

    file_path = input(
        "Enter dataset path: "
    )

    df = pd.read_csv(file_path)

    print(
        f"\nOriginal shape: {df.shape}"
    )

    agent = DataCleaningAgent()

    cleaned_df = agent.run(df)

    print(
        f"\nCleaned shape: "
        f"{cleaned_df.shape}"
    )

    # Optional
    cleaned_df.to_csv(
        "cleaned_data.csv",
        index=False
    )


if __name__ == "__main__":
    main()