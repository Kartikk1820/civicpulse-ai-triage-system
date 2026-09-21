import base64
import json
import logging
import os

logger = logging.getLogger(__name__)

VALID_CATEGORIES = [
    "Pothole",
    "Garbage/Waste",
    "Streetlight",
    "Water Leakage",
    "Illegal Construction",
    "Fallen Tree/Vegetation",
    "Damaged Road/Sidewalk",
    "Graffiti/Vandalism",
    "Stray Animal",
    "Other",
]

SYSTEM_PROMPT = (
    "You are a civic issue triage assistant for a municipal complaint system. "
    "Look at the photo of a reported civic issue and respond with STRICT JSON only, no markdown, "
    "matching this schema: "
    '{"category": one of ' + json.dumps(VALID_CATEGORIES) + ", "
    '"severity": one of ["Low", "Medium", "High"], '
    '"summary": a single short sentence describing what you see}. '
    "Base severity on safety risk and scale of the problem visible in the photo."
)


def _fallback_result(reason=""):
    return {
        "category": "Other",
        "severity": "Medium",
        "summary": f"AI classification unavailable ({reason}). Please categorize manually." if reason else "",
        "ai_processed": False,
    }


def classify_issue_image(image_path, description=""):
    """Sends an issue photo to the Groq vision model and returns a structured triage result.

    Degrades gracefully (never raises) so the app is fully usable before a real
    GROQ_API_KEY is configured, or if the API is briefly unavailable.
    """
    api_key = os.environ.get("GROQ_API_KEY", "")
    if not api_key or api_key == "your_groq_api_key_here":
        return _fallback_result("no API key configured yet")

    try:
        from groq import Groq
    except ImportError:
        return _fallback_result("groq SDK not installed")

    try:
        with open(image_path, "rb") as f:
            image_b64 = base64.b64encode(f.read()).decode("utf-8")

        client = Groq(api_key=api_key)
        model = os.environ.get("GROQ_MODEL", "llama-4-scout-vision-preview")

        user_text = "Classify this civic issue photo."
        if description:
            user_text += f" Reporter's description: {description}"

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": user_text},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{image_b64}"}},
                    ],
                },
            ],
            temperature=0.2,
            max_tokens=200,
            response_format={"type": "json_object"},
        )

        content = response.choices[0].message.content
        parsed = json.loads(content)

        category = parsed.get("category", "Other")
        if category not in VALID_CATEGORIES:
            category = "Other"
        severity = parsed.get("severity", "Medium")
        if severity not in ("Low", "Medium", "High"):
            severity = "Medium"

        return {
            "category": category,
            "severity": severity,
            "summary": parsed.get("summary", "")[:500],
            "ai_processed": True,
        }
    except Exception as exc:  # noqa: BLE001 - external API call, degrade gracefully
        logger.warning("Groq classification failed: %s", exc)
        return _fallback_result("classification error")
