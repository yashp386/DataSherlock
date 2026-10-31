
import json
import os

from .llm import gemma_json
from .profiler import profile_dataframes
from .anomaly import investigate_anomalies
from .visual_analyst import analyze_screenshots
from .query_analyst import (
    query_plan_agent,
    execute_multiple_plans,
)


def run_investigation(datasets, documents, screenshots, question):

    # Agent 1: Data Profiler
    tables, profiles = profile_dataframes(datasets)

    # Agent 2: Visual Analyst
    visual = analyze_screenshots(screenshots)

    # Agent 3: Anomaly Investigator
    anomalies = investigate_anomalies(tables)

    # Agent 4: Multi-query Analyst
    query_results = []

    if tables:
        try:
            plans = query_plan_agent(question, profiles)

            query_results = execute_multiple_plans(
                plans,
                tables
            )

        except Exception as exc:
            query_results = [{
                "status": "error",
                "reason": f"Query analysis failed: {type(exc).__name__}"
            }]

    else:
        query_results = [{
            "status": "skipped",
            "reason": "No CSV or Excel tables were uploaded."
        }]

    successful_queries = [
        q for q in query_results
        if q.get("status") == "executed"
    ]

    # Preserve the first successful query for compatibility
    # with the existing frontend.
    primary_query = (
        successful_queries[0]
        if successful_queries
        else {}
    )

    query_result = {
        "status": (
            "executed" if successful_queries
            else "skipped"
        ),
        "queries": query_results,
        "sql": primary_query.get("sql"),
        "rows": primary_query.get("rows", []),
        "note": "Each query was independently validated and constructed by the application."
    }

    # Shared evidence store
    evidence = {
        "question": question,
        "data_profiles": profiles,
        "anomaly_findings": anomalies,
        "dashboard_visual_findings": visual,
        "query_execution": query_result,
        "document_excerpts": documents[:8],
    }

    # Agent 5: Lead Investigator
    prompt = f"""
You are DataSherlock's Lead Investigator.

Produce a detailed, evidence-backed investigation report.

Use ONLY the supplied evidence.

Do not invent values, causes, correlations or business context.

Use results from ALL successful queries when preparing findings.

Separate observed facts from hypotheses.

If evidence is insufficient, explain why.

Return JSON only:

{{
 "title": "short investigation title",
 "executive_summary": "2-4 sentences",
 "key_findings": [
  {{
   "finding": "statement",
   "evidence": "specific measured value/source",
   "severity": "high|medium|low",
   "confidence": "high|medium|low",
   "type": "observed|hypothesis"
  }}
 ],
 "possible_explanations": [
  "clearly labelled hypotheses"
 ],
 "recommended_next_steps": [
  "specific next analysis or data request"
 ],
 "limitations": [
  "data limitations"
 ],
 "answer_to_question": "direct answer with caveats"
}}

Question:
{question}

Evidence:
{json.dumps(evidence, default=str)[:26000]}
"""

    report = gemma_json(prompt)

    return {
        "report": report,

        "agents": [
            {
                "name": "Data Profiler",
                "status": "completed",
                "detail": f"Profiled {len(profiles)} table(s)."
            },
            {
                "name": "Visual Analyst",
                "status": visual.get("status", "completed"),
                "detail": f"Reviewed {len(screenshots)} screenshot(s)."
            },
            {
                "name": "Anomaly Investigator",
                "status": "completed",
                "detail": f"Flagged {len(anomalies)} statistical pattern(s)."
            },
            {
                "name": "Query Analyst",
                "status": (
                    "completed" if successful_queries else "skipped"
                ),
                "detail": (
                    f"Executed {len(successful_queries)} "
                    f"validated analytical quer(ies)."
                )
            },
            {
                "name": "Lead Investigator",
                "status": "completed",
                "detail": "Synthesized findings from all agents."
            }
        ],

        "profiles": profiles,
        "anomalies": anomalies,
        "visual_analysis": visual,
        "query_result": query_result,
        "evidence": evidence,
        "model": os.getenv(
            "GEMMA_MODEL",
            "gemma-4-26b-a4b-it"
        )
    }
