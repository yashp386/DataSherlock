import re
import pandas as pd

def safe_name(name, index):
    value = re.sub(r"[^a-zA-Z0-9_]+", "_", str(name).strip().lower()).strip("_")
    if not value:
        value = f"dataset_{index}"
    if value[0].isdigit():
        value = f"table_{value}"
    return value[:50]

def profile_dataframes(datasets):
    """Deterministic profiler. Returns JSON-safe summaries and normalized table names."""
    tables, summaries = {}, []
    for i, (label, frame) in enumerate(datasets.items(), start=1):
        table = safe_name(label, i)
        suffix = 2
        base = table
        while table in tables:
            table = f"{base}_{suffix}"
            suffix += 1
        # Keep the in-memory dataframe for deterministic analysis.
        tables[table] = frame
        missing = {str(c): int(v) for c, v in frame.isna().sum().items() if int(v) > 0}
        numeric = [str(c) for c in frame.select_dtypes(include="number").columns]
        categorical = [str(c) for c in frame.select_dtypes(exclude="number").columns]
        summaries.append({
            "source": label,
            "table": table,
            "rows": int(len(frame)),
            "columns": int(len(frame.columns)),
            "column_names": [str(c) for c in frame.columns[:60]],
            "numeric_columns": numeric[:30],
            "categorical_or_date_columns": categorical[:30],
            "missing_values": missing,
            "duplicate_rows": int(frame.duplicated().sum()),
            "sample_rows": frame.head(3).replace({float("nan"): None}).to_dict(orient="records"),
        })
    return tables, summaries
