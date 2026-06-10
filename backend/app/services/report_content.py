"""Сборка содержимого отчёта по кандидату.

Данные оценки (ФИО, %, метрики-плитки, компетенции) берутся как есть.
Нарративные блоки генерирует нейросеть (см. ai_report.generate_report_narrative);
если её результата нет — ставится заглушка «Доделать» (ничего не выдумываем).
«Финальное правило» — статичный дисклеймер, одинаковый для всех отчётов.
"""
from __future__ import annotations

TODO = "Доделать"

STATIC_FINAL_RULE = (
    "Отчёт помогает принять решение о найме конкретного человека и не заменяет интервью. "
    "Финальный выбор должен учитывать интервью, опыт, рекомендации, практическое задание "
    "и требования конкретной вакансии."
)


def _reliability(candidate) -> int:
    for c in candidate.competencies:
        low = c.name.lower()
        if "остовер" in low or "честн" in low:
            return c.percent
    a = candidate.assessment
    return max(40, 100 - (a.red_flags if a else 0) * 14)


def build_report_content(candidate, narrative: dict | None = None) -> dict:
    a = candidate.assessment
    percent = a.percent if a else 0
    comps = sorted(candidate.competencies, key=lambda c: c.percent, reverse=True)
    n = narrative or {}

    def txt(key: str) -> str:
        return n.get(key) or TODO

    def items(key: str) -> list:
        v = n.get(key)
        return v if v else [TODO]

    questions = n.get("interview_questions") or [
        {"check": TODO, "question": TODO, "good": TODO, "red": TODO}
    ]

    return {
        # --- данные оценки ---
        "title": f"{candidate.full_name}: отчёт по оценке",
        "percent": percent,
        "competencies": [
            {"name": c.name, "score10": round(c.percent / 10), "percent": c.percent}
            for c in comps
        ],
        # Плитки: «Готовность» и «Следующий этап» убраны.
        "tiles": [
            ("Риск найма", f"{max(0, 100 - percent)}%"),
            ("Достоверность", f"{_reliability(candidate)}%"),
        ],
        # --- нарратив (генерит нейросеть, иначе «Доделать») ---
        "subtitle": txt("subtitle"),
        "decision_title": "Итоговое решение",
        "decision_text": txt("decision_text"),
        "hr_points": items("hr_points"),
        "manager_points": items("manager_points"),
        "fit_areas": items("fit_areas"),
        "fit_note": txt("fit_note"),
        "strengths": items("strengths"),
        "zones": items("zones"),
        "motivation": txt("motivation"),
        "interview_questions": questions,
        "practical_task": items("practical_task"),
        "adaptation_plan": items("adaptation_plan"),
        # --- статичный дисклеймер ---
        "final_rule": STATIC_FINAL_RULE,
    }
