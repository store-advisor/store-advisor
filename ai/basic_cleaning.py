import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import seaborn as sns


#load data from any file
def load_data(file_path):
    """Load data from any file."""
    if file_path.endswith(".csv"):
        return pd.read_csv(file_path)
    elif file_path.endswith(".xlsx"):
        return pd.read_excel(file_path)
    elif file_path.endswith(".json"):
        return pd.read_json(file_path)
    elif file_path.endswith(".html"):
        return pd.read_html(file_path)
    elif file_path.endswith(".xml"):
        return pd.read_xml(file_path)
    elif file_path.endswith(".sql"):
        return pd.read_sql(file_path)
    else:
        raise ValueError("Invalid file type. Choose from 'csv' or 'xlsx'.")

#------------------------------------------------
#data profiling
def display_basic_info(df):
    """Display basic information about the dataset."""
    print("Dataset Shape:", df.shape)
    print("\nDataset Info:")
    df.info()
    print("\nFirst 5 rows:")
    print(df.head())

#------------------------------------------------
def data_profiling(df):
    # Build the table using list comprehensions 
    summary_table = pd.DataFrame({
    'Column Name': df.columns,
    'Unique Values': [df[col].nunique() for col in df.columns],
    'Duplicate Values': [df[col].duplicated().sum() for col in df.columns],
    'Total Count': df.count(),
    'Missing Values': df.isnull().sum(),
    'Missing %': (df.isnull().sum() / len(df) * 100).round(2),
    'Data Type': df.dtypes,
    })

    # Display the table
    print(summary_table.to_string(index=False)) # to_string hides the default numeric index
    

def check_missing_values(df):
    """Check for missing values in the dataset."""
    missing_values = df.isnull().sum()
    print("\nMissing values per column:")
    print(missing_values)

def check_duplicates(df):
    """Check for duplicate rows in the dataset."""
    duplicate_rows = df.duplicated().sum()
    print("\nNumber of duplicate rows:", duplicate_rows)







#------------------------------------------------
#handling values
def remove_duplicates(df):
    """Remove duplicate rows from the dataset."""
    return df.drop_duplicates()


def remove_duplicates_by_column(df, column):
    """Remove duplicate rows from the dataset based on a specific column."""
    return df.drop_duplicates(subset=[column])


def handle_missing_values_categorical(df, column, strategy="mode"):
    """Handle missing values in the dataset."""
    if strategy == "mode":
        return df[column].fillna(df[column].mode()[0])
    elif strategy == "ffill":
        return df[column].fillna(method="ffill")
    elif strategy == "bfill":
        return df[column].fillna(method="bfill")
    elif strategy == "drop":
        return df[column].dropna()
    elif strategy == "model-based":
        from sklearn.impute import KNNImputer
        imputer = KNNImputer(n_neighbors=5)
        return imputer.fit_transform(df)
    else:
        raise ValueError("Invalid strategy. Choose from 'mode', 'ffill', 'bfill', 'drop', or 'model-based'.")




def handle_missing_values_numerical(df, strategy="mean"):
    """Handle missing values in the dataset."""
    if strategy == "mean":
        return df.fillna(df.mean())
    elif strategy == "median":
        return df.fillna(df.median())
    elif strategy == "mode":
        return df.fillna(df.mode()[0])
    elif strategy == "ffill":
        return df.fillna(method="ffill")
    elif strategy == "bfill":
        return df.fillna(method="bfill")
    elif strategy == "drop":
        return df.dropna()
    elif strategy == "model-based":
        from sklearn.impute import KNNImputer
        imputer = KNNImputer(n_neighbors=5)
        return imputer.fit_transform(df)

    else:
        raise ValueError("Invalid strategy. Choose from 'mean', 'median', or 'mode'.")




def remove_outliers(df, column):
    """Remove outliers from a specific column using IQR method."""
    Q1 = df[column].quantile(0.25)
    Q3 = df[column].quantile(0.75)
    IQR = Q3 - Q1
    lower_bound = Q1 - 1.5 * IQR
    upper_bound = Q3 + 1.5 * IQR
    return df[(df[column] >= lower_bound) & (df[column] <= upper_bound)]





#------------------------------------------------
def data_cleaning_basic(df):
    """Perform basic cleaning on the dataset."""
    df = remove_duplicates(df)
    
    for i in df.columns:
        df = remove_outliers(df, i)
        if df[i].dtype == "object":
            df = handle_missing_values_categorical(df, i)
        else:
            df = handle_missing_values_numerical(df, i)
    
    return df


#------------------------------------------------
def main():
    """Main function to perform basic cleaning."""
    file_path = input("Enter the path to the CSV file: ")
    df = load_data(file_path)
    display_basic_info(df)
    check_missing_values(df)
    check_duplicates(df)
    df = data_cleaning_basic(df)
    display_basic_info(df)


if __name__ == "__main__":
    main()

''' 
requirements:


'''