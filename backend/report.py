from datetime import datetime
from io import BytesIO
from math import ceil
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.utils import ImageReader
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFError, TTFont
from reportlab.pdfgen import canvas
from reportlab.pdfbase.pdfmetrics import stringWidth

import analysis
import formatos
import loader


PAGE_W, PAGE_H = A4
CONTENT_LEFT = 56.0
CONTENT_RIGHT = PAGE_W - 56.0
CONTENT_WIDTH = CONTENT_RIGHT - CONTENT_LEFT
CONTENT_TOP = 58.0
CONTENT_BOTTOM = PAGE_H - 52.0
CARD_GAP = 1.0
CARD_WIDTH = (CONTENT_WIDTH - (CARD_GAP * 2)) / 3
LOGO_PATH = Path(__file__).parent / "assets" / "rota_group_logo.png"

NAVY = colors.HexColor("#172033")
NAVY_BLUE = colors.HexColor("#102A56")
MUTED = colors.HexColor("#697386")
GRID = colors.HexColor("#DCE3EC")
CYAN = colors.HexColor("#1596D2")
CYAN_LIGHT = colors.HexColor("#B9DDF0")
GREEN = colors.HexColor("#16A36A")
AMBER = colors.HexColor("#F59E0B")
LIGHT_BLUE = colors.HexColor("#EAF5FB")
VERY_LIGHT = colors.HexColor("#F8FAFC")
WHITE = colors.white

FONT_REGULAR = "Helvetica"
FONT_BOLD = "Helvetica-Bold"

try:
    pdfmetrics.registerFont(TTFont("SegoeUI", r"C:\Windows\Fonts\segoeui.ttf"))
    pdfmetrics.registerFont(TTFont("SegoeUI-Bold", r"C:\Windows\Fonts\segoeuib.ttf"))
    FONT_REGULAR = "SegoeUI"
    FONT_BOLD = "SegoeUI-Bold"
except (OSError, TTFError):
    pass


def _money(value: float | None) -> str:
    return formatos.fmt_moeda(value or 0)


def _number(value: float | None, decimals: int = 2) -> str:
    if value is None:
        return "Não informado"
    return formatos.fmt_numero(value, decimals)


def _percent(value: float | None) -> str:
    return "Não informado" if value is None else f"{value * 100:.2f}%".replace(".", ",")


def _date_label(value: str | None) -> str:
    if not value:
        return datetime.now().strftime("%d/%m/%Y")
    try:
        return datetime.fromisoformat(value.replace("Z", "")).strftime("%d/%m/%Y")
    except ValueError:
        return str(value)[:10]


def _wrap(text: str, font: str, size: float, width: float) -> list[str]:
    words = str(text).split()
    if not words:
        return [""]
    lines: list[str] = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if current and stringWidth(candidate, font, size) > width:
            lines.append(current)
            current = word
        else:
            current = candidate
    if current:
        lines.append(current)
    return lines


def _fit_text(text: str, font: str, size: float, max_width: float) -> tuple[str, float]:
    text = str(text)
    if stringWidth(text, font, size) <= max_width:
        return text, size
    fitted_size = size
    while fitted_size > 6 and stringWidth(text, font, fitted_size) > max_width:
        fitted_size -= 0.25
    if stringWidth(text, font, fitted_size) <= max_width:
        return text, fitted_size
    suffix = "..."
    clipped = text
    while clipped and stringWidth(clipped + suffix, font, fitted_size) > max_width:
        clipped = clipped[:-1]
    return clipped.rstrip() + suffix, fitted_size


def _text(c: canvas.Canvas, text: str, x: float, top: float, size: float = 8, font: str = FONT_REGULAR,
          color=NAVY, align: str = "left", max_width: float | None = None) -> None:
    if max_width is not None:
        text, size = _fit_text(text, font, size, max_width)
    c.setFont(font, size)
    c.setFillColor(color)
    y = PAGE_H - top - size
    if align == "right":
        c.drawRightString(x, y, str(text))
    elif align == "center":
        c.drawCentredString(x, y, str(text))
    else:
        c.drawString(x, y, str(text))


def _wrapped(c: canvas.Canvas, text: str, x: float, top: float, width: float, size: float = 8,
             leading: float | None = None, font: str = FONT_REGULAR, color=MUTED,
             max_lines: int | None = None) -> float:
    leading = leading or size * 1.3
    lines = _wrap(text, font, size, width)
    if max_lines:
        lines = lines[:max_lines]
    for index, line in enumerate(lines):
        _text(c, line, x, top + index * leading, size, font, color)
    return top + len(lines) * leading


def _rect(c: canvas.Canvas, x: float, top: float, width: float, height: float,
          fill=WHITE, stroke=GRID, line_width: float = 0.6) -> None:
    if x < CONTENT_LEFT - 0.5 or x + width > CONTENT_RIGHT + 0.5:
        raise ValueError(f"Bloco fora da área de conteúdo: x={x}, width={width}")
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(line_width)
    c.rect(x, PAGE_H - top - height, width, height, stroke=1, fill=1)


def _line(c: canvas.Canvas, x1: float, top1: float, x2: float, top2: float, color=GRID,
          width: float = 0.6, dash: tuple[float, float] | None = None) -> None:
    c.saveState()
    c.setStrokeColor(color)
    c.setLineWidth(width)
    if dash:
        c.setDash(*dash)
    c.line(x1, PAGE_H - top1, x2, PAGE_H - top2)
    c.restoreState()


def _header_footer(c: canvas.Canvas, local_name: str, page: int, total_pages: int, date_label: str) -> None:
    if LOGO_PATH.exists():
        c.drawImage(ImageReader(str(LOGO_PATH)), 11, PAGE_H - 36, width=76, height=12, mask="auto")
    _line(c, 11, 43, PAGE_W - 11, 43, GRID, 0.7)
    local_lines = _wrap(local_name, FONT_REGULAR, 7.2, 145)
    for index, line in enumerate(local_lines[:2]):
        _text(c, line, PAGE_W - 18, 19 + index * 9, 7.2, FONT_REGULAR, MUTED, "right")
    footer = f"Rota Smart | Uso interno | Projeto não informado | Página {page} de {total_pages} | {date_label}"
    _text(c, footer, 11, PAGE_H - 23, 7.5, FONT_REGULAR, MUTED)


def _card(c: canvas.Canvas, x: float, top: float, width: float, height: float, label: str, value: str,
          sub: str = "", accent=CYAN, value_size: float = 15, label_size: float = 7.5) -> None:
    _rect(c, x, top, width, height, WHITE, GRID)
    c.setFillColor(accent)
    c.rect(x, PAGE_H - top - 3, width, 3, stroke=0, fill=1)
    _text(c, label.upper(), x + 10, top + 9, label_size, FONT_BOLD, MUTED, max_width=width - 20)
    _text(c, value, x + 10, top + 34, value_size, FONT_BOLD, NAVY, max_width=width - 20)
    if sub:
        _wrapped(c, sub, x + 10, top + height - 16, width - 20, 7.2, 9, FONT_REGULAR, MUTED, 2)


def _section_title(c: canvas.Canvas, title: str, subtitle: str | None = None, top: float = 62) -> None:
    _text(c, title, CONTENT_LEFT, top, 17, FONT_BOLD, NAVY_BLUE, max_width=CONTENT_WIDTH)
    if subtitle:
        _text(c, subtitle, CONTENT_LEFT, top + 27, 9.5, FONT_REGULAR, MUTED, max_width=CONTENT_WIDTH)


def _draw_horizontal_bars(c: canvas.Canvas, x: float, top: float, width: float,
                          entries: list[tuple[str, float]], color=CYAN, label_width: float = 58,
                          value_decimals: int = 0) -> None:
    max_value = max((value for _, value in entries), default=1) or 1
    row_height = 22
    bar_x = x + label_width
    bar_width = width - label_width - 40
    for index, (label, value) in enumerate(entries):
        row_top = top + index * row_height
        _text(c, label, x, row_top + 3, 6.5, FONT_REGULAR, MUTED)
        c.setFillColor(VERY_LIGHT)
        c.rect(bar_x, PAGE_H - row_top - 15, bar_width, 12, stroke=0, fill=1)
        c.setFillColor(color)
        c.rect(bar_x, PAGE_H - row_top - 15, max(1, bar_width * value / max_value), 12, stroke=0, fill=1)
        value_text = _money(value) if value_decimals else _money(value).replace(",00", "")
        _text(c, value_text, bar_x + bar_width + 5, row_top + 3, 6.5, FONT_REGULAR, MUTED)


def _key_value_table(c: canvas.Canvas, x: float, top: float, width: float,
                     left_title: str, left_rows: list[tuple[str, str]],
                     right_title: str, right_rows: list[tuple[str, str]]) -> None:
    half = width / 2
    header_height = 18 if left_title or right_title else 0
    height = header_height + max(len(left_rows), len(right_rows)) * 18
    _rect(c, x, top, width, height, WHITE, GRID)
    _line(c, x + half, top, x + half, top + height, GRID)
    if header_height:
        _text(c, left_title.upper(), x + 14, top + 1, 7.5, FONT_BOLD, MUTED)
        _text(c, right_title.upper(), x + half + 11, top + 1, 7.5, FONT_BOLD, MUTED)
    for index in range(max(len(left_rows), len(right_rows))):
        row_top = top + header_height + index * 18
        if index < len(left_rows):
            label, value = left_rows[index]
            _text(c, label, x + 10, row_top + 1, 7.7, FONT_REGULAR, NAVY)
            _text(c, value, x + half - 10, row_top + 1, 7.7, FONT_REGULAR, NAVY, "right")
        if index < len(right_rows):
            label, value = right_rows[index]
            _text(c, label, x + half + 10, row_top + 1, 7.7, FONT_REGULAR, NAVY)
            _text(c, value, x + width - 10, row_top + 1, 7.7, FONT_REGULAR, NAVY, "right")
        _line(c, x + 10, row_top + 16, x + half - 10, row_top + 16, GRID, 0.45)
        _line(c, x + half + 10, row_top + 16, x + width - 10, row_top + 16, GRID, 0.45)


def _summary_box(c: canvas.Canvas, local: loader.Local, top: float = 270) -> None:
    width = 483
    height = 99
    x = 56
    _rect(c, x, top, width, height, LIGHT_BLUE, CYAN_LIGHT)
    c.setFillColor(CYAN)
    c.rect(x, PAGE_H - top - height, 3.5, height, stroke=0, fill=1)
    _text(c, "RESUMO DA ANÁLISE", x + 12, top + 10, 7.5, FONT_BOLD, MUTED)
    texto = (
        f"O projeto apresenta saldo operacional mensal de {_money(local.saldo_mensal)} e "
        f"recuperação estimada do investimento em {_number(local.tempo_retorno)} meses."
    )
    _wrapped(c, texto, x + 12, top + 37, width - 24, 9, 12, FONT_REGULAR, NAVY, 3)
    _text(c, "Dados cadastrais pendentes: cliente, projeto, licitação, responsável.",
          x + 12, top + 76, 8, FONT_REGULAR, MUTED)


def _draw_return_chart(c: canvas.Canvas, local: loader.Local, top: float = 112) -> None:
    x = 68
    width = 480
    height = 265
    plot_x = x + 42
    plot_top = top + 10
    plot_bottom = top + height - 30
    plot_w = width - 54
    plot_h = plot_bottom - plot_top
    net_investment = max(0, local.investimento - local.taxa_instalacao)
    saldo = local.saldo_mensal
    months = list(range(0, 37))
    values = [(-net_investment + saldo * month) for month in months]
    ymin = min(values + [0])
    ymax = max(values + [0])
    if ymax == ymin:
        ymax = ymin + 1
    margin = (ymax - ymin) * 0.08
    ymin -= margin
    ymax += margin

    def px(month: float) -> float:
        return plot_x + plot_w * month / 36

    def py(value: float) -> float:
        return PAGE_H - (plot_top + plot_h * (ymax - value) / (ymax - ymin))

    for tick in range(5):
        value = ymin + (ymax - ymin) * tick / 4
        top_tick = PAGE_H - py(value)
        _line(c, plot_x, top_tick, plot_x + plot_w, top_tick, GRID, 0.45)
        _text(c, _money(value).replace(",00", ""), plot_x - 7, top_tick - 3, 7.5, FONT_REGULAR, MUTED, "right")
    zero_y = py(0)
    zero_top = PAGE_H - zero_y
    _line(c, plot_x, zero_top, plot_x + plot_w, zero_top, MUTED, 0.7, (4, 3))

    points = [(px(month), py(value)) for month, value in zip(months, values)]
    c.saveState()
    c.setFillColor(LIGHT_BLUE)
    path = c.beginPath()
    path.moveTo(points[0][0], zero_y)
    for point_x, point_y in points:
        path.lineTo(point_x, point_y)
    path.lineTo(points[-1][0], zero_y)
    path.close()
    c.drawPath(path, stroke=0, fill=1)
    c.restoreState()

    c.saveState()
    c.setStrokeColor(CYAN)
    c.setLineWidth(2.1)
    path = c.beginPath()
    path.moveTo(*points[0])
    for point in points[1:]:
        path.lineTo(*point)
    c.drawPath(path, stroke=1, fill=0)
    c.restoreState()

    payback = ceil((net_investment / saldo)) if saldo > 0 else None
    if payback is not None:
        payback_x = px(min(payback, 36))
        _line(c, payback_x, plot_top, payback_x, plot_bottom, GREEN, 1.2, (4, 3))
        _text(c, f"Payback: {payback} meses", payback_x - 4, plot_top - 5, 7.5, FONT_REGULAR, GREEN, "right")
        c.setFillColor(GREEN)
        c.circle(payback_x, py(-net_investment + saldo * min(payback, 36)), 4, stroke=0, fill=1)

    for month in range(0, 37, 4):
        x_tick = px(month)
        _text(c, str(month), x_tick, plot_bottom + 8, 7.5, FONT_REGULAR, MUTED, "center")
    _text(c, "Meses", plot_x + plot_w / 2, plot_bottom + 25, 8.5, FONT_REGULAR, NAVY, "center")
    c.saveState()
    c.setFont(FONT_REGULAR, 8.5)
    c.setFillColor(NAVY)
    c.translate(x - 5, PAGE_H - (top + height / 2))
    c.rotate(90)
    c.drawString(0, 0, "Saldo acumulado (R$)")
    c.restoreState()


def _draw_projection_chart(c: canvas.Canvas, local: loader.Local, top: float = 285) -> None:
    x = CONTENT_LEFT
    width = CONTENT_WIDTH
    height = 212
    plot_x = x + 22
    plot_top = top + 8
    plot_bottom = top + height - 28
    plot_w = width - 42
    plot_h = plot_bottom - plot_top
    values = [local.valor_mensal * 60, local.valor_mensal * 120,
              local.saldo_mensal * 60 - max(0, local.investimento - local.taxa_instalacao),
              local.saldo_mensal * 120 - max(0, local.investimento - local.taxa_instalacao)]
    ymax = max(values) * 1.15 if max(values) > 0 else 1

    def px(value: float) -> float:
        return plot_x + plot_w * value / 2

    def py(value: float) -> float:
        return PAGE_H - (plot_bottom - plot_h * value / ymax)

    for tick in range(5):
        value = ymax * tick / 4
        tick_top = PAGE_H - py(value)
        _line(c, plot_x, tick_top, plot_x + plot_w, tick_top, GRID, 0.45)
    groups = [(0.52, "5 anos", values[0], values[2]), (1.48, "10 anos", values[1], values[3])]
    bar_w = 0.28
    for group_x, label, revenue, result in groups:
        bars = [(group_x - bar_w / 2, revenue, CYAN), (group_x + bar_w / 2, result, GREEN)]
        for bar_x, value, color in bars:
            left = plot_x + plot_w * (bar_x / 2) - 28
            bar_width = 56
            bar_top = py(max(value, 0))
            base_y = py(0)
            c.setFillColor(color)
            c.rect(left, base_y, bar_width, max(1, bar_top - base_y), stroke=0, fill=1)
            _text(c, _money(value).replace(",00", ""), left + bar_width / 2, PAGE_H - bar_top - 15,
                  7.2, FONT_REGULAR, NAVY, "center")
        _text(c, label, plot_x + plot_w * group_x / 2, plot_bottom + 10, 7.5, FONT_REGULAR, NAVY, "center")


def _items_by_category(local: loader.Local) -> list[tuple[str, list[loader.Item]]]:
    categories: list[tuple[str, list[loader.Item]]] = []
    for item in local.itens:
        for name, items in categories:
            if name == item.categoria:
                items.append(item)
                break
        else:
            categories.append((item.categoria, [item]))
    return categories


def _category_label(name: str) -> str:
    normalized = name.strip().upper()
    return "CFTV" if normalized == "CFTV" else "Alarme" if normalized == "ALARME" else name.title()


def _draw_table(c: canvas.Canvas, x: float, top: float, widths: list[float], headers: list[str],
                rows: list[list[str]], row_heights: list[float] | None = None,
                header_height: float = 19, font_size: float = 7.7) -> float:
    total_width = sum(widths)
    height_cursor = top
    _rect(c, x, height_cursor, total_width, header_height, NAVY_BLUE, NAVY_BLUE)
    x_cursor = x
    for width, header in zip(widths, headers):
        _text(c, header.upper(), x_cursor + 7, height_cursor + 5, 7.5, FONT_BOLD, WHITE)
        x_cursor += width
    height_cursor += header_height
    for row_index, row in enumerate(rows):
        height = row_heights[row_index] if row_heights else 19
        fill = WHITE if row_index % 2 == 0 else VERY_LIGHT
        _rect(c, x, height_cursor, total_width, height, fill, GRID, 0.45)
        x_cursor = x
        for col_index, (width, value) in enumerate(zip(widths, row)):
            if col_index == 1:
                lines = _wrap(str(value), FONT_REGULAR, font_size, width - 12)
                for line_index, line in enumerate(lines[:3]):
                    _text(c, line, x_cursor + 7, height_cursor + 5 + line_index * 9, font_size, FONT_REGULAR, NAVY)
            else:
                _text(c, str(value), x_cursor + 7, height_cursor + 5, font_size, FONT_REGULAR, NAVY)
            x_cursor += width
        height_cursor += height
    return height_cursor


def _item_rows(items: list[loader.Item]) -> tuple[list[list[str]], list[float]]:
    rows: list[list[str]] = []
    heights: list[float] = []
    description_width = 226 - 12
    for item in items:
        lines = _wrap(item.material, FONT_REGULAR, 7.7, description_width)
        rows.append([
            item.cod,
            item.material,
            formatos.fmt_numero(item.qtd, 0),
            _money(item.valor_unit),
            _money(item.valor_total),
        ])
        heights.append(max(19, 10 + min(3, len(lines)) * 9))
    return rows, heights


def _draw_subtotal(c: canvas.Canvas, x: float, top: float, widths: list[float], count: int,
                   value: float) -> float:
    total_width = sum(widths)
    _rect(c, x, top, total_width, 22, LIGHT_BLUE, GRID, 0.45)
    _text(c, "Subtotal", x + widths[0] + 7, top + 6, 7.7, FONT_REGULAR, NAVY)
    _text(c, str(count), x + widths[0] + widths[1] + 7, top + 6, 7.7, FONT_REGULAR, NAVY)
    _text(c, _money(value), x + total_width - widths[-1] + 7, top + 6, 7.7, FONT_REGULAR, NAVY)
    return top + 22


def _page_one(c: canvas.Canvas, local: loader.Local, context: dict, page: int, total: int) -> None:
    _header_footer(c, local.nome, page, total, context["date"])
    _text(c, "DASHBOARD FINANCEIRO", 56, 60, 7.5, FONT_BOLD, CYAN)
    c.setFillColor(MUTED)
    c.roundRect(465, PAGE_H - 75, 74, 17, 4, stroke=0, fill=1)
    _text(c, "INCOMPLETO", 502, 63, 7.5, FONT_BOLD, WHITE, "center")
    _text(c, "Resumo executivo", 230, 73, 30, FONT_BOLD, NAVY, "center")
    _wrapped(c, local.nome, 416, 77, 125, 8, 10, FONT_REGULAR, MUTED, 2)

    card_x = [CONTENT_LEFT + index * (CARD_WIDTH + CARD_GAP) for index in range(3)]
    card_w = CARD_WIDTH
    _card(c, card_x[0], 114, card_w, 82, "Investimento total", _money(local.investimento), "Implantação e equipamentos", CYAN)
    _card(c, card_x[1], 114, card_w, 82, "Valor mensal", _money(local.valor_mensal), "Receita recorrente", CYAN)
    _card(c, card_x[2], 114, card_w, 82, "Saldo mensal", _money(local.saldo_mensal), "Após impostos e custos", GREEN)
    _card(c, card_x[0], 208, card_w, 82, "Margem mensal", _percent(local.margem), "Saldo sobre a receita", GREEN)
    payback = ceil(local.tempo_retorno) if local.tempo_retorno is not None else None
    _card(c, card_x[1], 208, card_w, 82, "Payback", f"{payback} meses" if payback else "Não viável", "Retorno arredondado", GREEN)
    _card(c, card_x[2], 208, card_w, 82, "Investimento em equipamentos", _money(local.equipamento), "Componentes de equipamento", CYAN)

    _summary_box(c, local, 306)
    _key_value_table(
        c, 56, 421, 483,
        "Estrutura recorrente",
        [("Impostos mensais", _money(local.impostos)), ("Custos operacionais", _money(local.custos_fixos)),
         ("Margem operacional", _percent(local.margem))],
        "Contexto do projeto",
        [("Prazo contratual", "Não informado"), ("Solução", "Não informada")],
    )
    result_5 = local.saldo_mensal * 60 - max(0, local.investimento - local.taxa_instalacao)
    result_10 = local.saldo_mensal * 120 - max(0, local.investimento - local.taxa_instalacao)
    roi_5 = result_5 / local.investimento if local.investimento else None
    roi_10 = result_10 / local.investimento if local.investimento else None
    _card(c, CONTENT_LEFT, 509, CARD_WIDTH, 84, "Resultado em 5 anos", _money(result_5), f"ROI de {_percent(roi_5)}", GREEN)
    _card(c, CONTENT_LEFT + CARD_WIDTH + CARD_GAP, 509, CARD_WIDTH, 84, "Resultado em 10 anos", _money(result_10), f"ROI de {_percent(roi_10)}", GREEN)
    _card(c, CONTENT_LEFT + (CARD_WIDTH + CARD_GAP) * 2, 509, CARD_WIDTH, 93, "Análise", "ANÁLISE PRELIMINAR", "Prazo contratual e dados cadastrais pendentes.", AMBER, 11)


def _page_two(c: canvas.Canvas, local: loader.Local, page: int, total: int, date_label: str) -> None:
    _header_footer(c, local.nome, page, total, date_label)
    _section_title(c, "Estrutura financeira", "Receita, custos operacionais e composição do investimento.", 62)
    x = 56
    split = 297.6
    _line(c, split, 101, split, 337, GRID)
    _line(c, x, 101, 539, 101, GRID)
    _text(c, "COMPOSIÇÃO DOS CUSTOS MENSAIS", 67, 112, 11.5, FONT_BOLD, NAVY_BLUE)
    _text(c, "COMPOSIÇÃO DO INVESTIMENTO", 307, 112, 11.5, FONT_BOLD, NAVY_BLUE)
    recurring = [("Impostos", local.impostos), ("Manutenção", local.custo_manutencao),
                 ("Terceiros", local.mensal_terceirizada), ("Chip", local.chip_mensal),
                 ("Softwares", local.custos_softwares)]
    investment = [("Equipamentos", local.equipamento), ("Mão de obra", local.mao_de_obra),
                  ("Outros", max(0, local.investimento - local.equipamento - local.mao_de_obra))]
    _draw_horizontal_bars(c, 67, 143, 215, recurring, CYAN)
    _draw_horizontal_bars(c, 307, 143, 215, investment, CYAN, 62)
    _key_value_table(c, 56, 278, 483, "", [("Receita", _money(local.valor_mensal)), ("(-) Impostos", _money(local.impostos)),
                                               ("(-) Custos operacionais", _money(local.custos_fixos)), ("Saldo mensal", _money(local.saldo_mensal)),
                                               ("Margem", _percent(local.margem))],
                     "", [("Equipamentos", _money(local.equipamento)), ("Mão de obra", _money(local.mao_de_obra)),
                           ("Outros investimentos", _money(max(0, local.investimento - local.equipamento - local.mao_de_obra))),
                           ("Investimento total", _money(local.investimento)), ("Investimento líquido", _money(max(0, local.investimento - local.taxa_instalacao)))])
    _text(c, "EFICIÊNCIA OPERACIONAL", CONTENT_LEFT, 370, 11.5, FONT_BOLD, NAVY_BLUE)
    efficiency_width = CONTENT_WIDTH / 4
    card_x = [CONTENT_LEFT + index * efficiency_width for index in range(4)]
    labels = [("Receita mensal", _money(local.valor_mensal), "Valor recorrente", CYAN),
              ("Impostos + custos", _money(local.impostos + local.custos_fixos), "Comprometimento mensal", AMBER),
              ("Saldo mensal", _money(local.saldo_mensal), "Resultado operacional", GREEN),
              ("Margem operacional", _percent(local.margem), "Saldo sobre receita", GREEN)]
    for x_card, (label, value, sub, accent) in zip(card_x, labels):
        _card(c, x_card, 387, efficiency_width, 84, label, value, sub, accent)


def _page_three(c: canvas.Canvas, local: loader.Local, page: int, total: int, date_label: str) -> None:
    _header_footer(c, local.nome, page, total, date_label)
    _section_title(c, "Retorno do investimento", "Evolução do saldo acumulado a partir do investimento inicial líquido.", 62)
    _draw_return_chart(c, local, 106)
    net = max(0, local.investimento - local.taxa_instalacao)
    exact = local.tempo_retorno
    rounded = ceil(exact) if exact is not None else None
    efficiency_width = CONTENT_WIDTH / 4
    card_x = [CONTENT_LEFT + index * efficiency_width for index in range(4)]
    labels = [("Investimento inicial líquido", _money(net), "Após taxa de instalação", CYAN),
              ("Saldo mensal", _money(local.saldo_mensal), "Geração operacional", GREEN),
              ("Payback exato", f"{_number(exact)} meses", "Cálculo sem arredondamento", GREEN),
              ("Payback arredondado", f"{rounded} meses" if rounded else "Não viável", "Mês de recuperação", GREEN)]
    for x_card, (label, value, sub, accent) in zip(card_x, labels):
        _card(c, x_card, 416, efficiency_width, 84, label, value, sub, accent, 15 if "Payback" not in label else 14)


def _page_four(c: canvas.Canvas, local: loader.Local, page: int, total: int, date_label: str) -> None:
    _header_footer(c, local.nome, page, total, date_label)
    _section_title(c, "Projeções financeiras", "Cenários nominais com valores constantes.", 62)
    result_5 = local.saldo_mensal * 60 - max(0, local.investimento - local.taxa_instalacao)
    result_10 = local.saldo_mensal * 120 - max(0, local.investimento - local.taxa_instalacao)
    roi_5 = result_5 / local.investimento if local.investimento else None
    roi_10 = result_10 / local.investimento if local.investimento else None
    _card(c, CONTENT_LEFT, 101, CARD_WIDTH, 84, "5 anos", _money(result_5), f"Receita {_money(local.valor_mensal * 60)} | ROI {_percent(roi_5)}", GREEN)
    _card(c, CONTENT_LEFT + CARD_WIDTH + 80, 101, CARD_WIDTH, 84, "10 anos", _money(result_10), f"Receita {_money(local.valor_mensal * 120)} | ROI {_percent(roi_10)}", GREEN)
    _draw_table(c, 56, 191, [161, 161, 161], ["Comparativo", "5 anos", "10 anos"],
                [["Receita", _money(local.valor_mensal * 60), _money(local.valor_mensal * 120)],
                 ["Resultado líquido", _money(result_5), _money(result_10)],
                 ["ROI", _percent(roi_5), _percent(roi_10)]], [19, 29, 29])
    _draw_projection_chart(c, local, 285)
    _draw_table(c, 56, 525, [100, 65, 125, 145, 48], ["Período", "Meses", "Receita", "Resultado líquido", "ROI"],
                [["5 anos", "60", _money(local.valor_mensal * 60), _money(result_5), _percent(roi_5)],
                 ["10 anos", "120", _money(local.valor_mensal * 120), _money(result_10), _percent(roi_10)]], [19, 19])
    _text(c, "Projeções nominais considerando valores constantes, sem reajustes, inflação, juros ou custo de capital.",
          CONTENT_LEFT, 588, 8.5, FONT_REGULAR, MUTED, max_width=CONTENT_WIDTH)


def _page_five(c: canvas.Canvas, local: loader.Local, page: int, total: int, date_label: str) -> list[loader.Item]:
    _header_footer(c, local.nome, page, total, date_label)
    _section_title(c, "Anexo técnico - materiais", "Composição dos equipamentos cadastrados no projeto.", 62)
    categories = _items_by_category(local)
    rows = [[_category_label(name), str(len(items)), _money(sum(item.valor_total for item in items))]
            for name, items in categories]
    rows.append(["TOTAL", str(len(local.itens)), _money(local.equipamento)])
    _draw_table(c, 56, 101, [280, 95, 108], ["Sistema", "Itens", "Valor"], rows, [19] * len(rows))
    if not categories:
        _text(c, "Nenhum material cadastrado na planilha.", 56, 180, 9, FONT_REGULAR, MUTED)
        return []

    cursor = 195
    first_name, first_items = categories[0]
    _text(c, _category_label(first_name), CONTENT_LEFT, cursor, 13, FONT_BOLD, NAVY_BLUE)
    cursor += 20
    widths = [62, 226, 45, 84, 66]
    first_page_items = first_items[:11]
    rows_first, heights_first = _item_rows(first_page_items)
    cursor = _draw_table(c, 56, cursor, widths, ["Código", "Descrição", "Qtd.", "Unitário", "Total"], rows_first, heights_first)
    cursor = _draw_subtotal(c, 56, cursor, widths, len(first_page_items), sum(item.valor_total for item in first_page_items)) + 14
    remaining = first_items[11:]
    if len(categories) > 1 and not remaining:
        second_name, second_items = categories[1]
        _text(c, _category_label(second_name), CONTENT_LEFT, cursor, 13, FONT_BOLD, NAVY_BLUE)
        cursor += 20
        second_page_items = second_items[:11]
        rows_second, heights_second = _item_rows(second_page_items)
        _draw_table(c, 56, cursor, widths, ["Código", "Descrição", "Qtd.", "Unitário", "Total"], rows_second, heights_second)
        remaining = second_items[11:]
    else:
        remaining = remaining + (categories[1][1] if len(categories) > 1 else [])
    return remaining


def _page_six(c: canvas.Canvas, local: loader.Local, remaining: list[loader.Item], filename: str,
              page: int, total: int, date_label: str) -> None:
    _header_footer(c, local.nome, page, total, date_label)
    widths = [62, 226, 45, 84, 66]
    cursor = 58
    if remaining:
        rows, heights = _item_rows(remaining)
        cursor = _draw_table(c, 56, cursor, widths, ["Código", "Descrição", "Qtd.", "Unitário", "Total"], rows, heights)
        categories = {item.categoria for item in remaining}
        if len(categories) == 1:
            category_items = [item for item in local.itens if item.categoria in categories]
            subtotal_count = len(category_items)
            subtotal_value = sum(item.valor_total for item in category_items)
        else:
            subtotal_count = len(remaining)
            subtotal_value = sum(item.valor_total for item in remaining)
        cursor = _draw_subtotal(c, 56, cursor, widths, subtotal_count, subtotal_value) + 16
    _text(c, f"Total geral dos equipamentos: {_money(local.equipamento)}", CONTENT_LEFT, cursor, 13, FONT_BOLD, NAVY_BLUE)
    cursor += 25
    _rect(c, 56, cursor, 483, 104, VERY_LIGHT, GRID)
    _text(c, "RASTREABILIDADE E PREMISSAS", 68, cursor + 14, 7.5, FONT_BOLD, MUTED)
    origem = f"Origem: {filename} | Atualização: {date_label} | Projeto: não informado"
    _wrapped(c, origem, 68, cursor + 40, 455, 8, 11, FONT_REGULAR, NAVY, 2)
    premissa = "Os valores refletem os dados cadastrados e os cálculos do projeto. Projeções são nominais e não incluem reajustes, inflação, juros ou custo de capital."
    _wrapped(c, premissa, 68, cursor + 67, 455, 8, 11, FONT_REGULAR, NAVY, 3)
    _text(c, "Avisos: Prazo contratual não informado; indicadores contratuais não calculados.", 68, cursor + 91, 8, FONT_REGULAR, MUTED)


def gerar_pdf(filename: str, locais: list[loader.Local], uploaded_at: str | None = None) -> bytes:
    buffer = BytesIO()
    total_pages = max(1, len(locais) * 6)
    date_label = _date_label(uploaded_at)
    pdf = canvas.Canvas(buffer, pagesize=A4, pageCompression=1)
    pdf.setTitle("Dashboard Financeiro")
    pdf.setAuthor("Rota Smart")
    page = 0
    for local in locais:
        page += 1
        _page_one(pdf, local, {"date": date_label}, page, total_pages)
        pdf.showPage()
        page += 1
        _page_two(pdf, local, page, total_pages, date_label)
        pdf.showPage()
        page += 1
        _page_three(pdf, local, page, total_pages, date_label)
        pdf.showPage()
        page += 1
        _page_four(pdf, local, page, total_pages, date_label)
        pdf.showPage()
        page += 1
        remaining = _page_five(pdf, local, page, total_pages, date_label)
        pdf.showPage()
        page += 1
        _page_six(pdf, local, remaining, filename, page, total_pages, date_label)
        pdf.showPage()
    pdf.save()
    return buffer.getvalue()
