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

    single_choice — балл выбранного варианта (ограничен максимумом).
    multiple_choice — точное совпадение: полный балл только если выбранное
    множество в точности равно набору вариантов с is_correct=true; иначе 0.
    Это исключает стратегию «отметить всё подряд». Если у вопроса не размечены
    правильные варианты (легаси-данные), деградируем к старой сумме баллов,
    чтобы не обнулить такие тесты молча.
    """
    options = list(question_version.options or [])
    selected = list(selected_options)
    red_flag = any(opt.is_red_flag for opt in selected)

    if question_version.type == QuestionType.multiple_choice.value:
        correct_ids = {opt.id for opt in options if opt.is_correct}
        if correct_ids:
            selected_ids = {opt.id for opt in selected}
            awarded = question_version.max_score if selected_ids == correct_ids else 0
            return awarded, red_flag
        # fallback: правильные не размечены — старое поведение (сумма, с обрезкой).

    awarded = sum(opt.score for opt in selected)
    awarded = max(0, min(awarded, question_version.max_score))
    return awarded, red_flag


def score_scale(question_version, scale_value: int | None) -> int:
    """Балл за шкальный вопрос: линейная нормализация значения в [0, max_score].

    Значение шкалы [scale_min..scale_max] линейно отображается в [0..max_score]:
    нижняя граница шкалы даёт 0 баллов, верхняя — max_score. Так «1 из 5» больше
    не приносит «бесплатных» 20%.
    """
    if scale_value is None:
        return 0
    lo = question_version.scale_min if question_version.scale_min is not None else 1
    hi = question_version.scale_max if question_version.scale_max is not None else question_version.max_score
    if hi <= lo:
        # Вырожденная шкала — считаем выбор максимумом.
        return question_version.max_score
    value = max(lo, min(scale_value, hi))
    norm = (value - lo) / (hi - lo)  # 0.0..1.0
    return max(0, min(round(norm * question_version.max_score), question_version.max_score))


def aggregate(qvs, awarded_by_qid, item_weights, comp_weights):
    """Сводит баллы по вопросам в итог с двухуровневым взвешиванием.

    Внутри компетенции вопросы взвешиваются по item_weights (TestVersionItem.weight);
    между компетенциями проценты взвешиваются по comp_weights
    (TestVersionCompetency.weight). Итоговый percent = взвешенное среднее процентов
    компетенций. Отсутствующий вес → 1.0.

    Параметры:
      qvs              — список QuestionVersion (с загруженным .question).
      awarded_by_qid   — {question_version_id: awarded_score}.
      item_weights     — {question_version_id: weight}.
      comp_weights     — {competency_id: weight}.

    Возвращает (total_score, total_max, percent, comp_rows), где total_score/max —
    «сырые» (невзвешенные) суммы баллов для отображения, а percent — взвешенный.
    comp_rows — список dict {competency_id, score, max_score, percent}.
    """
    comp_raw_score: dict[str, int] = {}
    comp_raw_max: dict[str, int] = {}
    comp_wscore: dict[str, float] = {}
    comp_wmax: dict[str, float] = {}
    order: list[str] = []

    for qv in qvs:
        cid = qv.question.competency_id
        if cid not in comp_raw_max:
            order.append(cid)
        w = item_weights.get(qv.id, 1.0)
        aw = awarded_by_qid.get(qv.id, 0)
        comp_raw_score[cid] = comp_raw_score.get(cid, 0) + aw
        comp_raw_max[cid] = comp_raw_max.get(cid, 0) + qv.max_score
        comp_wscore[cid] = comp_wscore.get(cid, 0.0) + w * aw
        comp_wmax[cid] = comp_wmax.get(cid, 0.0) + w * qv.max_score

    comp_rows = []
    num = 0.0
    den = 0.0
    for cid in order:
        wmax = comp_wmax[cid]
        frac = (comp_wscore[cid] / wmax) if wmax > 0 else 0.0  # 0.0..1.0
        cw = comp_weights.get(cid, 1.0)
        num += cw * frac
        den += cw
        comp_rows.append({
            "competency_id": cid,
            "score": comp_raw_score[cid],
            "max_score": comp_raw_max[cid],
            "percent": round(frac * 100),
        })

    percent = round(num / den * 100) if den > 0 else 0
    total_score = sum(comp_raw_score.values())
    total_max = sum(comp_raw_max.values())
    return total_score, total_max, percent, comp_rows


def is_open(question_version) -> bool:
    return question_version.type == QuestionType.open.value
