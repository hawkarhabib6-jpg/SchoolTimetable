# -*- coding: utf-8 -*-
"""Definitions of every figure in the lesson, drawn from the real functions."""
import math
from figs import (Fig, reg, write_all, INK, SOFT, MUTED, BLUE, RED, GREEN, VIOLET, BAND, DASH)

PI = math.pi
cbrt = lambda t: math.copysign(abs(t) ** (1 / 3.0), t)


def pifmt(mapping):
    def f(v):
        for k, s in mapping.items():
            if abs(v - k) < 1e-6:
                return s
        return ("%g" % v).replace("-", "−")
    return f


# ═══════════════════════════ 1. concept figures ═══════════════════════════
@reg("p01_46")
def _():
    a, b, k = -1.0, 1.0, 1.7
    f = lambda x: 1 + k * (x - a) ** 2 if x < a else (1 + k * (x - b) ** 2 if x > b else 1)
    g = Fig((-3, 3), (-1.1, 4.4), xstep=1, ystep=1, show_ticks=False, mb=34)
    g.curve(f, dom=(-2.55, a), color=RED, width=2.8)
    g.curve(lambda x: 1.0, dom=(a, b), color=GREEN, width=3.0)
    g.curve(f, dom=(b, 2.55), color=BLUE, width=2.8)
    g.pt(a, 1, color=RED); g.pt(b, 1, color=BLUE)
    g.text(-2.3, 3.5, "f ′(x) < 0", color=RED, size=12, italic=True, anchor="middle")
    g.text(0, 1.62, "f ′(x) = 0", color=GREEN, size=12, italic=True)
    g.text(2.25, 3.5, "f ′(x) > 0", color=BLUE, size=12, italic=True, anchor="middle")
    g.text(0, 0.42, "نەگۆڕ", color=SOFT, size=11, font="kur", rtl=True)
    g.text(-1.95, -0.62, "ڕوو لە کەمبوون", color=RED, size=10.5, font="kur", rtl=True)
    g.text(1.95, -0.62, "ڕوو لە زیادبوون", color=BLUE, size=10.5, font="kur", rtl=True)
    g.text(a, 0, "a", dy=15, color=RED, size=12.5, italic=True)
    g.text(b, 0, "b", dy=15, color=BLUE, size=12.5, italic=True)
    return g.svg()


@reg("p01_12")
def _():
    f = lambda x: (x ** 3 - 12 * x) / 4.0
    g = Fig((-4.3, 4.3), (-5.4, 5.4), xstep=2, ystep=2)
    g.curve(f, dom=(-4.3, 0), color=BLUE, width=2.8)
    g.curve(f, dom=(0, 4.3), color=RED, width=2.8)
    g.pt(-2, 4, color=BLUE); g.pt(2, -4, color=RED)
    g.arrow(-3.35, 4.95, -2.15, 4.25, color=INK, width=1.4)
    g.text(-3.35, 4.95, "گ.ک.خ", dy=-8, color=INK, size=11, font="kur", rtl=True)
    g.arrow(3.35, -4.95, 2.15, -4.25, color=INK, width=1.4)
    g.text(3.35, -4.95, "ب.ک.خ", dy=15, color=INK, size=11, font="kur", rtl=True)
    return g.svg()


@reg("p01_13")
def _():
    g = Fig((-2.1, 2.1), (-3.3, 3.3), xstep=1, ystep=1)
    g.curve(lambda x: x ** 3, color=GREEN, width=2.9)
    g.pt(0, 0, color=GREEN)
    g.arrow(-1.55, 1.85, -0.18, 0.12, color=RED, width=1.5)
    g.text(-1.55, 1.9, "تەنها شلۆقە", dy=-5, color=RED, size=11, font="kur", rtl=True)
    g.text(1.55, 1.55, "f ′(x) > 0", color=GREEN, size=11, italic=True)
    g.text(-1.55, -1.55, "f ′(x) > 0", color=GREEN, size=11, italic=True)
    return g.svg()


# ───────────────── the eight kinds of critical point (p.3) ─────────────────
C = 1.45          # where the critical value sits, so the y-axis stays on the left


def _type_fig(draw, caption="", sub=""):
    g = Fig((-0.75, 3.75), (-0.35, 3.3), grid=False, show_ticks=False,
            axis_arrows="end", ml=24, mr=18, mt=20, mb=28)
    draw(g)
    # the kind of point and the state of f ′(c) are named in the figure caption
    g.text(C, 0, "c", dy=15, color=SOFT, size=12, italic=True)
    return g.svg()


@reg("p03_94")
def _():
    def d(g):
        g.curve(lambda x: 2.5 - 0.62 * (x - C) ** 2, dom=(C - 1.95, C + 1.95), color=INK, width=2.6)
        g.poly([(C - 1.15, 2.5), (C + 1.15, 2.5)], color="#3aa7c4", width=2.0)
        g.vseg(C, 0, 2.5)
        g.pt(C, 2.5, color=INK)
    return _type_fig(d, "لێکەوتی ئاسۆیی", "f ′(c) = 0")


@reg("p03_95")
def _():
    def d(g):
        g.curve(lambda x: 0.45 * (x - C) ** 3 + 1.55, dom=(C - 1.7, C + 1.7), color=INK, width=2.6)
        g.poly([(C - 1.0, 1.55), (C + 1.0, 1.55)], color="#3aa7c4", width=2.0)
        g.vseg(C, 0, 1.55)
        g.pt(C, 1.55, color=INK)
    return _type_fig(d, "لێکەوتی ئاسۆیی", "f ′(c) = 0")


@reg("p03_96")
def _():
    def d(g):
        g.curve(lambda x: 1.6 + 1.15 * cbrt(x - C), dom=(C - 1.85, C + 1.85), color=INK, width=2.6)
        g.poly([(C, 0.5), (C, 2.75)], color="#3aa7c4", width=2.0)
        g.pt(C, 1.6, color=INK)
    return _type_fig(d, "لێکەوتی ستوونی", "f ′(c) پێناسەنەکراوە")


@reg("p03_97")
def _():
    def d(g):
        g.curve(lambda x: 0.45 + 1.45 * abs(x - C), dom=(C - 1.75, C + 1.75), color=INK, width=2.6)
        g.pt(C, 0.45, color=INK)
    return _type_fig(d, "گۆشە (corner)", "f ′(c) پێناسەنەکراوە")


@reg("p03_100")
def _():
    def d(g):
        g.curve(lambda x: 2.9 - 2.15 * abs(x - C) ** (2 / 3.0), dom=(C - 1.95, C + 1.95),
                color=INK, width=2.6)
        g.vseg(C, 0, 2.9)
        g.pt(C, 2.9, color=INK)
    return _type_fig(d, "نوکی تیژ (cusp)", "f ′(c) پێناسەنەکراوە")


@reg("p03_98")
def _():
    def d(g):
        g.smooth([(C - 1.9, 1.5), (C - 1.2, 1.62), (C - 0.55, 1.78), (C, 1.9)], color=INK)
        g.smooth([(C, 1.62), (C + 0.65, 1.46), (C + 1.3, 1.36), (C + 1.9, 1.32)], color=INK)
        g.vseg(C, 0.95, 1.9)
        g.pt(C - 1.9, 1.5, "open"); g.pt(C, 1.9, "open")
        g.pt(C, 1.62, "open"); g.pt(C + 1.9, 1.32, "open")
        g.pt(C, 0.95, color=INK)
    return _type_fig(d, "پچڕاوە", "f ′(c) پێناسەنەکراوە")


@reg("p03_99")
def _():
    def d(g):
        f = lambda x: 0.85 * math.exp(0.52 * (x - C)) + 0.55
        g.curve(f, dom=(C - 1.9, C + 1.9), color=INK, width=2.6)
        g.vseg(C, 0.7, f(C))
        g.pt(C, f(C), "open")
        g.pt(C, 0.7, color=INK)
    return _type_fig(d, "پچڕاوە", "f ′(c) پێناسەنەکراوە")


@reg("p03_101")
def _():
    def d(g):
        g.smooth([(C - 1.9, 1.6), (C - 1.25, 1.32), (C - 0.6, 1.5), (C, 1.98)], color=INK)
        g.smooth([(C, 1.12), (C + 0.7, 1.28), (C + 1.35, 1.37), (C + 1.9, 1.42)], color=INK)
        g.vseg(C, 1.12, 1.98)
        g.pt(C - 1.9, 1.6, "open"); g.pt(C, 1.98, color=INK)
        g.pt(C, 1.12, "open"); g.pt(C + 1.9, 1.42, "open")
    return _type_fig(d, "پچڕاوە", "f ′(c) پێناسەنەکراوە")


# ═══════════════════════ 2. specific named functions ═══════════════════════
@reg("p05_140")
def _():
    g = Fig((-2.5, 2.5), (-0.7, 2.7), xstep=1, ystep=1)
    g.curve(abs, color=BLUE, width=2.8)
    g.pt(0, 0, color=BLUE)
    g.text(0, 0, "A(0 , 0)", dx=26, dy=16, color=SOFT, size=11)
    g.text(1.55, 1.95, "f (x) = |x|", color=BLUE, size=12, italic=True)
    return g.svg()


@reg("p05_142")
def _():
    g = Fig((-4.5, 4.5), (-4.5, 1.3), xstep=1, ystep=1)
    g.curve(lambda x: -abs(x), color=RED, width=2.8)
    g.pt(0, 0, color=RED)
    g.text(2.6, -1.35, "f (x) = −|x|", color=RED, size=12, italic=True)
    return g.svg()


@reg("p07_178")
def _():
    xs = [-PI / 2, PI / 2, PI, 3 * PI / 2]
    g = Fig((-PI / 2 - 0.45, 3 * PI / 2 + 0.55), (-1.75, 1.85),
            xticks=xs, yticks=[-1, 1], ystep=1,
            tick_fmt=pifmt({-PI / 2: "−π/2", PI / 2: "π/2", PI: "π", 3 * PI / 2: "3π/2"}))
    g.curve(math.sin, color=BLUE, width=2.8)
    g.pt(PI / 2, 1, color=BLUE); g.pt(3 * PI / 2, -1, color=BLUE)
    g.text(PI / 2, 1, "A(π/2 , 1)", dx=6, dy=-10, color=SOFT, size=10.5, anchor="start")
    g.text(3 * PI / 2, -1, "B(3π/2 , −1)", dx=-8, dy=17, color=SOFT, size=10.5, anchor="middle")
    g.text(PI / 2 + 0.9, 1.55, "f (x) = sin x", color=BLUE, size=11.5, italic=True, anchor="start")
    return g.svg()


@reg("p12_284")
def _():
    f = lambda x: x * x if x <= 1 else abs(x - 2)
    g = Fig((-3.3, 5.3), (-0.9, 4.5), xstep=1, ystep=1)
    g.curve(f, dom=(-2.1, 1), color=RED, width=2.8)
    g.curve(f, dom=(1, 5.0), color=RED, width=2.8)
    g.pt(0, 0, color=RED); g.pt(1, 1, color=RED); g.pt(2, 0, color=RED)
    return g.svg()


@reg("p13_304")
def _():
    g = Fig((-3.5, 3.5), (-2.3, 2.3), xstep=1, ystep=1)
    g.curve(lambda x: x * x / (x * x + 4), color=VIOLET, width=2.8)
    g.pt(0, 0, color=INK)
    g.arrow(1.5, 1.2, 0.18, 0.08, color=RED, width=1.4)
    g.text(1.55, 1.24, "ب.ک.خ", dy=-16, color=RED, size=11, font="kur", rtl=True, anchor="start")
    g.text(1.55, 1.24, "(0 , 0)", dy=-2, color=RED, size=11, anchor="start")
    return g.svg()


@reg("p13_305")
def _():
    g = Fig((-1.5, 5.5), (-1.75, 2.0), xstep=1, ystep=1)
    g.curve(lambda x: math.cos(PI * x / 4), color=VIOLET, width=2.8)
    g.pt(0, 1, color=INK); g.pt(4, -1, color=INK)
    g.arrow(1.75, 1.62, 0.2, 1.05, color=RED, width=1.4)
    g.text(1.8, 1.66, "گ.ک.خ", dy=-13, color=RED, size=11, font="kur", rtl=True, anchor="start")
    g.text(1.8, 1.66, "(0 , 1)", dy=1, color=RED, size=11, anchor="start")
    g.arrow(2.5, -1.5, 3.82, -1.08, color=RED, width=1.4)
    g.text(2.1, -1.5, "ب.ک.خ", dy=-2, color=RED, size=11, font="kur", rtl=True)
    g.text(2.1, -1.5, "(4 , −1)", dy=12, color=RED, size=11)
    return g.svg()


@reg("p13_306")
def _():
    g = Fig((-3.5, 3.5), (-1.8, 2.8), xstep=1, ystep=1)
    g.curve(lambda x: 2 - abs(x), color=VIOLET, width=2.8)
    g.pt(0, 2, color=INK)
    g.arrow(1.6, 2.5, 0.18, 2.08, color=RED, width=1.4)
    g.text(1.65, 2.54, "گ.ک.خ", dy=-13, color=RED, size=11, font="kur", rtl=True, anchor="start")
    g.text(1.65, 2.54, "(0 , 2)", dy=1, color=RED, size=11, anchor="start")
    return g.svg()


@reg("p13_307")
def _():
    g = Fig((-0.6, 6.0), (-2.3, 4.3), xstep=1, ystep=1)
    g.curve(lambda x: x * x - 6 * x + 8, color=VIOLET, width=2.8)
    g.pt(3, -1, color=INK)
    return g.svg()


@reg("p13_308")
def _():
    g = Fig((-4.7, 4.7), (-5.4, 5.4), xstep=2, ystep=2)
    g.curve(lambda x: x ** 3 / 4 - 3 * x, color=VIOLET, width=2.8)
    g.pt(-2, 4, color=INK); g.pt(2, -4, color=INK)
    return g.svg()


@reg("p13_322")
def _():
    g = Fig((-0.8, 7.4), (-1.75, 1.9), xticks=[PI, 2 * PI], yticks=[-1, 1],
            tick_fmt=pifmt({PI: "π", 2 * PI: "2π"}))
    g.curve(lambda x: math.cos(x / 2), dom=(0, 2 * PI), color=BLUE, width=2.8)
    g.pt(0, 1, "open", color=BLUE); g.pt(2 * PI, -1, "open", color=BLUE)
    return g.svg()


@reg("p17_365")
def _():
    g = Fig((-3.5, 3.5), (-5.6, 1.6), xstep=1, ystep=1)
    g.curve(lambda x: abs(x) ** (2 / 3.0) - 4, color=BLUE, width=2.8)
    g.pt(0, -4, color=INK)
    g.text(0, -4, "(0 , −4)", dx=34, dy=16, color=SOFT, size=11)
    return g.svg()


@reg("p18_373")
def _():
    g = Fig((-2.6, 13.4), (-2.6, 6.6), xstep=2, ystep=2)
    g.curve(lambda x: 5 - abs(x - 5), color=BLUE, width=2.8)
    g.pt(5, 5, color=INK)
    g.text(5, 5, "(5 , 5)", dy=-12, color=RED, size=11.5, weight="600")
    return g.svg()


# ═════════════ 3. does a local minimum exist on ]a , b[ ? (p.22) ═════════════
def _band_fig(pieces, opens, filled=(), dashes=()):
    g = Fig((-0.6, 11.2), (-0.9, 7.0), grid=False, show_ticks=False,
            axis_arrows="end", ml=26, mr=26, mt=16, mb=30)
    g.band(1, 9, 0, 6.3)
    for p in pieces:
        g.smooth(p, color=INK, width=2.5)
    for (x, y) in opens:
        g.pt(x, y, "open", color=INK)
    for (x, y) in filled:
        g.pt(x, y, color=INK)
    for (x, ya, yb) in dashes:
        g.vseg(x, ya, yb, color=DASH, width=1.5)
    g.text(1, 0, "a", dy=15, color=INK, size=12.5, italic=True)
    g.text(9, 0, "b", dy=15, color=INK, size=12.5, italic=True)
    last = pieces[-1][-1]
    g.text(last[0], last[1], "f", dx=13, dy=5, color=INK, size=13.5, italic=True)
    return g.svg()


@reg("p22_424")     # 25 — بەڵێ هەیە
def _():
    return _band_fig(
        [[(1, 4.3), (2.3, 3.4), (3.6, 2.7), (5, 2.4)],
         [(5, 2.4), (6.5, 2.9), (7.9, 3.9), (9, 4.9)]],
        opens=[(1, 4.3), (5, 2.4), (9, 4.9)], filled=[(5, 1.3)], dashes=[(5, 1.3, 2.4)])


@reg("p22_425")     # 26 — بەڵێ هەیە
def _():
    return _band_fig(
        [[(1, 4.9), (2.6, 4.5), (4.0, 3.5), (5, 1.2)],
         [(5, 1.2), (6.0, 3.5), (7.4, 4.5), (9, 4.7)]],
        opens=[(1, 4.9), (9, 4.7)], filled=[(5, 1.2)])


@reg("p22_426")     # 28 — نەخێر نییە
def _():
    return _band_fig(
        [[(1, 4.7), (3.0, 4.1), (5.0, 3.3), (7.0, 2.3), (9, 1.6)]],
        opens=[(1, 4.7), (9, 1.6)])


@reg("p22_427")     # 27 — نەخێر نییە
def _():
    return _band_fig(
        [[(1, 4.7), (2.6, 3.2), (3.8, 2.0), (5, 1.6), (6.2, 2.0), (7.4, 3.2), (9, 4.7)]],
        opens=[(1, 4.7), (5, 1.6), (9, 4.7)], filled=[(5, 3.2)], dashes=[(5, 1.6, 3.2)])


@reg("p22_428")     # 16 — بەڵێ هەیە
def _():
    return _band_fig(
        [[(1, 4.9), (2.4, 4.3), (3.6, 3.7), (4.6, 3.3)],
         [(4.6, 3.3), (6.0, 2.9), (7.5, 2.5), (9, 2.2)]],
        opens=[(1, 4.9), (4.6, 3.3), (9, 2.2)], filled=[(4.6, 1.2)], dashes=[(4.6, 1.2, 3.3)])


@reg("p22_429")     # 15 — بەڵێ هەیە
def _():
    return _band_fig(
        [[(1, 4.7), (2.6, 3.3), (3.8, 2.2), (5, 1.9), (6.2, 2.2), (7.4, 3.3), (9, 4.7)]],
        opens=[(1, 4.7), (5, 1.9), (9, 4.7)], filled=[(5, 0.9)], dashes=[(5, 0.9, 1.9)])


@reg("p22_430")     # 14 — نەخێر نییە
def _():
    return _band_fig(
        [[(1, 4.9), (2.6, 4.5), (4.0, 3.5), (5, 1.2)],
         [(5, 1.2), (6.0, 3.5), (7.4, 4.5), (9, 4.7)]],
        opens=[(1, 4.9), (5, 1.2), (9, 4.7)])


@reg("p22_431")     # 13 — نەخێر نییە
def _():
    return _band_fig(
        [[(1, 4.5), (2.2, 3.5), (3.5, 2.5), (4.7, 2.1)],
         [(4.7, 3.1), (6.2, 3.6), (7.7, 4.3), (9, 4.9)]],
        opens=[(1, 4.5), (4.7, 2.1), (9, 4.9)], filled=[(4.7, 3.1)], dashes=[(4.7, 2.1, 3.1)])


# ═══════════════════════ 4. ministry exam graphs ═══════════════════════════
@reg("p23_435")     # 2012 — max (−2,4), min (2,−4)
def _():
    g = Fig((-4.5, 4.5), (-4.9, 4.9), xstep=2, ystep=2)
    g.curve(lambda x: (x ** 3 - 12 * x) / 4.0, color=VIOLET, width=2.9)
    return g.svg()


def _cubic_pm2():
    g = Fig((-4.5, 4.5), (-3.4, 3.4), xstep=2, ystep=1)
    g.curve(lambda x: (x ** 3 - 12 * x) / 8.0, color=VIOLET, width=2.9)
    return g.svg()


@reg("p24_438")     # 2013 — f ′ = 0 at x = ∓2
def _():
    return _cubic_pm2()


@reg("p24_439")     # 2015 — f ′ < 0 on ]−2 , 2[
def _():
    return _cubic_pm2()


@reg("p24_440")     # 2017 — f ′(−1) = 0
def _():
    g = Fig((-3.3, 3.3), (-3.5, 3.5), xstep=1, ystep=1)
    g.curve(lambda x: x ** 3 - 3 * x, color=VIOLET, width=2.9)
    return g.svg()


@reg("p24_441")     # 2018 — min value −2 at x = 1
def _():
    g = Fig((-2.7, 2.7), (-3.5, 3.5), xstep=1, ystep=1)
    g.curve(lambda x: x ** 3 - 3 * x, color=RED, width=2.9)
    g.text(1.75, 2.1, "f", color=RED, size=14, italic=True)
    return g.svg()


@reg("p25_461")     # 2023 — max (1,2), min (3,−2)
def _():
    g = Fig((-0.7, 4.7), (-3.3, 3.3), xstep=1, ystep=1)
    g.curve(lambda x: x ** 3 - 6 * x * x + 9 * x - 2, color=GREEN, width=2.9)
    g.text(1.9, 2.3, "f", color=GREEN, size=14, italic=True)
    return g.svg()


# ── 2017: which graph has all its derivative values negative? (four panels) ──
def _panel(letter, f, xr=(-3.4, 3.4), yr=(-3.4, 3.4), color=VIOLET):
    g = Fig(xr, yr, xstep=1, ystep=1)
    g.curve(f, color=color, width=2.7)
    g.label(30, 26, letter, color=INK, size=13, italic=True)
    return g.svg()


@reg("p25_444a")
def _():
    return _panel("A", lambda x: -x ** 3 - 4 * x + 1)


@reg("p25_444b")
def _():
    return _panel("B", lambda x: (x - 0.5) ** 3 + 0.1)


@reg("p25_444c")
def _():
    return _panel("C", lambda x: -x * x - 1)


@reg("p25_444d")
def _():
    return _panel("D", lambda x: x ** 3 - 2)


# ────────── 2020: pick the graph of f from the graph of f ′ ──────────
@reg("p25_450")
def _():
    g = Fig((-2.3, 2.3), (-3.5, 3.5), xstep=1, ystep=1)
    g.curve(lambda x: -6 * x * x + 6 * x, color=INK, width=3.1)
    g.text(-1.35, 1.9, "f ′", color=RED, size=15, italic=True, weight="700")
    return g.svg()


def _opt(letter, f, xr, yr, ystep=1):
    g = Fig(xr, yr, xstep=1, ystep=ystep)
    g.curve(f, color=BLUE, width=2.8)
    g.label(30, 26, letter, color=INK, size=13, italic=True)
    g.text((xr[0] + xr[1]) / 2 + 0.35, yr[1] * 0.55, "f", color=RED, size=13.5, italic=True)
    return g.svg()


@reg("p25_452")
def _():
    return _opt("A", lambda x: -2 * x ** 3, (-1.4, 2.2), (-2.4, 2.4))


@reg("p25_454")
def _():
    return _opt("B", lambda x: x ** 3 + 1, (-2.3, 1.7), (-2.4, 3.4))


@reg("p25_456")
def _():
    return _opt("C", lambda x: 3 * x * x - 2 * x ** 3, (-1.2, 2.2), (-2.4, 2.4))


@reg("p25_458")
def _():
    return _opt("D", lambda x: 2 * x ** 3 - 3 * x * x + 1, (-1.2, 2.2), (-2.4, 2.4))


if __name__ == "__main__":
    import sys
    names = write_all(sys.argv[1] if len(sys.argv) > 1 else "figs/svg")
    print("wrote %d figures" % len(names))
