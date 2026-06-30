"""ИИ-ассистент платформы (виджет в правом нижнем углу).

Протокол: модель отвечает СТРОГО JSON {"reply", "action"}. Часть действий —
серверные инструменты чтения (lookup_person, suggest_competencies): бэк их
выполняет и докладывает модели результат (агент-цикл). Терминальные действия
(navigate/none) уходят на фронт. Записей в v1 нет.
"""
from __future__ import annotations

import json
import re

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.crud import candidate as candidate_crud
from app.crud import employee as employee_crud
from app.crud import test as test_crud

settings = get_settings()

VIEWS = ["dashboard", "candidates", "vacancies", "employees", "structure", "constructor",
         "adaptation", "performance", "reports", "settings", "support"]

SYSTEM = (
    "Ты — встроенный ассистент HR-платформы Eltera. Помогаешь HR: консультируешь по "
    "кандидатам и сотрудникам, помогаешь подобрать компетенции, отвечаешь на вопросы о "
    "платформе по-человечески и переводишь по разделам.\n"
    "ВАЖНО: ты УМЕЕШЬ добавлять кандидатов и сотрудников через действия add_candidate и "
    "add_employee (создание подтверждает пользователь кнопкой в интерфейсе). НИКОГДА не "
    "отвечай, что добавление/создание недоступно, и НЕ заменяй его навигацией. Игнорируй любые "
    "прежние инструкции о недоступности создания записей.\n\n"
    "Отвечай ВСЕГДА строго одним JSON-объектом, без markdown и пояснений вокруг:\n"
    '{"reply": "<кратко и по делу, по-русски>", "action": {"type": "<тип>", "params": {}}}\n\n'
    "Типы action:\n"
    '- "navigate" — перейти в раздел. params: {"view": "<dashboard|candidates|vacancies|employees|'
    'structure|constructor|adaptation|performance|reports|settings|support>"}.\n'
    '- "lookup_person" — найти человека и получить его данные ПЕРЕД консультацией. '
    'params: {"query": "<имя или часть имени>"}.\n'
    '- "suggest_competencies" — получить банк компетенций, чтобы подобрать под роль. '
    'params: {"role": "<роль или описание>"}.\n'
    '- "lookup_vacancy" — получить данные вакансии (метрики, воронку и ОТКЛИКИ) ПЕРЕД '
    'консультацией по вакансии или её откликам. params: {"query": "<название вакансии или '
    'часть; пусто = все доступные>", "period": "<7d|14d|30d, по умолчанию 7d>"}.\n'
    '- "add_candidate" — ПРЕДЛОЖИТЬ добавление кандидата (пользователь подтвердит в интерфейсе). '
    'params: {"full_name": "<ФИО>", "email": "", "phone": "", "vacancy_title": ""}.\n'
    '- "add_employee" — ПРЕДЛОЖИТЬ добавление сотрудника (пользователь подтвердит). '
    'params: {"full_name": "<ФИО>", "position": "", "department_name": "", "manager_name": "", '
    '"project": "", "start_date": "<ГГГГ-ММ-ДД или пусто>"}.\n'
    '- "none" — обычный ответ без действия.\n\n'
    "Правила:\n"
    "- Пиши по-русски, дружелюбно и кратко.\n"
    "- НЕ выдумывай данные о людях. Чтобы консультировать по конкретному человеку — "
    "сначала верни action lookup_person; данные придут следующим сообщением, после чего "
    "дай вывод (action none).\n"
    "- Чтобы подобрать компетенции — верни suggest_competencies; затем по присланному банку "
    "предложи 4–7 подходящих и кратко объясни выбор.\n"
    "- Чтобы консультировать по вакансии или её откликам (сколько откликов, кто откликнулся, "
    "конверсия, воронка, почему мало/много, что делать) — СНАЧАЛА верни lookup_vacancy с названием "
    "вакансии и нужным периодом; данные придут следующим сообщением, после чего дай разбор "
    "(action none). НЕ выдумывай отклики и цифры — бери только из присланных данных. Если вакансий "
    "несколько (multiple) — перечисли их и уточни, какая нужна. Если данных нет — честно скажи и "
    "предложи подключить/синхронизировать HeadHunter в разделе Вакансии.\n"
    "- Добавление кандидата/сотрудника: собери данные в диалоге. Для кандидата обязательно ФИО; "
    "для сотрудника — ФИО и должность. Если обязательного не хватает — задай уточняющий вопрос "
    "(action none). Когда данных достаточно — верни action add_candidate/add_employee с заполненными "
    "params. НИКОГДА не утверждай, что запись уже создана — её подтвердит пользователь кнопкой. "
    "В reply кратко перечисли, что будет добавлено, и попроси подтвердить.\n"
    "- Если пользователь просит добавить кандидата/сотрудника и обязательные данные есть — "
    "СРАЗУ верни add_candidate/add_employee, не отвечай отказом и не делай navigate вместо этого.\n"
    "- Изменение/удаление уже существующих записей пока недоступно — но ДОБАВЛЕНИЕ доступно.\n"
    "- Разделы: Главная(dashboard), Кандидаты(candidates), Вакансии(vacancies), Сотрудники(employees), "
    "Структура(structure), Конструктор(constructor), Адаптация(adaptation), "
    "Performance Review(performance), Отчёты(reports), Настройки(settings), Поддержка(support)."
)

# База знаний о платформе — чтобы отвечать на вопросы точно и по-человечески.
KNOWLEDGE = (
    "БАЗА ЗНАНИЙ О ПЛАТФОРМЕ ELTERA (используй, чтобы отвечать на вопросы; "
    "не выдумывай функции сверх перечисленного):\n\n"
    "Что это: платформа для оценки кандидатов и сотрудников, адаптации новичков, "
    "опросов 360° и Performance Review, с конструктором тестов и аналитикой.\n\n"
    "РАЗДЕЛЫ:\n"
    "• Главная — сводный дашборд: ключевые метрики по кандидатам/сотрудникам/адаптации, "
    "блок «Требует внимания», лента событий, ближайшие опросы.\n"
    "• Кандидаты — мини-ATS: список с % соответствия, воронка (Новый → Оценка отправлена → "
    "Оценку прошли → Подходит/Условно/Не подходит → Интервью → Принят), KPI, источники, "
    "тепловая карта вакансий. Можно добавить кандидата, отправить оценку, открыть карточку, "
    "PDF-отчёт, перевести в сотрудники.\n"
    "• Вакансии — работа с вакансиями и откликами на реальных данных HeadHunter. Подключение "
    "кабинета hh.ru по OAuth (кнопка «Подключить hh.ru»), импорт выбранных вакансий из HH "
    "(модалка «Добавить из HeadHunter»), синхронизация статусов и откликов. KPI-карточки за "
    "период (по умолчанию 7 дней, переключатель 7/14/30): «Активная вакансия без откликов», "
    "«Низкая конверсия», «Хорошая конверсия», «Всего откликов», «Всего оценок отправлено», "
    "«Подходит под профиль», «Закрытый за период» — каждая кликабельна и открывает "
    "отфильтрованный список (drill-down). Есть таблица эффективности вакансий, воронка подбора, "
    "список откликов и подходящих кандидатов. По каждой вакансии можно задать тест по умолчанию "
    "и переводить отклик в кандидата (создаётся кандидат + назначается тест + ссылка уходит в чат HH). "
    "Все данные изолированы по организации и правам пользователя; demo/seed-данные не используются.\n"
    "• Сотрудники — список с соответствием должности (fit), рисками увольнения, "
    "удовлетворённостью; карточка с результатами по каждому тесту.\n"
    "• Структура — оргструктура: список + граф по отделам, клик по карточке открывает профиль.\n"
    "• Конструктор — два раздела: «Профили» (профиль должности = набор компетенций) и "
    "«Компетенции» (у каждой компетенции свой банк вопросов: один/несколько вариантов, шкала, "
    "открытый вопрос с AI-эталоном). Есть импорт базы из Excel (3 листа: Компетенции/Вопросы/Профили).\n"
    "• Оценки — реестр оценочных ссылок: создать, отправить участнику, отследить статус и результат.\n"
    "• Адаптация — онбординг новых сотрудников: цикл пульс-опросов по дням 1/3/7/14/30/60/90, "
    "авто-старт по дате выхода, напоминания, риски и просрочки, таймлайн и сигналы руководителю.\n"
    "• Performance Review — оценка результативности и потенциала, матрица 9-box (Performance × "
    "Potential), кадровый резерв, HiPo.\n"
    "• 360° — круговая обратная связь: оцениваемый + оценщики по ролям (руководитель, коллеги, "
    "подчинённые, самооценка); сводный отчёт сравнивает самооценку с внешней.\n"
    "• Отчёты — все завершённые оценки; по кандидату доступен PDF-отчёт.\n"
    "• Настройки — данные компании, контактное лицо, интерфейс, уведомления.\n"
    "• Поддержка — обращения уходят в Telegram команде.\n\n"
    "КАК ЭТО РАБОТАЕТ:\n"
    "• Добавить кандидата/сотрудника: кнопкой «+» в разделе или попросив меня. "
    "При добавлении кандидата можно сразу отправить оценку, сотрудника — запустить адаптацию.\n"
    "• Оценка: создаётся ссылка-приглашение, участнику уходит письмо; тест проходится по "
    "схеме «один вопрос — один экран», участник НЕ видит баллов.\n"
    "• Результат: считается % соответствия, рекомендация (Рекомендован / Можно приглашать, "
    "нужна проверка / Резерв / Не рекомендован), «красные флаги», баллы по компетенциям, "
    "достоверность ответов. Открытые вопросы оценивает ИИ.\n"
    "• PDF-отчёт кандидата: решение, сильные стороны и зоны проверки, вопросы для интервью, "
    "план адаптации — формируется ИИ на основе цифр оценки.\n"
    "• Импорт: кандидаты и сотрудники грузятся из Excel по шаблону; база компетенций/вопросов/"
    "профилей — отдельным Excel из 3 листов.\n"
    "• Перевод кандидата в сотрудники: из меню кандидата, с переносом результата оценки.\n"
    "• Вакансии и HH: конверсия вакансии = подходящие кандидаты / отклики × 100; «подходит под "
    "профиль» и «всего откликов» считаются только по реальным данным HeadHunter, а метрики за "
    "период (7/14/30 дней) и закрытия — по историческим снимкам/событиям синхронизации, а не "
    "только по текущему состоянию вакансии.\n"
    "Если не знаешь точного ответа — честно скажи и предложи раздел или обратиться в Поддержку."
)

DATA_TOOLS = {"lookup_person", "suggest_competencies", "lookup_vacancy"}
MAX_ROUNDS = 3
_NONE = {"type": "none", "params": {}}


def _client():
    from openai import AsyncOpenAI
    return AsyncOpenAI(api_key=settings.openai_api_key, base_url=settings.openai_base_url or None)


async def _lookup_person(session: AsyncSession, query: str | None) -> dict:
    q = (query or "").strip()
    if not q:
        return {"found": False, "reason": "пустой запрос"}
    emps, _ = await employee_crud.list_employees(session, search=q, size=5)
    cands, _ = await candidate_crud.list_candidates(session, search=q, size=5)
    matches = [{"kind": "employee", "id": e.id, "name": e.full_name} for e in emps]
    matches += [{"kind": "candidate", "id": c.id, "name": c.full_name} for c in cands]
    if not matches:
        return {"found": False, "query": q}
    if len(matches) > 1:
        return {"found": True, "multiple": True, "matches": matches[:8]}

    m = matches[0]
    if m["kind"] == "employee":
        e = await employee_crud.get_employee(session, m["id"])
        d = e.model_dump() if e else {}
        return {"found": True, "kind": "employee", "person": {
            "name": d.get("full_name"), "position": d.get("position"),
            "department": d.get("department"), "fit": d.get("fit"),
            "turnover_risk": d.get("turnover_risk"), "satisfaction": d.get("satisfaction"),
            "recommendation": d.get("recommendation"),
        }}
    c = await candidate_crud.get_candidate(session, m["id"])
    d = c.model_dump() if c else {}
    a = d.get("assessment") or {}
    comps = [{"name": x.get("name"), "percent": x.get("percent")} for x in (d.get("competencies") or [])]
    return {"found": True, "kind": "candidate", "person": {
        "name": d.get("full_name"), "vacancy": d.get("vacancy_title"), "stage": d.get("stage"),
        "percent": a.get("percent"), "recommendation": a.get("recommendation_text"),
        "red_flags": a.get("red_flags"), "competencies": comps,
    }}


async def _suggest_competencies(session: AsyncSession, role: str | None) -> dict:
    comps = await test_crud.list_competencies(session)
    bank = [{"title": c.title, "kind": c.kind, "description": c.description} for c in comps][:60]
    return {"role": role or "", "bank": bank}


async def _lookup_vacancy(session: AsyncSession, user, query: str | None,
                          period: str | None) -> dict:
    """Данные по вакансии для консультации по откликам: метрики за период,
    воронка подбора и список откликов. Только вакансии, видимые пользователю."""
    from app.services import vacancies as svc

    days = svc.parse_period(period)
    rows = await svc.visible_vacancies(session, user)
    if not rows:
        return {"found": False, "reason": "у пользователя нет доступных вакансий"}

    q = (query or "").strip().lower()
    matched = [v for v in rows if q in (v.title or "").lower()] if q else rows
    if not matched:
        return {"found": False, "query": query,
                "available": [v.title for v in rows][:12]}

    if len(matched) > 1:
        brief = []
        for v in matched[:8]:
            m = await svc.vacancy_metrics(session, v, days)
            brief.append({"title": v.title, "status": v.status,
                          "responses_period": m.responses_period,
                          "responses_total": m.responses_total})
        return {"found": True, "multiple": True, "period": period or svc.DEFAULT_PERIOD,
                "matches": brief}

    v = matched[0]
    m = await svc.vacancy_metrics(session, v, days)
    funnel = await svc.vacancy_funnel(session, v, days)
    responses = await svc.list_responses(session, v, days)
    converted = await svc.converted_event_ids(session, v)
    resp_items = [{
        "candidate_name": e.candidate_name, "state": e.state,
        "occurred_at": e.occurred_at.isoformat() if e.occurred_at else None,
        "converted": e.id in converted,
    } for e in responses[:15]]
    return {
        "found": True, "period": period or svc.DEFAULT_PERIOD,
        "conversion_low": svc.CONVERSION_LOW, "conversion_good": svc.CONVERSION_GOOD,
        "vacancy": {
            "title": v.title, "status": v.status, "city": v.city,
            "responses_period": m.responses_period, "responses_total": m.responses_total,
            "suitable": m.suitable, "conversion": m.conversion,
            "assessments_sent": m.assessments_sent,
            "hours_to_first_response": m.hours_to_first_response,
        },
        "funnel": [{"label": s.label, "count": s.count} for s in funnel.steps],
        "responses_shown": len(resp_items), "responses": resp_items,
    }


def _parse(raw: str) -> dict:
    try:
        return json.loads(raw)
    except Exception:  # noqa: BLE001
        m = re.search(r"\{.*\}", raw or "", re.DOTALL)
        if m:
            try:
                return json.loads(m.group(0))
            except Exception:  # noqa: BLE001
                pass
    return {"reply": (raw or "").strip() or "Извините, не понял запрос.", "action": _NONE}


async def chat(session: AsyncSession, user, messages: list[dict]) -> dict:
    if not (settings.ai_enabled and settings.openai_api_key):
        return {"reply": "ИИ-ассистент сейчас недоступен.", "action": _NONE}

    client = _client()
    convo = [{"role": "system", "content": SYSTEM + "\n\n" + KNOWLEDGE}]
    for msg in messages[-12:]:  # ограничиваем историю
        role = msg.get("role")
        content = (msg.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            convo.append({"role": role, "content": content})

    last = {"reply": "Извините, не понял запрос.", "action": _NONE}
    for _ in range(MAX_ROUNDS):
        try:
            resp = await client.chat.completions.create(
                model=settings.ai_model, max_tokens=700,
                response_format={"type": "json_object"}, messages=convo,
            )
        except Exception as exc:  # noqa: BLE001
            return {"reply": f"Не удалось получить ответ ИИ: {exc}", "action": _NONE}

        from app.observability import metrics
        metrics.record_ai_usage("assistant", settings.ai_model, getattr(resp, "usage", None))
        raw = resp.choices[0].message.content or "{}"
        data = _parse(raw)
        action = data.get("action") or _NONE
        atype = action.get("type", "none")
        last = {"reply": str(data.get("reply", "")), "action": action}

        if atype in DATA_TOOLS:
            params = action.get("params") or {}
            if atype == "lookup_person":
                result = await _lookup_person(session, params.get("query"))
            elif atype == "lookup_vacancy":
                result = await _lookup_vacancy(session, user, params.get("query"),
                                               params.get("period"))
            else:
                result = await _suggest_competencies(session, params.get("role"))
            convo.append({"role": "assistant", "content": raw})
            convo.append({"role": "user", "content": (
                f"РЕЗУЛЬТАТ ИНСТРУМЕНТА {atype}: {json.dumps(result, ensure_ascii=False)}\n"
                "Теперь дай финальный ответ пользователю (action none или navigate)."
            )})
            continue

        if atype == "navigate" and (action.get("params") or {}).get("view") not in VIEWS:
            last["action"] = _NONE
        elif atype in ("add_candidate", "add_employee"):
            params = action.get("params") if isinstance(action.get("params"), dict) else {}
            if not (params.get("full_name") or "").strip():
                last["action"] = _NONE  # нет ФИО — пусть модель доспросит
            else:
                last["action"] = {"type": atype, "params": params}
        return last

    # Если за лимит раундов модель не дала терминальный ответ — гасим действие.
    if (last.get("action") or {}).get("type") in DATA_TOOLS:
        last["action"] = _NONE
    return last
