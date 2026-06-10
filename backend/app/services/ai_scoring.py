"""AI-оценка открытых ответов.

При наличии OPENAI_API_KEY вызывает модель OpenAI и просит вернуть JSON
{"score": int, "rationale": str}. Без ключа используется детерминированный
fallback (по длине ответа и пересечению с критериями/эталоном), чтобы поток
прохождения работал и тестировался без внешних вызовов.
"""
import json
import re

from app.core.config import get_settings

settings = get_settings()


def _heuristic(answer_text: str, reference: str | None, criteria: str | None, max_score: int) -> tuple[int, str]:
    text = (answer_text or "").strip()
    if not text:
        return 0, "Пустой ответ."

    # Ключевые слова из эталона/критериев.
    source = " ".join(filter(None, [reference, criteria])).lower()
    keywords = {w for w in re.findall(r"[а-яёa-z]{4,}", source)}
    answer_words = set(re.findall(r"[а-яёa-z]{4,}", text.lower()))
    overlap = len(keywords & answer_words)
    coverage = overlap / len(keywords) if keywords else 0.0

    # Базовая оценка за содержательность ответа + покрытие ключевых идей.
    length_factor = min(1.0, len(text) / 160)
    raw = 0.4 * length_factor + 0.6 * coverage
    score = round(raw * max_score)
    score = max(0, min(score, max_score))
    if score == 0 and len(text) >= 20:
        score = 1  # есть осмысленный текст — не ноль
    return score, (
        f"Fallback-оценка (AI-ключ не задан): покрытие ключевых идей "
        f"{overlap}/{len(keywords) or 0}, длина ответа {len(text)} симв."
    )


async def _via_openai(
    question_text: str, answer_text: str, reference: str | None, criteria: str | None, max_score: int
) -> tuple[int, str]:
    from openai import AsyncOpenAI  # ленивый импорт

    client = AsyncOpenAI(
        api_key=settings.openai_api_key,
        base_url=settings.openai_base_url or None,
    )
    system = (
        "Ты — ассистент HR, который оценивает открытый ответ кандидата на вопрос теста. "
        "Верни строго JSON вида {\"score\": <int>, \"rationale\": \"<кратко по-русски>\"}. "
        f"score — целое от 0 до {max_score}."
    )
    user = (
        f"Вопрос: {question_text}\n"
        f"Эталонный ответ: {reference or '—'}\n"
        f"Критерии оценки: {criteria or '—'}\n"
        f"Максимальный балл: {max_score}\n\n"
        f"Ответ кандидата: {answer_text or '—'}"
    )
    resp = await client.chat.completions.create(
        model=settings.ai_model,
        max_tokens=300,
        response_format={"type": "json_object"},
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
    )
    raw = resp.choices[0].message.content or "{}"
    match = re.search(r"\{.*\}", raw, re.DOTALL)
    data = json.loads(match.group(0) if match else raw)
    score = max(0, min(int(data.get("score", 0)), max_score))
    return score, str(data.get("rationale", ""))[:1000]


async def score_open_answer(
    *,
    question_text: str,
    answer_text: str,
    reference: str | None,
    criteria: str | None,
    max_score: int,
) -> tuple[int, str, str]:
    """Возвращает (score, rationale, raw_response)."""
    if settings.ai_enabled and settings.openai_api_key:
        try:
            score, rationale = await _via_openai(
                question_text, answer_text, reference, criteria, max_score
            )
            return score, rationale, rationale
        except Exception as exc:  # noqa: BLE001 — деградируем к fallback
            score, rationale = _heuristic(answer_text, reference, criteria, max_score)
            return score, f"{rationale} (ошибка AI: {exc})", str(exc)
    score, rationale = _heuristic(answer_text, reference, criteria, max_score)
    return score, rationale, ""
