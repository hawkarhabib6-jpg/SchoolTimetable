# -*- coding: utf-8 -*-
"""Figures for the beginner-friendly edition (grade-10 reader)."""
import math
from figs import Fig, reg, write_all, INK, SOFT, MUTED, BLUE, RED, GREEN, VIOLET

AMBER = "#b06d12"
AMBER_BG = "#fdf4e6"


def tangent(g, f, x0, half=0.9, color=INK, width=2.0, dash=None):
    """Draw the tangent line of f at x0."""
    h = 1e-5
    m = (f(x0 + h) - f(x0 - h)) / (2 * h)
    y0 = f(x0)
    g.poly([(x0 - half, y0 - m * half), (x0 + half, y0 + m * half)],
           color=color, width=width, dash=dash)
    return m


# ───────────────────────── 1. the idea: a hill road ─────────────────────────
@reg("e_hill")
def _():
    f = lambda x: 3.1 - 0.42 * (x - 3) ** 2
    g = Fig((-0.4, 6.6), (-1.5, 4.6), grid=False, show_ticks=False,
            axis_arrows="end", ml=26, mr=22, mt=22, mb=26)
    g.curve(f, dom=(0.35, 5.65), color=GREEN, width=4.2)
    g.curve(f, dom=(3, 5.65), color=RED, width=4.2)
    g.curve(f, dom=(2.72, 3.28), color=AMBER, width=4.6)
    g.pt(3, f(3), color=AMBER, r=5.2)
    g.text(1.35, f(1.35), "سەرکەوتن", dy=-16, color=GREEN, size=12.5,
           font="kur", rtl=True, weight="600")
    g.text(4.7, f(4.7), "داهاتن", dy=-14, color=RED, size=12.5,
           font="kur", rtl=True, weight="600")
    g.text(3, f(3), "لێرە تەختە", dy=-18, color=AMBER, size=12.5,
           font="kur", rtl=True, weight="700")
    g.text(3, -0.85, "بەرزترین خاڵ", color=AMBER, size=11.5, font="kur", rtl=True)
    g.vseg(3, -0.45, f(3), color="#ddb877", dash="4 4")
    return g.svg()


# ────────────────────── 2. slope of a straight line ─────────────────────────
@reg("e_slope")
def _():
    f = lambda x: 0.75 * x + 0.6
    g = Fig((-0.6, 5.4), (-0.8, 4.6), xstep=1, ystep=1)
    g.curve(f, dom=(-0.2, 4.9), color=BLUE, width=3.0)
    x1, x2 = 1.0, 3.0
    g.poly([(x1, f(x1)), (x2, f(x1))], color=SOFT, width=2.0, dash="4 3")
    g.poly([(x2, f(x1)), (x2, f(x2))], color=SOFT, width=2.0, dash="4 3")
    g.pt(x1, f(x1), color=BLUE); g.pt(x2, f(x2), color=BLUE)
    g.text((x1 + x2) / 2, f(x1), "ڕۆیشتن = ٢", dy=17, color=SOFT, size=11,
           font="kur", rtl=True)
    g.text(x2, (f(x1) + f(x2)) / 2, "بەرزبوونەوە = ١٫٥", dx=10, color=SOFT, size=11,
           font="kur", rtl=True, anchor="start")
    return g.svg()


# ─────────────── 3. three tangents: rising, flat, falling ──────────────────
def _tan_fig(x0, color, label):
    f = lambda x: 3.1 - 0.42 * (x - 3) ** 2
    g = Fig((-0.4, 6.6), (-1.5, 4.6), grid=False, show_ticks=False,
            axis_arrows="end", ml=26, mr=22, mt=22, mb=26)
    g.curve(f, dom=(0.35, 5.65), color="#c3d1dc", width=3.4)
    tangent(g, f, x0, half=1.35, color=color, width=3.0)
    g.pt(x0, f(x0), color=color, r=5.0)
    g.text(3.1, -0.95, label, color=color, size=13, italic=True)
    return g.svg()


@reg("e_tan_up")
def _():
    return _tan_fig(1.35, GREEN, "f ′(x) > 0")


@reg("e_tan_flat")
def _():
    return _tan_fig(3.0, AMBER, "f ′(x) = 0")


@reg("e_tan_down")
def _():
    return _tan_fig(4.65, RED, "f ′(x) < 0")


# ───────────────── 4. the worked example: y = x² − 6x + 8 ──────────────────
@reg("e_para")
def _():
    f = lambda x: x * x - 6 * x + 8
    g = Fig((-0.7, 6.4), (-2.4, 4.4), xstep=1, ystep=1)
    g.curve(f, dom=(-0.4, 3), color=RED, width=3.0)
    g.curve(f, dom=(3, 6.1), color=GREEN, width=3.0)
    g.pt(3, -1, color=AMBER, r=5.2)
    g.vseg(3, -1, 0, color="#ddb877", dash="4 4")
    g.text(3, -1, "(3 , −1)", dx=14, dy=14, color=AMBER, size=11.5,
           weight="600", anchor="start")
    g.text(1.35, 1.9, "دادەبەزێت", color=RED, size=11.5, font="kur", rtl=True)
    g.text(4.85, 1.9, "بەرز دەبێتەوە", color=GREEN, size=11.5, font="kur", rtl=True)
    return g.svg()


# ─────────────────────── 5. the sign line for f ′ ──────────────────────────
@reg("e_signline")
def _():
    g = Fig((-3.2, 3.2), (-1.0, 1.0), grid=False, show_ticks=False,
            axis_arrows="both", ml=26, mr=26, mt=62, mb=76)
    g.pt(0, 0, color=AMBER, r=6.2)
    g.text(0, 0, "3", dy=26, color=AMBER, size=16, weight="700")
    g.text(-1.7, 0, "− − − − −", dy=-20, color=RED, size=19, weight="700")
    g.text(1.7, 0, "+ + + + +", dy=-20, color=GREEN, size=19, weight="700")
    g.text(-1.7, 0, "دادەبەزێت", dy=52, color=RED, size=13, font="kur", rtl=True, weight="600")
    g.text(1.7, 0, "بەرز دەبێتەوە", dy=52, color=GREEN, size=13, font="kur", rtl=True, weight="600")
    g.text(-1.7, 0, "↘", dy=78, color=RED, size=20, weight="700")
    g.text(1.7, 0, "↗", dy=78, color=GREEN, size=20, weight="700")
    g.text(0, 0, "خاڵی شلۆق", dy=-52, color=AMBER, size=13, font="kur", rtl=True, weight="700")
    return g.svg()


if __name__ == "__main__":
    import sys
    names = write_all(sys.argv[1] if len(sys.argv) > 1 else "figs/easy")
    print("wrote %d figures" % len(names))
