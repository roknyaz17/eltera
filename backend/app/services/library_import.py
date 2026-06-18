"""Импорт базы компетенций, вопросов и профилей должностей из Excel.

Один файл .xlsx с тремя листами (реляционно связаны по внешним ID):
  • «Компетенции» — ID, название, тип, описание
  • «Вопросы»     — ID компетенции, ID вопроса, текст, тип, вариант, балл, флаги
  • «Профили»     — ID профиля, название, для кого, ID компетенции, вес

Внешние ID (из файла) маппятся на внутренние uuid; повторный импорт идемпотентен
(компетенции/профили апсертятся по key=внешний ID, вопросы — по (компетенция,текст)).
"""
from __future__ import annotations

import io

from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

# ── Маппинг русских значений на enum'ы ──
KIND_MAP = {"общая": "common", "общие": "common", "common": "common",
            "профессиональная": "professional", "проф": "professional", "professional": "professional"}
QTYPE_MAP = {
    "один вариант": "single_choice", "одиночный": "single_choice", "single": "single_choice", "single_choice": "single_choice",
    "несколько вариантов": "multiple_choice", "мультивыбор": "multiple_choice", "multiple": "multiple_choice", "multiple_choice": "multiple_choice",
    "шкала": "scale", "scale": "scale",
    "открытый": "open", "open": "open",
}
TARGET_MAP = {"кандидат": "candidate", "кандидаты": "candidate", "candidate": "candidate",
              "сотрудник": "employee", "сотрудники": "employee", "employee": "employee",
              "группа": "group", "групповая": "group", "group": "group"}
TRUE_SET = {"да", "yes", "true", "1", "+", "✓", "истина"}


def _txt(v):
    if v is None:
        return None
    if isinstance(v, str):
        return v.strip() or None
    if isinstance(v, float) and v.is_integer():
        return str(int(v))
    return str(v).strip() or None


def _int(v, default=0):
    if v is None or v == "":
        return default
    try:
        return int(float(v))
    except (TypeError, ValueError):
        return default


def _bool(v):
    return _txt(v) is not None and str(v).strip().lower() in TRUE_SET


# Заголовки листов (для шаблона и сопоставления при парсинге).
SHEETS = {
    "Компетенции": ["ID компетенции", "Название", "Тип (общая/профессиональная)", "Описание"],
    "Вопросы": ["ID компетенции", "ID вопроса", "Вопрос", "Тип (один вариант/несколько/шкала/открытый)",
                "Вариант ответа", "Балл", "Верный (да/нет)", "Красный флаг (да/нет)",
                "Шкала мин", "Шкала макс", "Эталон ответа (AI)"],
    "Профили": ["ID профиля", "Название профиля", "Категория", "Для кого (кандидат/сотрудник/группа)",
                "Длительность, мин", "ID компетенции", "Вес"],
}


def build_template_bytes() -> bytes:
    wb = Workbook()
    wb.remove(wb.active)
    header_fill = PatternFill("solid", fgColor="0A0F1E")
    header_font = Font(color="FFFFFF", bold=True)

    for name, headers in SHEETS.items():
        ws = wb.create_sheet(name)
        for i, h in enumerate(headers, start=1):
            c = ws.cell(row=1, column=i, value=h)
            c.fill = header_fill
            c.font = header_font
            c.alignment = Alignment(vertical="center", wrap_text=True)
            ws.column_dimensions[get_column_letter(i)].width = 26
        ws.row_dimensions[1].height = 30
        ws.freeze_panes = "A2"

    # Примеры.
    wb["Компетенции"].append(["C1", "Работа с возражениями", "профессиональная", "Умение отрабатывать отказы клиента"])
    wb["Компетенции"].append(["C2", "Ответственность", "общая", "Доведение задач до результата"])

    wb["Вопросы"].append(["C1", "Q1", "Клиент говорит «дорого». Ваши действия?", "один вариант", "Выясню ценность и предложу варианты", 4, "да", "нет", "", "", ""])
    wb["Вопросы"].append(["C1", "Q1", "", "", "Сразу дам максимальную скидку", 0, "нет", "да", "", "", ""])
    wb["Вопросы"].append(["C1", "Q1", "", "", "Отпущу клиента", 0, "нет", "нет", "", "", ""])
    wb["Вопросы"].append(["C2", "Q2", "Насколько вы согласны: «Я довожу задачи до конца»", "шкала", "", "", "", "", 1, 5, ""])
    wb["Вопросы"].append(["C2", "Q3", "Опишите случай, когда вы взяли ответственность на себя", "открытый", "", "", "", "", "", "", "Конкретный пример с результатом и выводами"])

    wb["Профили"].append(["P1", "Менеджер по продажам", "Коммерция", "кандидат", 12, "C1", 1])
    wb["Профили"].append(["P1", "Менеджер по продажам", "Коммерция", "кандидат", 12, "C2", 1])

    guide = wb.create_sheet("Инструкция")
    guide["A1"] = "Как заполнять"
    guide["A1"].font = Font(bold=True, size=13)
    tips = [
        "1. Лист «Компетенции»: по строке на компетенцию. ID — любой ваш уникальный код (C1, C2…).",
        "2. Лист «Вопросы»: по строке на ВАРИАНТ ОТВЕТА. Строки одного вопроса имеют один «ID вопроса».",
        "   Текст вопроса и тип указываются в первой строке вопроса (в остальных можно оставить пустыми).",
        "   Тип «шкала» — заполните «Шкала мин/макс», варианты не нужны.",
        "   Тип «открытый» — заполните «Эталон ответа (AI)», варианты не нужны.",
        "3. Лист «Профили»: по строке на пару профиль×компетенция. ID профиля повторяется для каждой компетенции.",
        "   «ID компетенции» в профилях ссылается на ID из листа «Компетенции».",
        "4. Повторная загрузка того же файла безопасна — записи обновляются, а не дублируются.",
    ]
    for i, t in enumerate(tips, start=3):
        guide.cell(row=i, column=1, value=t)
    guide.column_dimensions["A"].width = 110

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


def _rows(ws, headers):
    """Возвращает список dict'ов строк листа по заголовкам (по позиции колонок)."""
    out = []
    it = ws.iter_rows(values_only=True)
    try:
        next(it)  # пропускаем заголовок
    except StopIteration:
        return out
    for raw in it:
        if raw is None or not any(c is not None and str(c).strip() for c in raw):
            continue
        row = {headers[i]: (raw[i] if i < len(raw) else None) for i in range(len(headers))}
        out.append(row)
    return out


def parse_workbook(content: bytes) -> tuple[dict, list[str]]:
    """Парсит .xlsx → ({competencies, questions, profiles}, errors)."""
    errors: list[str] = []
    try:
        wb = load_workbook(io.BytesIO(content), data_only=True, read_only=True)
    except Exception as exc:  # noqa: BLE001
        return {}, [f"Не удалось открыть файл: {exc}. Нужен .xlsx по шаблону."]

    for required in ("Компетенции", "Вопросы", "Профили"):
        if required not in wb.sheetnames:
            errors.append(f"Нет листа «{required}». Используйте актуальный шаблон.")
    if errors:
        return {}, errors

    H = SHEETS
    comp_rows = _rows(wb["Компетенции"], H["Компетенции"])
    q_rows = _rows(wb["Вопросы"], H["Вопросы"])
    p_rows = _rows(wb["Профили"], H["Профили"])

    # Компетенции.
    competencies = []
    for r in comp_rows:
        cid = _txt(r["ID компетенции"])
        title = _txt(r["Название"])
        if not cid or not title:
            errors.append(f"Компетенция без ID или названия: {r}")
            continue
        competencies.append({
            "ext_id": cid, "title": title,
            "kind": KIND_MAP.get((_txt(r["Тип (общая/профессиональная)"]) or "").lower(), "professional"),
            "description": _txt(r["Описание"]),
        })

    # Вопросы — группируем варианты по ID вопроса.
    questions: dict[str, dict] = {}
    for r in q_rows:
        qid = _txt(r["ID вопроса"])
        cid = _txt(r["ID компетенции"])
        if not qid or not cid:
            errors.append(f"Вопрос без ID вопроса/компетенции: {r}")
            continue
        q = questions.setdefault(qid, {
            "ext_id": qid, "competency_ext_id": cid, "text": None, "type": "single_choice",
            "scale_min": None, "scale_max": None, "ai_reference": None, "options": [],
        })
        if _txt(r["Вопрос"]):
            q["text"] = _txt(r["Вопрос"])
        qt = _txt(r["Тип (один вариант/несколько/шкала/открытый)"])
        if qt:
            q["type"] = QTYPE_MAP.get(qt.lower(), q["type"])
        if r["Шкала мин"] not in (None, ""):
            q["scale_min"] = _int(r["Шкала мин"], 1)
        if r["Шкала макс"] not in (None, ""):
            q["scale_max"] = _int(r["Шкала макс"], 5)
        if _txt(r["Эталон ответа (AI)"]):
            q["ai_reference"] = _txt(r["Эталон ответа (AI)"])
        opt_text = _txt(r["Вариант ответа"])
        if opt_text:
            q["options"].append({
                "text": opt_text, "score": _int(r["Балл"], 0),
                "is_correct": _bool(r["Верный (да/нет)"]), "is_red_flag": _bool(r["Красный флаг (да/нет)"]),
            })

    # Профили — группируем компетенции по ID профиля.
    profiles: dict[str, dict] = {}
    for r in p_rows:
        pid = _txt(r["ID профиля"])
        title = _txt(r["Название профиля"])
        if not pid or not title:
            errors.append(f"Профиль без ID/названия: {r}")
            continue
        p = profiles.setdefault(pid, {
            "ext_id": pid, "title": title, "category": _txt(r["Категория"]),
            "target_type": TARGET_MAP.get((_txt(r["Для кого (кандидат/сотрудник/группа)"]) or "").lower(), "candidate"),
            "duration": _int(r["Длительность, мин"], 0), "competencies": [],
        })
        cid = _txt(r["ID компетенции"])
        if cid:
            p["competencies"].append({"competency_ext_id": cid, "weight": _int(r["Вес"], 1) or 1})

    for q in questions.values():
        if not q["text"]:
            errors.append(f"Вопрос {q['ext_id']} без текста — пропущен.")
    questions = {k: v for k, v in questions.items() if v["text"]}

    return {
        "competencies": competencies,
        "questions": list(questions.values()),
        "profiles": list(profiles.values()),
    }, errors
