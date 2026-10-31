
import json
import duckdb
import pandas as pd

from .llm import gemma_json


ALLOWED_OPERATIONS = {"sum", "avg", "count", "min", "max"}
ALLOWED_DATE_GRAINS = {"day", "month", "year"}

ALLOWED_FILTER_OPERATORS = {
    "eq", "neq", "gt", "gte", "lt", "lte", "between", "in"
}


def quote_ident(value):
    return '"' + str(value).replace('"', '""') + '"'


def query_plan_agent(question, profiles):
    """Generate up to five constrained analytical query plans."""

    compact = []

    for p in profiles:
        compact.append({
            "table": p["table"],
            "columns": p["column_names"],
            "numeric_columns": p["numeric_columns"],
            "categorical_or_date_columns":
                p["categorical_or_date_columns"],
        })

    prompt = f"""
You are DataSherlock's Query Analyst.

Create up to FIVE useful independent analytical queries.

Return JSON only:

{{
  "queries": [
    {{
      "table": "exact table name",
      "operation": "sum|avg|count|min|max",
      "metric": "exact numeric column or null",
      "group_by": "exact column or null",
      "date_column": "exact date column or null",
      "date_grain": "day|month|year or null",
      "date_from": "YYYY-MM-DD or null",
      "date_to": "YYYY-MM-DD or null",
      "filters": [
        {{
          "column": "exact column name",
          "operator": "eq|neq|gt|gte|lt|lte|between|in",
          "value": "filter value"
        }}
      ],
      "limit": 20,
      "purpose": "short explanation"
    }}
  ]
}}

IMPORTANT RULES:

1. Use only supplied table and column names.
2. Never invent columns or generate SQL.
3. Use SUM for total revenue or sales.
4. For monthly trends, use date_column and date_grain=month.
5. For regional comparisons, group by region.
6. For category comparisons, group by category.
7. Avoid duplicate queries.
8. Return no more than five queries.

DATE FILTERING RULES:

9. When the user explicitly mentions a date range,
   extract its exact start and end dates.

10. For product and region breakdowns concerning a
    specific period, apply date_from and date_to.

11. Set date_column to the actual date column.

12. Use ISO dates: YYYY-MM-DD.

13. Do NOT apply a date filter to a separate
    historical comparison query if the user needs
    results from outside that date range.

14. If a date range is requested but cannot be
    identified, do not invent dates.

FILTER RULES:

15. Use filters for additional conditions such as
    product, region, category or other dimensions.

16. Only use operators from the allowed list.

17. Do not invent filter values.

18. Each query must independently contain the
    filters necessary for its stated purpose.

Question:
{question}

Available schemas:
{json.dumps(compact, default=str)[:12000]}
"""

    result = gemma_json(prompt)

    queries = result.get("queries", [])

    if not isinstance(queries, list):
        return []

    return queries[:5]


def execute_plan(plan, tables):
    """Validate a query plan and safely construct SQL."""

    if not isinstance(plan, dict):
        return {
            "status": "skipped",
            "reason": "Invalid query plan."
        }

    table = plan.get("table")

    if not isinstance(table, str) or table not in tables:
        return {
            "status": "skipped",
            "reason": "Unknown table."
        }

    df = tables[table]
    cols = [str(c) for c in df.columns]

    operation = plan.get("operation", "count")

    if operation not in ALLOWED_OPERATIONS:
        return {
            "status": "skipped",
            "reason": "Unsupported aggregation."
        }

    metric = plan.get("metric")

    if operation != "count":
        if metric not in cols:
            return {
                "status": "skipped",
                "reason": "Invalid metric column."
            }

        if metric not in df.select_dtypes(include="number").columns:
            return {
                "status": "skipped",
                "reason": "Metric must be numeric."
            }

    group = plan.get("group_by")

    if group not in cols:
        group = None

    date_column = plan.get("date_column")

    if date_column not in cols:
        date_column = None

    date_grain = plan.get("date_grain")

    if date_grain not in ALLOWED_DATE_GRAINS:
        date_grain = None

    if date_grain and date_column:
        group = date_column

    # Build validated WHERE conditions.
    conditions = []
    parameters = []

    date_from = plan.get("date_from")
    date_to = plan.get("date_to")

    if date_from is not None or date_to is not None:

        if not date_column:
            return {
                "status": "skipped",
                "reason": "Date filter requires a valid date column."
            }

        try:
            if date_from:
                date_from = str(pd.Timestamp(date_from).date())

            if date_to:
                date_to = str(pd.Timestamp(date_to).date())

        except Exception:
            return {
                "status": "skipped",
                "reason": "Invalid date filter."
            }

        if date_from and date_to and date_from > date_to:
            return {
                "status": "skipped",
                "reason": "Date range start is after its end."
            }

        date_expression = (
            f"TRY_CAST({quote_ident(date_column)} AS DATE)"
        )

        if date_from and date_to:
            conditions.append(
                f"{date_expression} BETWEEN ? AND ?"
            )
            parameters.extend([date_from, date_to])

        elif date_from:
            conditions.append(f"{date_expression} >= ?")
            parameters.append(date_from)

        else:
            conditions.append(f"{date_expression} <= ?")
            parameters.append(date_to)

    # Validate additional filters.
    filters = plan.get("filters", [])

    if not isinstance(filters, list):
        return {
            "status": "skipped",
            "reason": "Invalid filters format."
        }

    for item in filters[:10]:

        if not isinstance(item, dict):
            continue

        column = item.get("column")
        operator = item.get("operator")
        value = item.get("value")

        if column not in cols:
            return {
                "status": "skipped",
                "reason": f"Unknown filter column: {column}"
            }

        if operator not in ALLOWED_FILTER_OPERATORS:
            return {
                "status": "skipped",
                "reason": "Unsupported filter operator."
            }

        column_sql = quote_ident(column)

        if operator == "eq":
            conditions.append(f"{column_sql} = ?")
            parameters.append(value)

        elif operator == "neq":
            conditions.append(f"{column_sql} != ?")
            parameters.append(value)

        elif operator == "gt":
            conditions.append(f"{column_sql} > ?")
            parameters.append(value)

        elif operator == "gte":
            conditions.append(f"{column_sql} >= ?")
            parameters.append(value)

        elif operator == "lt":
            conditions.append(f"{column_sql} < ?")
            parameters.append(value)

        elif operator == "lte":
            conditions.append(f"{column_sql} <= ?")
            parameters.append(value)

        elif operator == "between":
            if not isinstance(value, list) or len(value) != 2:
                return {
                    "status": "skipped",
                    "reason": "Between filter requires two values."
                }

            conditions.append(f"{column_sql} BETWEEN ? AND ?")
            parameters.extend(value)

        elif operator == "in":
            if not isinstance(value, list) or not value:
                return {
                    "status": "skipped",
                    "reason": "IN filter requires a non-empty list."
                }

            placeholders = ", ".join(["?"] * len(value))
            conditions.append(
                f"{column_sql} IN ({placeholders})"
            )
            parameters.extend(value)

    where_sql = ""

    if conditions:
        where_sql = " WHERE " + " AND ".join(conditions)

    # Validate result limit.
    try:
        limit = max(1, min(int(plan.get("limit", 20)), 20))
    except (TypeError, ValueError):
        limit = 20

    con = duckdb.connect(database=":memory:")

    try:
        con.register("source_df", df)

        con.execute(
            f"CREATE VIEW {quote_ident(table)} AS "
            "SELECT * FROM source_df"
        )

        if operation == "count":
            expression = "COUNT(*)"

        else:
            fn = {
                "sum": "SUM",
                "avg": "AVG",
                "min": "MIN",
                "max": "MAX"
            }[operation]

            expression = f"{fn}({quote_ident(metric)})"

        if group:

            if date_grain and date_column:
                group_expression = (
                    f"DATE_TRUNC('{date_grain}', "
                    f"TRY_CAST({quote_ident(date_column)} AS DATE))"
                )
            else:
                group_expression = quote_ident(group)

            sql = (
                f"SELECT {group_expression} AS group_value, "
                f"{expression} AS result "
                f"FROM {quote_ident(table)}"
                f"{where_sql} "
                f"GROUP BY 1 "
            )

            if date_grain:
                sql += "ORDER BY group_value ASC "
            else:
                sql += "ORDER BY result DESC "

            sql += f"LIMIT {limit}"

        else:
            sql = (
                f"SELECT {expression} AS result "
                f"FROM {quote_ident(table)}"
                f"{where_sql}"
            )

        result_df = con.execute(sql, parameters).fetchdf()

        rows = (
            result_df
            .astype(object)
            .where(pd.notna(result_df), None)
            .to_dict(orient="records")
        )

        return {
            "status": "executed",
            "plan": {
                "table": table,
                "operation": operation,
                "metric": metric,
                "group_by": group,
                "date_column": date_column,
                "date_grain": date_grain,
                "date_from": date_from,
                "date_to": date_to,
                "filters": filters
            },
            "purpose": str(plan.get("purpose", ""))[:200],
            "sql": sql,
            "rows": rows,
            "note": (
                "SQL was constructed by the application using "
                "validated identifiers and parameterized values."
            )
        }

    except Exception as exc:
        return {
            "status": "error",
            "reason": str(exc)
        }

    finally:
        con.close()


def execute_multiple_plans(plans, tables):
    """Execute up to five independently validated plans."""

    results = []

    for index, plan in enumerate(plans[:5], start=1):

        result = execute_plan(plan, tables)
        result["query_number"] = index

        results.append(result)

    return results
