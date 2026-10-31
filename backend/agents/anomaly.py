import numpy as np
import pandas as pd

def investigate_anomalies(tables):
    findings = []
    for table_name, df in tables.items():
        numeric_cols = list(df.select_dtypes(include="number").columns)
        for col in numeric_cols[:12]:
            series = pd.to_numeric(df[col], errors="coerce").dropna()
            if len(series) < 8 or series.nunique() < 4:
                continue
            q1, q3 = series.quantile([0.25, 0.75])
            iqr = q3 - q1
            if not np.isfinite(iqr) or iqr == 0:
                continue
            low, high = q1 - 1.5 * iqr, q3 + 1.5 * iqr
            mask = (series < low) | (series > high)
            count = int(mask.sum())
            if count:
                vals = series[mask]
                findings.append({
                    "type": "IQR outliers",
                    "table": table_name,
                    "column": str(col),
                    "outlier_count": count,
                    "outlier_share_percent": round(count / len(series) * 100, 2),
                    "lower_bound": round(float(low), 4),
                    "upper_bound": round(float(high), 4),
                    "example_values": [round(float(v), 4) for v in vals.head(5)],
                    "method": "1.5 × IQR rule",
                    "interpretation": "Statistical flag only; investigate context before calling it an error.",
                })
        # Detect large step changes in a likely date column and numeric measures.
        date_cols = []
        for col in df.columns:
            if pd.api.types.is_datetime64_any_dtype(df[col]):
                date_cols.append(col)
            elif df[col].dtype == "object" and len(df) > 0:
                parsed = pd.to_datetime(df[col], errors="coerce")
                if parsed.notna().mean() > 0.8:
                    date_cols.append(col)
        if date_cols and numeric_cols:
            date_col = date_cols[0]
            work = df[[date_col] + numeric_cols[:5]].copy()
            work[date_col] = pd.to_datetime(work[date_col], errors="coerce")
            work = work.dropna(subset=[date_col]).set_index(date_col).sort_index()
            for col in numeric_cols[:5]:
                monthly = work[col].resample("MS").sum(min_count=1).dropna()
                if len(monthly) >= 3:
                    pct = monthly.pct_change().replace([np.inf, -np.inf], np.nan).dropna()
                    if not pct.empty:
                        idx = pct.abs().idxmax()
                        change = float(pct.loc[idx] * 100)
                        if abs(change) >= 30:
                            findings.append({
                                "type": "Large period-over-period change",
                                "table": table_name,
                                "column": str(col),
                                "period": str(idx.date()),
                                "change_percent": round(change, 2),
                                "method": "Monthly sum percentage change",
                                "interpretation": "Large change flagged for investigation; seasonality and data completeness may explain it.",
                            })
    return findings[:40]
