"""Генерация PDF-отчёта по оценке кандидата (reportlab), белая тема.

Кириллица — через системный TTF (Arial / DejaVuSans), с fallback на Helvetica.
Содержимое отчёта собирается в report_content.build_report_content.
"""
import os
from datetime import datetime, timezone
from io import BytesIO

from reportlab.graphics.shapes import Circle, Drawing, String
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.services.report_content import build_report_content

_REGULAR = [
    "C:/Windows/Fonts/arial.ttf", "C:/Windows/Fonts/Arial.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    "/Library/Fonts/Arial.ttf", "/System/Library/Fonts/Supplemental/Arial.ttf",
]
_BOLD = [
    "C:/Windows/Fonts/arialbd.ttf", "C:/Windows/Fonts/Arialbd.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/Library/Fonts/Arial Bold.ttf", "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
]


def _register() -> tuple[str, str]:
    regular, bold = "Helvetica", "Helvetica-Bold"
    for p in _REGULAR:
        if os.path.exists(p):
            pdfmetrics.registerFont(TTFont("EltBody", p)); regular = "EltBody"; break
    for p in _BOLD:
        if os.path.exists(p):
            pdfmetrics.registerFont(TTFont("EltBold", p)); bold = "EltBold"; break
    if bold == "Helvetica-Bold" and regular == "EltBody":
        bold = "EltBody"
    return regular, bold


FONT, FONT_BOLD = _register()

TEAL = colors.HexColor("#15B8A6")
INK = colors.HexColor("#16233B")
MUTED = colors.HexColor("#64748B")
LIGHT = colors.HexColor("#F1F5F9")
LINE = colors.HexColor("#E2E8F0")
NOTE_BG = colors.HexColor("#E7FAF6")

PAGE_W, PAGE_H = A4
MARGIN = 16 * mm
CONTENT_W = PAGE_W - 2 * MARGIN

# --- стили ---
S_TITLE = ParagraphStyle("title", fontName=FONT_BOLD, fontSize=20, leading=24, textColor=INK)
S_SUB = ParagraphStyle("sub", fontName=FONT, fontSize=9.5, leading=14, textColor=MUTED)
S_SECTION = ParagraphStyle("section", fontName=FONT_BOLD, fontSize=12.5, leading=16, textColor=INK)
S_BODY = ParagraphStyle("body", fontName=FONT, fontSize=9.5, leading=14, textColor=INK)
S_MUTED = ParagraphStyle("muted", fontName=FONT, fontSize=9, leading=13, textColor=MUTED)
S_BULLET = ParagraphStyle("bullet", fontName=FONT, fontSize=9.5, leading=14, textColor=INK,
                          leftIndent=12, bulletIndent=2, spaceAfter=4)
S_TILE_LBL = ParagraphStyle("tlbl", fontName=FONT, fontSize=8, leading=11, textColor=MUTED)
S_TILE_VAL = ParagraphStyle("tval", fontName=FONT_BOLD, fontSize=16, leading=19, textColor=INK)
S_DEC_TITLE = ParagraphStyle("dect", fontName=FONT_BOLD, fontSize=12, leading=16, textColor=INK)
S_TH = ParagraphStyle("th", fontName=FONT_BOLD, fontSize=7.5, leading=10, textColor=MUTED)
S_TD = ParagraphStyle("td", fontName=FONT, fontSize=8.5, leading=12, textColor=INK)
S_COMP = ParagraphStyle("comp", fontName=FONT_BOLD, fontSize=9.5, leading=13, textColor=INK)
S_COMP_VAL = ParagraphStyle("compv", fontName=FONT_BOLD, fontSize=9.5, leading=13, textColor=INK, alignment=2)


def _bullets(items):
    return [Paragraph(t, S_BULLET, bulletText="•") for t in items]


def _section(title):
    return Paragraph(title, S_SECTION)


def _two_col(left, right, gutter=14):
    col = (CONTENT_W - gutter) / 2
    t = Table([[left, "", right]], colWidths=[col, gutter, col])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return t


def _score_circle(percent):
    d = Drawing(116, 116)
    d.add(Circle(58, 58, 54, fillColor=TEAL, strokeColor=None))
    d.add(String(58, 60, f"{percent}%", fontName=FONT_BOLD, fontSize=26,
                 fillColor=colors.white, textAnchor="middle"))
    d.add(String(58, 42, "соответствие", fontName=FONT, fontSize=7.5,
                 fillColor=colors.white, textAnchor="middle"))
    return d


def _decision_box(content):
    inner = [
        Paragraph(content["decision_title"], S_DEC_TITLE),
        Spacer(1, 5),
        Paragraph(content["decision_text"], S_MUTED),
    ]
    box = Table([[inner]], colWidths=[CONTENT_W * 0.66])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 14),
        ("RIGHTPADDING", (0, 0), (-1, -1), 14),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]))
    return box


def _tiles(content):
    tiles = content["tiles"]
    cells = [[Paragraph(lbl, S_TILE_LBL), Spacer(1, 4), Paragraph(str(val), S_TILE_VAL)]
             for lbl, val in tiles]
    w = CONTENT_W * 0.30
    t = Table([cells], colWidths=[w] * len(tiles), hAlign="LEFT")
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT),
        ("INNERGRID", (0, 0), (-1, -1), 6, colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 12),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
    ]))
    return t


def _bar(percent, width):
    pct = max(0, min(percent, 100))
    left = max(0.5, pct)
    bar = Table([["", ""]], colWidths=[width * left / 100, width * (100 - left) / 100], rowHeights=[8])
    bar.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), TEAL),
        ("BACKGROUND", (1, 0), (1, 0), LIGHT),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("RIGHTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 0),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    return bar


def _competency_block(content, width):
    name_w, bar_w, score_w = width * 0.46, width * 0.32, width * 0.22
    rows = []
    for c in content["competencies"]:
        rows.append([
            Paragraph(c["name"], S_COMP),
            _bar(c["percent"], bar_w - 4),
            Paragraph(f"{c['score10']}/10", S_COMP_VAL),
        ])
    if not rows:
        return Paragraph("Нет данных по компетенциям.", S_MUTED)
    t = Table(rows, colWidths=[name_w, bar_w, score_w])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (-1, -1), 0),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LINEBELOW", (0, 0), (-1, -2), 0.5, LINE),
    ]))
    return t


def _note(text, width):
    box = Table([[Paragraph(text, ParagraphStyle("note", fontName=FONT, fontSize=9, leading=13,
                                                  textColor=colors.HexColor("#0F766E")))]],
                colWidths=[width])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NOTE_BG),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    return box


def _interview_table(content):
    head = [Paragraph(h, S_TH) for h in ("ЧТО ПРОВЕРИТЬ", "ВОПРОС", "ХОРОШИЙ ПРИЗНАК", "КРАСНЫЙ ФЛАГ")]
    rows = [head]
    for q in content["interview_questions"]:
        rows.append([
            Paragraph(q["check"], ParagraphStyle("qc", fontName=FONT_BOLD, fontSize=8.5, leading=12, textColor=INK)),
            Paragraph(q["question"], S_TD),
            Paragraph(q["good"], S_TD),
            Paragraph(q["red"], ParagraphStyle("rd", fontName=FONT, fontSize=8.5, leading=12,
                                               textColor=colors.HexColor("#B91C1C"))),
        ])
    t = Table(rows, colWidths=[CONTENT_W * 0.18, CONTENT_W * 0.34, CONTENT_W * 0.26, CONTENT_W * 0.22])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), LIGHT),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LINEBELOW", (0, 0), (-1, -1), 0.5, LINE),
    ]))
    return t


def _decorate(canvas, doc):
    canvas.saveState()
    # header
    canvas.setFillColor(INK)
    canvas.setFont(FONT_BOLD, 11)
    canvas.drawString(MARGIN, PAGE_H - 12 * mm, "eltera")
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 8.5)
    canvas.drawString(MARGIN + 16 * mm, PAGE_H - 12 * mm, "отчёт оценки кандидата")
    canvas.drawRightString(PAGE_W - MARGIN, PAGE_H - 12 * mm, doc._elt_header_right)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(MARGIN, PAGE_H - 14.5 * mm, PAGE_W - MARGIN, PAGE_H - 14.5 * mm)
    # footer
    canvas.setFillColor(MUTED)
    canvas.setFont(FONT, 7.5)
    canvas.drawCentredString(
        PAGE_W / 2, 10 * mm,
        "Eltera · конфиденциальный отчёт для команды найма — не передаётся кандидату",
    )
    canvas.drawRightString(PAGE_W - MARGIN, 10 * mm, f"{doc.page}")
    canvas.restoreState()


def build_candidate_report(candidate, narrative: dict | None = None) -> bytes:
    content = build_report_content(candidate, narrative)
    today = datetime.now(timezone.utc).strftime("%d.%m.%Y")
    col = (CONTENT_W - 14) / 2

    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        topMargin=22 * mm, bottomMargin=16 * mm, leftMargin=MARGIN, rightMargin=MARGIN,
        title=content["title"], author="Eltera",
    )
    doc._elt_header_right = f"{today} · конфиденциально"

    story = []
    # ---------- Страница 1 ----------
    story.append(Paragraph(content["title"], S_TITLE))
    story.append(Spacer(1, 8))
    story.append(Paragraph(content["subtitle"], S_SUB))
    story.append(Spacer(1, 16))

    result = Table([[_score_circle(content["percent"]), _decision_box(content)]],
                   colWidths=[CONTENT_W * 0.32, CONTENT_W * 0.68])
    result.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("LEFTPADDING", (0, 0), (0, 0), 0),
        ("ALIGN", (0, 0), (0, 0), "CENTER"),
    ]))
    story.append(result)
    story.append(Spacer(1, 16))
    story.append(_tiles(content))
    story.append(Spacer(1, 20))

    left = [_section("Что важно для HR"), Spacer(1, 8), *_bullets(content["hr_points"])]
    right = [_section("Что важно для руководителя"), Spacer(1, 8), *_bullets(content["manager_points"])]
    story.append(_two_col(left, right))

    # ---------- Страница 2 ----------
    story.append(PageBreak())
    left = [_section("Профиль компетенций"), Spacer(1, 10), _competency_block(content, col)]
    right = [_section("Где кандидат подходит"), Spacer(1, 10), *_bullets(content["fit_areas"]),
             Spacer(1, 10), _note(content["fit_note"], col)]
    story.append(_two_col(left, right))
    story.append(Spacer(1, 20))

    left = [_section("Сильные стороны"), Spacer(1, 8), *_bullets(content["strengths"])]
    right = [_section("Зоны проверки"), Spacer(1, 8), *_bullets(content["zones"])]
    story.append(_two_col(left, right))
    story.append(Spacer(1, 20))
    story.append(_section("Мотивация и управление"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(content["motivation"], S_BODY))

    # ---------- Страница 3 ----------
    story.append(PageBreak())
    story.append(_section("Проверочные вопросы для интервью"))
    story.append(Spacer(1, 10))
    story.append(_interview_table(content))
    story.append(Spacer(1, 20))

    left = [_section("Практическое задание"), Spacer(1, 8), *_bullets(content["practical_task"])]
    right = [_section("План адаптации на 14 дней"), Spacer(1, 8), *_bullets(content["adaptation_plan"])]
    story.append(_two_col(left, right))
    story.append(Spacer(1, 20))
    story.append(_section("Финальное правило"))
    story.append(Spacer(1, 6))
    story.append(Paragraph(content["final_rule"], S_BODY))

    doc.build(story, onFirstPage=_decorate, onLaterPages=_decorate)
    return buf.getvalue()
