from io import BytesIO
from PIL import Image
from google.genai import types
from .llm import gemma_json

def analyze_screenshots(images):
    if not images:
        return {"status": "skipped", "findings": []}
    parts = []
    for name, raw in images[:3]:
        try:
            img = Image.open(BytesIO(raw)).convert("RGB")
            img.thumbnail((1400, 1400))
            buf = BytesIO()
            img.save(buf, format="JPEG", quality=82)
            parts.append(types.Part.from_bytes(data=buf.getvalue(), mime_type="image/jpeg"))
        except Exception:
            continue
    if not parts:
        return {"status": "skipped", "findings": [], "reason": "No readable screenshots."}
    prompt = """
You are the Visual Analyst agent in DataSherlock. Inspect the supplied dashboard screenshot(s).
Return JSON only:
{
 "status":"analyzed",
 "findings":[
  {"observation":"what is visibly shown","metric_or_chart":"label if readable",
   "direction":"increase|decrease|stable|unclear","approximate_value":"only if legible",
   "period":"only if legible","confidence":"low|medium|high",
   "caveat":"what cannot be inferred from screenshot alone"}
 ],
 "dashboard_summary":"brief description",
 "questions_to_verify":["specific checks against uploaded tabular data"]
}
Do not invent exact values from unclear charts. Treat visual observations as hypotheses until checked against source data.
"""
    return gemma_json(prompt, parts)
