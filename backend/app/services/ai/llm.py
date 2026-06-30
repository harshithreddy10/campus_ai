import json
import re
from typing import Any

import httpx

from app.core.config import settings


def clean_reasoning_output(raw_text: str) -> str:
    """Strip DeepSeek <think> reasoning blocks from the model output."""
    cleaned = re.sub(r"<think>.*?</think>", "", raw_text, flags=re.DOTALL)
    cleaned = re.sub(r"^```json", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"^```", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"```$", "", cleaned, flags=re.IGNORECASE)
    return cleaned.strip()


def _fallback_summary(text: str) -> str:
    """Generate a basic summary from text when Ollama is unavailable."""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    meaningful = [line for line in lines if len(line) > 30]
    if meaningful:
        preview = " ".join(meaningful[:3])
        return preview[:300] + ("..." if len(preview) > 300 else "")
    joined = " ".join(lines)
    return joined[:300] + ("..." if len(joined) > 300 else "")


async def query_local_llm(prompt: str, system_prompt: str | None = None) -> str:
    """Send prompt to local Ollama instance."""
    url = f"{settings.OLLAMA_BASE_URL}/api/chat"

    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    models_to_try = [settings.OLLAMA_MODEL, "llama3:latest"]

    for model in models_to_try:
        payload = {
            "model": model,
            "messages": messages,
            "stream": False,
            "options": {"temperature": 0.1},
        }
        try:
            async with httpx.AsyncClient(timeout=120.0) as client:
                response = await client.post(url, json=payload)
                if response.status_code == 200:
                    result_json = response.json()
                    raw_content = result_json.get("message", {}).get("content", "")
                    return clean_reasoning_output(raw_content)
                elif response.status_code == 404:
                    print(f"Ollama model '{model}' not found, trying next...")
                    continue
                else:
                    print(f"Ollama returned error code {response.status_code}: {response.text}")
                    continue
        except Exception as e:
            print(f"Error communicating with local Ollama service: {e}")
            continue

    return ""


def extract_metadata_via_regex(text: str) -> dict[str, Any]:
    metadata = {}
    dept_match = re.search(r"Department:\s*([A-Za-z0-9_ \-\(\)]+)", text, re.IGNORECASE)
    if dept_match:
        metadata["department"] = dept_match.group(1).strip()
    subj_match = re.search(r"Subject:\s*([A-Za-z0-9_ \-\(\)]+)", text, re.IGNORECASE)
    if subj_match:
        metadata["subject"] = subj_match.group(1).strip()
    sem_match = re.search(r"Semester:\s*([0-9]+)", text, re.IGNORECASE)
    if sem_match:
        metadata["semester"] = sem_match.group(1).strip()
    unit_match = re.search(r"Unit:\s*([0-9A-Za-z ]+)", text, re.IGNORECASE)
    if unit_match:
        metadata["unit"] = unit_match.group(1).strip()
    return metadata


async def extract_metadata_from_text(text: str) -> dict[str, Any]:
    """Analyze document text and extract structured academic details in JSON format."""
    system_prompt = (
        "You are an academic knowledge ingestion engine. You must analyze the text from a study material "
        "and return a valid JSON object matching the schema below. Do not output reasoning steps. Do not include markdown wraps.\n"
        "Schema:\n"
        "{\n"
        '  "subject": "String representing the subject name",\n'
        '  "semester": "String representing academic semester (e.g. 1, 2, 3, etc.)",\n'
        '  "department": "String representing department name (e.g. CSE, ECE, Mechanical, etc.)",\n'
        '  "unit": "String representing syllabus unit number (e.g. Unit 1, Unit 2, or null)",\n'
        '  "topics": ["List", "of", "core", "topics", "covered"],\n'
        '  "keywords": ["List", "of", "5", "technical", "keywords"],\n'
        '  "summary": "A concise 2-3 sentence abstract summarizing the document content"\n'
        "}"
    )
    cleaned_lines = []
    for line in text.split("\n"):
        if re.search(r"^\s*[\w\-]+\.(pdf|docx|txt|pptx|html)\b", line, re.IGNORECASE):
            continue
        cleaned_lines.append(line)
    cleaned_text = "\n".join(cleaned_lines).strip()
    truncated_text = cleaned_text[:4000]
    prompt = f"Analyze the following text and extract academic metadata:\n\n{truncated_text}"

    raw_output = await query_local_llm(prompt, system_prompt)

    if raw_output:
        try:
            json_match = re.search(r"\{.*\}", raw_output, re.DOTALL)
            parsed_data = json.loads(json_match.group(0)) if json_match else json.loads(raw_output)

            required_keys = ["title", "subject", "semester", "department", "unit", "topics", "keywords", "summary", "course"]
            for key in required_keys:
                if key not in parsed_data:
                    parsed_data[key] = (
                        "Unknown"
                        if key in ["title", "subject", "semester", "department", "course"]
                        else []
                        if key in ["topics", "keywords"]
                        else None
                    )

            regex_metadata = extract_metadata_via_regex(text)
            for key in ["subject", "semester", "department", "unit"]:
                if regex_metadata.get(key):
                    parsed_data[key] = regex_metadata[key]

            title = parsed_data.get("title")
            if title and title != "Unknown":
                title = re.sub(r"\.(pdf|docx|txt|pptx|html|epub|rtf)$", "", title, flags=re.IGNORECASE).strip()
                title = title.replace("_", " ").replace("-", " ")
                title = title.title()
                parsed_data["title"] = title

            if not parsed_data.get("keywords"):
                if parsed_data.get("topics"):
                    parsed_data["keywords"] = list(parsed_data["topics"])[:5]
                else:
                    parsed_data["keywords"] = ["Academic", "Study Material", "Notes"]

            if not parsed_data.get("topics"):
                if parsed_data.get("keywords"):
                    parsed_data["topics"] = list(parsed_data["keywords"])[:3]
                else:
                    parsed_data["topics"] = ["General study topics"]

            print(f"LLM Response metadata: {json.dumps(parsed_data)}")
            return parsed_data
        except Exception as e:
            print(f"Failed to parse LLM JSON response: {e}. Raw: {raw_output}")

    return {
        "subject": "Unknown",
        "semester": "Unknown",
        "department": "Unknown",
        "unit": None,
        "topics": [],
        "keywords": [],
        "summary": _fallback_summary(truncated_text),
    }
