
import json
import os

from google import genai
from google.genai import types

MODEL = os.getenv("GEMMA_MODEL", "gemma-4-26b-a4b-it")

_client = None


def get_client():
    global _client

    key = os.getenv("GEMINI_API_KEY")

    if not key:
        raise RuntimeError("GEMINI_API_KEY is not configured.")

    if _client is None:
        _client = genai.Client(api_key=key)

    return _client


def gemma_json(prompt, image_parts=None):
    contents = [prompt]

    if image_parts:
        contents.extend(image_parts)

    response = get_client().models.generate_content(
        model=MODEL,
        contents=contents,
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    raw = response.text

    if not raw or not raw.strip():
        finish_reason = "Unknown"

        if response.candidates:
            finish_reason = str(
                response.candidates[0].finish_reason
            )

        raise RuntimeError(
            f"Gemma returned an empty response. "
            f"Finish reason: {finish_reason}"
        )

    try:
        result = json.loads(raw)

    except json.JSONDecodeError:
        start = raw.find("{")
        end = raw.rfind("}")

        if start >= 0 and end > start:
            try:
                result = json.loads(raw[start:end + 1])
            except json.JSONDecodeError as exc:
                raise RuntimeError(
                    "Gemma returned malformed JSON."
                ) from exc
        else:
            raise RuntimeError(
                f"Gemma returned invalid JSON: {raw[:300]}"
            )

    # Handle a single-object JSON list.
    if isinstance(result, list):
        if len(result) == 1 and isinstance(result[0], dict):
            result = result[0]
        else:
            raise RuntimeError(
                f"Gemma returned an unexpected JSON list. "
                f"Items: {len(result)}. "
                f"Response preview: {str(result)[:500]}"
            )

    # Validate response structure.
    if not isinstance(result, dict):
        raise RuntimeError(
            f"Gemma response must be a JSON object. "
            f"Received type: {type(result).__name__}. "
            f"Response preview: {str(result)[:500]}"
        )

    if not result:
        raise RuntimeError(
            "Gemma returned an empty JSON object."
        )

    return result
