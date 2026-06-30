# -*- coding: utf-8 -*-
"""Генерация PDF «Как улучшить службу поддержки Eltera» — несколько вариантов."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, KeepTogether,
    HRFlowable, ListFlowable, ListItem,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

F = "/c/Windows/Fonts/".replace("/c/", "C:/")
pdfmetrics.registerFont(TTFont("Segoe", F + "segoeui.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-Bold", F + "segoeuib.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-It", F + "segoeuii.ttf"))
pdfmetrics.registerFont(TTFont("Segoe-Light", F + "segoeuil.ttf"))
pdfmetrics.registerFontFamily("Segoe", normal="Segoe", bold="Segoe-Bold", italic="Segoe-It")

# Палитра (близко к деловому HR-tech)
INK     = colors.HexColor("#1A2233")   # основной текст
MUTE    = colors.HexColor("#5B6675")   # вторичный
ACCENT  = colors.HexColor("#3A6EA5")   # синий акцент
ACCENT2 = colors.HexColor("#2E7D6B")   # зелёный
LINE    = colors.HexColor("#DCE2EA")
BG_SOFT = colors.HexColor("#F2F6FB")
BG_CARD = colors.HexColor("#FAFBFD")
WARN    = colors.HexColor("#B4541F")
GOLD    = colors.HexColor("#9A7B1F")

styles = getSampleStyleSheet()

def S(name, **kw):
    base = dict(fontName="Segoe", textColor=INK, fontSize=10, leading=15)
    base.update(kw)
    return ParagraphStyle(name, **base)

st_h1     = S("h1", fontName="Segoe-Bold", fontSize=22, leading=26, textColor=INK)
st_sub    = S("sub", fontSize=11, leading=16, textColor=MUTE)
st_h2     = S("h2", fontName="Segoe-Bold", fontSize=14, leading=18, textColor=ACCENT, spaceBefore=4, spaceAfter=4)
st_body   = S("body", alignment=TA_JUSTIFY)
st_body_l = S("bodyl")
st_small  = S("small", fontSize=8.5, leading=12, textColor=MUTE)
st_card_t = S("cardt", fontName="Segoe-Bold", fontSize=12.5, leading=16, textColor=INK)
st_tag    = S("tag", fontName="Segoe-Bold", fontSize=8, leading=10, textColor=colors.white)
st_label  = S("label", fontName="Segoe-Bold", fontSize=8.5, leading=11, textColor=MUTE)
st_li     = S("li", leading=14.5)
st_th     = S("th", fontName="Segoe-Bold", fontSize=9, leading=12, textColor=colors.white)
st_td     = S("td", fontSize=9, leading=12.5)
st_td_c   = S("tdc", fontSize=9, leading=12.5, alignment=TA_CENTER)
st_quote  = S("quote", fontName="Segoe-It", fontSize=9.5, leading=14, textColor=MUTE)

def bullets(items, style=st_li, color=ACCENT):
    return ListFlowable(
        [ListItem(Paragraph(t, style), leftIndent=8, value="•") for t in items],
        bulletType="bullet", bulletColor=color, bulletFontSize=8,
        leftIndent=12, spaceBefore=1, spaceAfter=1,
    )

def chip(text, bg):
    t = Table([[Paragraph(text, st_tag)]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LEFTPADDING", (0, 0), (-1, -1), 6), ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5), ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ("ROUNDEDCORNERS", [4, 4, 4, 4]),
    ]))
    return t

def section_header(num, title):
    cell = Table([[Paragraph(f"{num}", S("n", fontName="Segoe-Bold", fontSize=13, textColor=colors.white, alignment=TA_CENTER)),
                   Paragraph(title, st_h2)]], colWidths=[9*mm, None])
    cell.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), ACCENT),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 0), ("RIGHTPADDING", (0, 0), (0, 0), 0),
        ("TOPPADDING", (0, 0), (0, 0), 4), ("BOTTOMPADDING", (0, 0), (0, 0), 4),
        ("LEFTPADDING", (1, 0), (1, 0), 8),
        ("ROUNDEDCORNERS", [3, 3, 3, 3]),
    ]))
    return cell

def variant_card(num, title, accent, idea, does, reuse, gap, effort, impact, cost):
    head = Table([[
        Paragraph(f"ВАРИАНТ {num}", S("vn", fontName="Segoe-Bold", fontSize=9, textColor=colors.white)),
        Paragraph(title, S("vt", fontName="Segoe-Bold", fontSize=12.5, textColor=colors.white)),
    ]], colWidths=[26*mm, None])
    head.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))

    metrics = Table([[
        Paragraph("ТРУДОЁМКОСТЬ", st_label), Paragraph("ЭФФЕКТ НА UX", st_label), Paragraph("СТОИМОСТЬ", st_label),
    ], [
        Paragraph(effort, S("m", fontName="Segoe-Bold", fontSize=10, textColor=accent)),
        Paragraph(impact, S("m", fontName="Segoe-Bold", fontSize=10, textColor=accent)),
        Paragraph(cost, S("m", fontName="Segoe-Bold", fontSize=10, textColor=accent)),
    ]], colWidths=[None, None, None])
    metrics.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_SOFT),
        ("LEFTPADDING", (0, 0), (-1, -1), 8), ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LINEAFTER", (0, 0), (0, -1), 0.5, LINE), ("LINEAFTER", (1, 0), (1, -1), 0.5, LINE),
    ]))

    body = [
        Paragraph(idea, S("idea", fontSize=10, leading=15)),
        Spacer(1, 5),
        Paragraph("Что делаем", S("lab", fontName="Segoe-Bold", fontSize=9.5, textColor=INK)),
        bullets(does, color=accent),
        Spacer(1, 4),
        Paragraph("Что переиспользуем (уже есть в проекте)", S("lab2", fontName="Segoe-Bold", fontSize=9.5, textColor=ACCENT2)),
        Paragraph(reuse, S("reuse", fontSize=9, leading=13, textColor=MUTE)),
        Spacer(1, 4),
        Paragraph("Какую боль закрывает", S("lab3", fontName="Segoe-Bold", fontSize=9.5, textColor=WARN)),
        Paragraph(gap, S("gap", fontSize=9, leading=13, textColor=MUTE)),
    ]
    inner = Table([[body]], colWidths=[None])
    inner.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), BG_CARD),
        ("BOX", (0, 0), (-1, -1), 0.7, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10), ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    return KeepTogether([head, metrics, inner, Spacer(1, 10)])

def box(title, lines, accent, bg):
    content = [Paragraph(title, S("bx", fontName="Segoe-Bold", fontSize=11, textColor=accent)), Spacer(1, 4)]
    content.append(bullets(lines, color=accent))
    t = Table([[content]], colWidths=[None])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("LINEBEFORE", (0, 0), (0, -1), 3, accent),
        ("LEFTPADDING", (0, 0), (-1, -1), 12), ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 9), ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    return t

# ---------- Документ ----------
story = []

# Шапка
story.append(Paragraph("Как усилить службу поддержки Eltera", st_h1))
story.append(Spacer(1, 3))
story.append(Paragraph("Анализ под текущую архитектуру проекта и несколько вариантов развития — от «малой кровью» до полноценного help-desk", st_sub))
story.append(Spacer(1, 6))
story.append(HRFlowable(width="100%", thickness=1.2, color=ACCENT, spaceBefore=2, spaceAfter=10))

# 1. Что есть сейчас
story.append(section_header("1", "Что есть сейчас"))
story.append(Spacer(1, 6))
story.append(Paragraph(
    'Раздел «Поддержка» отправляет обращение в Telegram-бота '
    '(<font name="Segoe-It">app/services/support.py</font>). Есть три типа — '
    '<b>срочное / обычное / предложение</b>, у каждого свой шаблон, «приоритет» и «SLA» '
    'в тексте сообщения. К письму подставляются имя и e-mail из профиля. Если бот не настроен — '
    'обращение «принято», но не доставлено.', st_body))
story.append(Spacer(1, 6))
story.append(box("Сильные стороны", [
    "Просто и работает: один POST — и команда видит обращение в Telegram.",
    "Уже различает тип обращения и подставляет отправителя из регистрации.",
    "Не роняет эндпоинт при сбое сети — обращение всё равно «принимается».",
], ACCENT2, colors.HexColor("#F0F7F4")))
story.append(Spacer(1, 8))

# 2. Где слабые места
story.append(section_header("2", "Где слабые места — именно для вашего продукта"))
story.append(Spacer(1, 6))
story.append(box("Узкие места", [
    "<b>Канал односторонний (fire-and-forget).</b> Обращение улетает в Telegram — и пользователь "
    "больше ничего не видит: ни номера тикета, ни статуса, ни ответа. «SLA в течение суток» — "
    "это просто текст, его никто не считает и не эскалирует.",
    "<b>Нет истории.</b> Обращения нигде не сохраняются (в коде прямо: «Записей в v1 нет»). "
    "Нельзя посмотреть свои прошлые вопросы, нельзя измерить нагрузку и качество поддержки.",
    "<b>Приоритет выбирает пользователь.</b> Все срочные — и всё «🚨СРОЧНО». Классификацию "
    "и приоритет логичнее ставить автоматически по содержанию.",
    "<b>Нет контекста.</b> В тикет не попадает организация, тариф, роль, раздел/экран, версия, "
    "последние ошибки — поддержка переспрашивает «а что именно у вас не работает».",
    "<b>Кандидаты без поддержки.</b> Раздел «Поддержка» — только для авторизованного HR. "
    "Кандидат, у которого сломалась ссылка или упал тест на прохождении, оказывается в тупике — "
    "а это лицо продукта перед внешними людьми.",
    "<b>Не готово к мультиарендности.</b> Тикеты не привязаны к организации — при переходе на "
    "несколько компаний поддержку будет не разрулить по тенантам.",
], WARN, colors.HexColor("#FBF3EC")))
story.append(Spacer(1, 8))

# 3. Варианты
story.append(section_header("3", "Варианты развития"))
story.append(Spacer(1, 4))
story.append(Paragraph("Варианты не взаимоисключающие — это ступени. 1 и 2 дают самый большой скачок в качестве при малых усилиях и опираются на то, что у вас уже построено.", st_quote))
story.append(Spacer(1, 8))

story.append(variant_card(
    "1", "Замкнуть петлю: тикеты со статусом и ответом",
    ACCENT,
    "Главная боль — канал односторонний. Делаем обращение настоящим тикетом: с номером, "
    "статусом и ответом, который возвращается пользователю в продукт. Без внешних сервисов.",
    [
        "Таблица <font name='Segoe-It'>support_tickets</font> + события (по образцу уже имеющейся "
        "<font name='Segoe-It'>candidate_stage_events</font>): номер, статус «новый / в работе / решён», автор, организация.",
        "Раздел «Поддержка» → «Мои обращения»: список, статус, переписка по тикету.",
        "Двусторонний Telegram: <b>reply</b> в треде бота → webhook → запись ответа в тикет.",
        "Ответ пользователю — в Центр уведомлений (колокольчик) и письмом на e-mail.",
        "Реальный SLA: дедлайн по типу, просрочка → авто-эскалация (повторный алерт в Telegram).",
    ],
    "Telegram-бот, SMTP-почта (Reg.ru), Центр уведомлений, авторизация/организация, "
    "паттерн событий из адаптации и стадий кандидата — всё это в проекте уже есть.",
    "Односторонний канал, отсутствие истории, «бумажный» SLA, нет связи с организацией.",
    "Низкая–средняя", "Очень высокий", "≈ ₽0",
))

story.append(variant_card(
    "2", "AI-первая линия и база знаний (самообслуживание)",
    ACCENT2,
    "У вас уже есть встроенный ИИ-ассистент с базой знаний о платформе. Превращаем его в первую "
    "линию: большинство вопросов он закрывает сам, в тикет уходит только то, что реально требует человека.",
    [
        "Перед созданием тикета ассистент пытается ответить по своей базе знаний (KNOWLEDGE).",
        "Кнопка «Не помогло / позвать человека» → тикет с приложенной историей диалога.",
        "Раздел «База знаний / FAQ» из уже написанного контента ассистента — со ссылками на разделы.",
        "Подсказки по контексту: на экране ошибки — релевантная статья, а не пустая форма.",
        "Метка «отвечено ИИ / эскалировано» — чтобы видеть, сколько обращений снято автоматически.",
    ],
    "ИИ-ассистент (<font name='Segoe-It'>app/services/assistant.py</font>) с готовой базой знаний и "
    "агент-циклом, дешёвая модель DeepSeek (~копейки за обращение).",
    "Поток одинаковых вопросов в поддержку, долгое ожидание ответа на типовое, отсутствие FAQ.",
    "Низкая", "Высокий", "Копейки за обращение",
))

story.append(variant_card(
    "3", "Умные тикеты: контекст, авто-приоритет, метрики",
    GOLD,
    "Поддержка тратит время на «а что у вас за экран и что не работает». Прикрепляем контекст "
    "автоматически и снимаем выбор приоритета с пользователя — его ставит модель по сути обращения.",
    [
        "Авто-контекст в тикете: организация, тариф (биллинг Moneta), роль, текущий раздел/URL, версия, "
        "последние ошибки фронта/бэка.",
        "Авто-классификация и приоритет через AI (баг / вопрос / идея + срочность) — вместо ручного выбора.",
        "Дашборд поддержки: время первого ответа, время решения, доля решённых, поток по типам.",
        "Привязка к организации — основа для поддержки в мультиарендности и разбивки по тарифам.",
    ],
    "ИИ-ассистент для классификации, биллинг/тарифы (Moneta), модель организации и ролей, "
    "наблюдаемость (метрики AI-использования уже собираются).",
    "Долгий разбор из-за нехватки контекста, ручной и неточный приоритет, нет управляемости по метрикам.",
    "Средняя", "Высокий", "Копейки за обращение",
))

story.append(variant_card(
    "4", "Поддержка для кандидатов и омниканальность",
    colors.HexColor("#7A4FB0"),
    "Кандидат — внешнее лицо продукта, но у него нет канала помощи во время прохождения теста. "
    "Закрываем этот разрыв и сводим все каналы в один поток тикетов.",
    [
        "Лёгкая кнопка «Что-то не работает?» на экране прохождения оценки (без авторизации) — "
        "с авто-привязкой к ссылке/сессии теста.",
        "Входящая почта на support@ → автоматически создаёт/дополняет тикет (e-mail как канал).",
        "Единый поток: in-app, e-mail, Telegram — один тикет, один тред.",
        "Опционально — внешний виджет (Crisp / Usedesk / Chatwoot) вместо собственного UI, если нужен онлайн-чат.",
        "CSAT/NPS после закрытия тикета — короткая оценка качества поддержки.",
    ],
    "Поток прохождения оценки и оценочные ссылки, SMTP, накопленная модель тикетов из Варианта 1.",
    "Кандидат в тупике при сбое теста, разрозненные каналы, нет замера удовлетворённости поддержкой.",
    "Средняя–высокая", "Средний–высокий", "₽0 (или подписка на виджет)",
))

# 4. Сравнение
story.append(section_header("4", "Сравнение вариантов"))
story.append(Spacer(1, 6))

header = [Paragraph(h, st_th) for h in ["Вариант", "Трудоёмкость", "Эффект", "Стоимость", "Когда брать"]]
rows = [
    ["1. Замкнуть петлю", "Низкая–средняя", "Очень высокий", "≈ ₽0", "Сразу — это фундамент"],
    ["2. AI-первая линия + FAQ", "Низкая", "Высокий", "Копейки", "Сразу, параллельно с №1"],
    ["3. Умные тикеты + метрики", "Средняя", "Высокий", "Копейки", "Когда поток вырастет"],
    ["4. Кандидаты + омниканал", "Средняя–высокая", "Средний–высокий", "₽0 / подписка", "Перед массой внешних людей"],
]
data = [header]
for r in rows:
    data.append([Paragraph(r[0], S("c0", fontName="Segoe-Bold", fontSize=9, leading=12))] +
                [Paragraph(x, st_td_c) for x in r[1:4]] +
                [Paragraph(r[4], st_td)])
tbl = Table(data, colWidths=[38*mm, 26*mm, 22*mm, 24*mm, None], repeatRows=1)
tbl.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, BG_SOFT]),
    ("GRID", (0, 0), (-1, -1), 0.5, LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("LEFTPADDING", (0, 0), (-1, -1), 7), ("RIGHTPADDING", (0, 0), (-1, -1), 7),
    ("TOPPADDING", (0, 0), (-1, -1), 6), ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
]))
story.append(tbl)
story.append(Spacer(1, 12))

# 5. Рекомендация
story.append(section_header("5", "Рекомендуемый путь"))
story.append(Spacer(1, 6))
story.append(box("Поэтапно", [
    "<b>Шаг 1 (сейчас).</b> Вариант 1 — тикеты со статусом и ответом + Вариант 2 — ИИ как первая линия. "
    "Оба почти не требуют новой инфраструктуры и сразу убирают «чёрную дыру», в которую улетают обращения.",
    "<b>Шаг 2 (к росту нагрузки).</b> Вариант 3 — авто-контекст, авто-приоритет и метрики поддержки; "
    "ложится на биллинг и мультиарендность, которые и так в планах.",
    "<b>Шаг 3 (перед массовым внешним трафиком).</b> Вариант 4 — поддержка кандидатов на прохождении "
    "и сведение каналов; критично, когда тесты начнут проходить реальные внешние люди.",
], ACCENT, BG_SOFT))
story.append(Spacer(1, 8))
story.append(Paragraph(
    "Главная мысль: не нужно покупать внешний help-desk, чтобы заметно улучшить поддержку. "
    "У проекта уже есть всё для рывка — Telegram-бот, почта, центр уведомлений, ИИ-ассистент с базой знаний и "
    "модель событий. Самый дешёвый и самый заметный шаг — <b>замкнуть петлю обратной связи</b> "
    "(Вариант 1) и <b>поставить ИИ первой линией</b> (Вариант 2).", st_body))
story.append(Spacer(1, 10))
story.append(HRFlowable(width="100%", thickness=0.7, color=LINE, spaceBefore=2, spaceAfter=6))
story.append(Paragraph("Eltera Assessment Intelligence · внутренний документ · подготовлено по текущему коду проекта", st_small))


def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Segoe", 8)
    canvas.setFillColor(MUTE)
    canvas.drawRightString(A4[0] - 18*mm, 12*mm, f"{doc.page}")
    canvas.drawString(18*mm, 12*mm, "Служба поддержки Eltera — варианты улучшения")
    canvas.setStrokeColor(LINE)
    canvas.line(18*mm, 15*mm, A4[0] - 18*mm, 15*mm)
    canvas.restoreState()


doc = SimpleDocTemplate(
    "F:/elteraassestment/eltera/outputs/Поддержка-Eltera-варианты.pdf",
    pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=16*mm, bottomMargin=20*mm,
    title="Как усилить службу поддержки Eltera", author="Eltera",
)
doc.build(story, onFirstPage=footer, onLaterPages=footer)
print("OK")
