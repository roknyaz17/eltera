"""Логика рекомендаций по результату оценки.

Повторяет правила из фронтенда (web-app/src/domain/scoring.js):
percent >= 82 -> recommended, >= 68 -> conditional, >= 52 -> reserve,
иначе not_recommended; при red_flags >= 2 уровень понижается на один.
"""
from app.models.enums import QuestionType, RecommendationLevel

FIT_THRESHOLD = 68
RISK_THRESHOLD = 55

_LEVELS = [
    RecommendationLevel.not_recommended,
    RecommendationLevel.reserve,
    RecommendationLevel.conditional,
    RecommendationLevel.recommended,
]

_LEVEL_TEXT = {
    RecommendationLevel.not_recommended: "Не рекомендован",
    RecommendationLevel.reserve: "Резерв / нужна стажировка",
    RecommendationLevel.conditional: "Можно приглашать, нужна проверка",
    RecommendationLevel.recommended: "Рекомендован",
}


def recommendation_for(percent: int, red_flags: int) -> tuple[RecommendationLevel, str]:
    index = 0
    if percent >= 82:
        index = 3
    elif percent >= 68:
        index = 2
    elif percent >= 52:
        index = 1
    if red_flags >= 2:
        index = max(0, index - 1)
    level = _LEVELS[index]
    return level, _LEVEL_TEXT[level]


def score_closed(question_version, selected_options) -> tuple[int, bool]:
    """Балл за закрытый вопрос (single/multiple) и флаг red flag.

    selected_options — выбранные кандидатом AnswerOption.
    Для multiple_choice баллы суммируются и ограничиваются максимумом вопроса.
    """
    awarded = sum(opt.score for opt in selected_options)
    awarded = max(0, min(awarded, question_version.max_score))
    red_flag = any(opt.is_red_flag for opt in selected_options)
    return awarded, red_flag


def score_scale(question_version, scale_value: int | None) -> int:
    """Балл за шкальный вопрос: значение шкалы, ограниченное границами."""
    if scale_value is None:
        return 0
    lo = question_version.scale_min or 0
    hi = question_version.scale_max or question_version.max_score
    value = max(lo, min(scale_value, hi))
    # Балл = значение шкалы (max_score == scale_max).
    return max(0, min(value, question_version.max_score))


def is_open(question_version) -> bool:
    return question_version.type == QuestionType.open.value
