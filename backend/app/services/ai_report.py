"""Генерация нарратива отчёта по кандидату нейросетью (Anthropic).

Возвращает dict с текстовыми блоками отчёта или None — тогда они останутся
как «Доделать». Вызывается, только если задан OPENAI_API_KEY.
"""
import json
import re

from app.core.config import get_settings

settings = get_settings()

_SYSTEM = (
    "Ты — ассистент команды найма. По данным оценки кандидата составь отчёт для HR "
    "и нанимающего руководителя. Пиши по-русски, кратко и по делу, без воды. "
    "Верни СТРОГО JSON-объект со следующими ключами:\n"
    "subtitle (строка, 1–2 предложения с резюме и решением),\n"
    "decision_text (строка — итоговое решение и обоснование),\n"
    "hr_points (массив строк — что важно для HR),\n"
    "manager_points (массив строк — что важно для руководителя),\n"
    "fit_areas (массив строк — где кандидат подходит),\n"
    "fit_note (строка — оптимальный старт),\n"
    "strengths (массив строк — сильные стороны),\n"
    "zones (массив строк — зоны проверки),\n"
    "motivation (строка — мотивация и управление),\n"
    "interview_questions (массив объектов с ключами check, question, good, red),\n"
    "practical_task (массив строк — практическое задание),\n"
    "adaptation_plan (массив строк — план адаптации на 14 дней).\n"
    "Только JSON, без пояснений и markdown."
)


async def generate_report_narrative(candidate) -> dict | None:
    if not settings.ai_enabled or not settings.openai_api_key:
        return None
    try:
        from openai import AsyncOpenAI

        a = candidate.assessment
        comps = ", ".join(f"{c.name} — {c.percent}%" for c in candidate.competencies) or "—"
        user = (
            f"Кандидат: {candidate.full_name}\n"
            f"Вакансия: {candidate.vacancy_title or '—'}\n"
            f"Соответствие профилю: {a.percent if a else 0}%\n"
            f"Рекомендация: {a.recommendation_text if a else '—'}\n"
            f"Красные флаги: {a.red_flags if a else 0}\n"
            f"Компетенции: {comps}"
        )
        client = AsyncOpenAI(
            api_key=settings.openai_api_key,
            base_url=settings.openai_base_url or None,
        )
        resp = await client.chat.completions.create(
            model=settings.ai_model,
            max_tokens=1800,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": _SYSTEM},
                {"role": "user", "content": user},
            ],
        )
        raw = resp.choices[0].message.content or "{}"
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        return json.loads(match.group(0) if match else raw)
    except Exception as exc:  # noqa: BLE001 — деградируем к «Доделать»
        print("Не удалось сгенерировать нарратив отчёта:", exc)
        return None
