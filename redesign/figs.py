# -*- coding: utf-8 -*-
"""Vector figure engine for the re-typeset lesson.

Every figure is emitted as an SVG with the same 400x300 viewBox, so any row of
figures lines up at exactly the same size.  Curves are sampled from the real
functions and clipped to the plot window.
"""
import math
import os

# ---------------------------------------------------------------- palette ---
INK = "#16222e"
SOFT = "#3d4f5e"
MUTED = "#6b7c8a"
GRID = "#dde9f1"
AXIS = "#1d2b38"

BLUE = "#1f6f9c"      # main function
RED = "#b3322c"       # decreasing branch / second function
GREEN = "#1a7a52"     # increasing branch / flat
VIOLET = "#5c4a9c"    # exam graphs, derivative
BAND = "#fbe4ec"      # tinted [a,b] strip
DASH = "#c07a93"

W, H = 400.0, 300.0
SERIF = "Georgia, 'Times New Roman', serif"
KUR = "Sans, 'Noto Sans Arabic', sans-serif"


def esc(s):
    return (s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


class Fig:
    _uid = 0

    def __init__(self, xr, yr, grid=True, xstep=1, ystep=1,
                 xticks=None, yticks=None, ml=30, mr=22, mt=20, mb=28,
                 axis_arrows="both", show_ticks=True, tick_fmt=None):
        Fig._uid += 1
        self.uid = Fig._uid
        self.x0, self.x1 = xr
        self.y0, self.y1 = yr
        self.ml, self.mr, self.mt, self.mb = ml, mr, mt, mb
        self.grid, self.xstep, self.ystep = grid, xstep, ystep
        self.xticks = xticks
        self.yticks = yticks
        self.show_ticks = show_ticks
        self.axis_arrows = axis_arrows
        self.tick_fmt = tick_fmt or (lambda v: ("%g" % v).replace("-", "−"))
        self.body = []       # drawn above grid, below axes
        self.over = []       # drawn above everything

    # ---- coordinate transform ----
    @property
    def pw(self):
        return W - self.ml - self.mr

    @property
    def ph(self):
        return H - self.mt - self.mb

    def X(self, x):
        return self.ml + (x - self.x0) / (self.x1 - self.x0) * self.pw

    def Y(self, y):
        return self.mt + (self.y1 - y) / (self.y1 - self.y0) * self.ph

    def inside(self, x, y):
        return (self.x0 - 1e-9 <= x <= self.x1 + 1e-9 and
                self.y0 - 1e-9 <= y <= self.y1 + 1e-9)

    # ---- primitives ----
    def add(self, s, over=False):
        (self.over if over else self.body).append(s)

    def curve(self, f, dom=None, color=BLUE, width=2.6, n=420, dash=None,
              exclude=(), over=False, opacity=1.0):
        a, b = dom if dom else (self.x0, self.x1)
        pts, runs = [], []
        for i in range(n + 1):
            x = a + (b - a) * i / n
            if any(abs(x - e) < (b - a) / n * 1.2 for e in exclude):
                if pts:
                    runs.append(pts); pts = []
                continue
            try:
                y = f(x)
            except Exception:
                if pts:
                    runs.append(pts); pts = []
                continue
            if y is None or not math.isfinite(y):
                if pts:
                    runs.append(pts); pts = []
                continue
            pts.append((x, y))
        if pts:
            runs.append(pts)
        d = []
        for run in runs:
            # split whenever the curve leaves the window
            sub, cur = [], []
            for (x, y) in run:
                if self.y0 - 1e-9 <= y <= self.y1 + 1e-9:
                    cur.append((x, y))
                else:
                    if cur:
                        cur.append((x, min(max(y, self.y0), self.y1)))
                        sub.append(cur)
                    cur = []
            if cur:
                sub.append(cur)
            for s in sub:
                if len(s) < 2:
                    continue
                d.append("M" + " L".join("%.1f %.1f" % (self.X(x), self.Y(y)) for x, y in s))
        if not d:
            return
        da = ' stroke-dasharray="%s"' % dash if dash else ""
        op = ' opacity="%g"' % opacity if opacity != 1.0 else ""
        self.add('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" '
                 'stroke-linecap="round" stroke-linejoin="round"%s%s/>'
                 % (" ".join(d), color, width, da, op), over)

    def poly(self, pts, color=INK, width=2.6, dash=None, over=False, close=False):
        d = "M" + " L".join("%.2f %.2f" % (self.X(x), self.Y(y)) for x, y in pts)
        if close:
            d += " Z"
        da = ' stroke-dasharray="%s"' % dash if dash else ""
        self.add('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" '
                 'stroke-linecap="round" stroke-linejoin="round"%s/>' % (d, color, width, da), over)

    def smooth(self, pts, color=INK, width=2.6, over=False, tension=0.5):
        """Catmull-Rom through the given data points."""
        P = [(self.X(x), self.Y(y)) for x, y in pts]
        if len(P) < 2:
            return
        d = ["M%.2f %.2f" % P[0]]
        ext = [P[0]] + P + [P[-1]]
        for i in range(1, len(ext) - 2):
            p0, p1, p2, p3 = ext[i - 1], ext[i], ext[i + 1], ext[i + 2]
            c1 = (p1[0] + (p2[0] - p0[0]) * tension / 3, p1[1] + (p2[1] - p0[1]) * tension / 3)
            c2 = (p2[0] - (p3[0] - p1[0]) * tension / 3, p2[1] - (p3[1] - p1[1]) * tension / 3)
            d.append("C%.2f %.2f %.2f %.2f %.2f %.2f" % (c1[0], c1[1], c2[0], c2[1], p2[0], p2[1]))
        self.add('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" '
                 'stroke-linecap="round" stroke-linejoin="round"/>' % (" ".join(d), color, width), over)

    def pt(self, x, y, kind="filled", color=INK, r=4.4, over=True):
        if kind == "filled":
            self.add('<circle cx="%.2f" cy="%.2f" r="%.2f" fill="%s" stroke="#fff" stroke-width="1.6"/>'
                     % (self.X(x), self.Y(y), r, color), over)
        else:
            self.add('<circle cx="%.2f" cy="%.2f" r="%.2f" fill="#fff" stroke="%s" stroke-width="2.1"/>'
                     % (self.X(x), self.Y(y), r - 0.3, color), over)

    def vseg(self, x, ya, yb, color=DASH, width=1.5, dash="3 3", over=False):
        self.add('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="%.2f" '
                 'stroke-dasharray="%s"/>' % (self.X(x), self.Y(ya), self.X(x), self.Y(yb),
                                              color, width, dash), over)

    def hseg(self, y, xa, xb, color=DASH, width=1.5, dash="3 3", over=False):
        self.add('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="%.2f" '
                 'stroke-dasharray="%s"/>' % (self.X(xa), self.Y(y), self.X(xb), self.Y(y),
                                              color, width, dash), over)

    def band(self, xa, xb, ya=None, yb=None, fill=BAND, over=False):
        ya = self.y0 if ya is None else ya
        yb = self.y1 if yb is None else yb
        self.add('<rect x="%.2f" y="%.2f" width="%.2f" height="%.2f" fill="%s"/>'
                 % (self.X(xa), self.Y(yb), self.X(xb) - self.X(xa), self.Y(ya) - self.Y(yb), fill), over)

    def text(self, x, y, s, dx=0, dy=0, color=INK, size=12.5, anchor="middle",
             font="serif", italic=False, weight=None, rtl=False, over=True, opacity=1.0,
             halo=True):
        fam = SERIF if font == "serif" else KUR
        attrs = ' text-anchor="%s"' % anchor
        attrs += ' direction="rtl"' if rtl else ' direction="ltr"'
        if italic:
            attrs += ' font-style="italic"'
        if weight:
            attrs += ' font-weight="%s"' % weight
        if opacity != 1.0:
            attrs += ' opacity="%g"' % opacity
        if halo:
            attrs += (' stroke="#fff" stroke-width="3" paint-order="stroke"'
                      ' stroke-linejoin="round"')
        self.add('<text x="%.2f" y="%.2f" fill="%s" font-family="%s" font-size="%.1f"%s>%s</text>'
                 % (self.X(x) + dx, self.Y(y) + dy, color, fam, size, attrs, esc(s)), over)

    def label(self, px, py, s, **kw):
        """Text positioned in pixel space (px, py measured from top-left)."""
        kw.setdefault("color", INK)
        fam = SERIF if kw.get("font", "serif") == "serif" else KUR
        st = ' font-style="italic"' if kw.get("italic") else ""
        we = ' font-weight="%s"' % kw["weight"] if kw.get("weight") else ""
        di = ' direction="rtl"' if kw.get("rtl") else ""
        self.add('<text x="%.2f" y="%.2f" fill="%s" font-family="%s" font-size="%.1f" '
                 'text-anchor="%s"%s%s%s>%s</text>'
                 % (px, py, kw["color"], fam, kw.get("size", 12.5),
                    kw.get("anchor", "middle"), st, we, di, esc(s)), True)

    def arrow(self, x0, y0, x1, y1, color=RED, width=1.6, over=True):
        """Leader line with an arrowhead ending at (x1,y1) in data coords."""
        X0, Y0, X1, Y1 = self.X(x0), self.Y(y0), self.X(x1), self.Y(y1)
        ang = math.atan2(Y1 - Y0, X1 - X0)
        L, spread = 8.0, 0.42
        p1 = (X1 - L * math.cos(ang - spread), Y1 - L * math.sin(ang - spread))
        p2 = (X1 - L * math.cos(ang + spread), Y1 - L * math.sin(ang + spread))
        sx, sy = X1 - 7.0 * math.cos(ang), Y1 - 7.0 * math.sin(ang)
        self.add('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="%.2f" '
                 'stroke-linecap="round"/>' % (X0, Y0, sx, sy, color, width), over)
        self.add('<path d="M%.2f %.2f L%.2f %.2f L%.2f %.2f Z" fill="%s"/>'
                 % (X1, Y1, p1[0], p1[1], p2[0], p2[1], color), over)

    # ---- frame ----
    def _ticks(self, lo, hi, step):
        out, k = [], math.ceil(lo / step - 1e-9)
        while k * step <= hi + 1e-9:
            v = k * step
            if abs(v) > 1e-9:
                out.append(round(v, 6))
            k += 1
        return out

    def _frame(self):
        g = []
        xs = self.xticks if self.xticks is not None else self._ticks(self.x0, self.x1, self.xstep)
        ys = self.yticks if self.yticks is not None else self._ticks(self.y0, self.y1, self.ystep)
        if self.grid:
            for v in xs:
                g.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="1"/>'
                         % (self.X(v), self.mt, self.X(v), H - self.mb, GRID))
            for v in ys:
                g.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="1"/>'
                         % (self.ml, self.Y(v), W - self.mr, self.Y(v), GRID))
        # axes
        ax_y = self.Y(0) if self.y0 <= 0 <= self.y1 else H - self.mb
        ax_x = self.X(0) if self.x0 <= 0 <= self.x1 else self.ml
        head = 'marker-end="url(#ah%d)"' % self.uid
        both = self.axis_arrows == "both"
        start = 'marker-start="url(#ah%db)"' % self.uid if both else ""
        g.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="1.7" %s %s/>'
                 % (self.ml - (6 if both else 0), ax_y, W - self.mr + 8, ax_y, AXIS, head, start))
        g.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="1.7" %s %s/>'
                 % (ax_x, H - self.mb + (6 if both else 0), ax_x, self.mt - 8, AXIS, head, start))
        if self.show_ticks:
            for v in xs:
                g.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="1.4"/>'
                         % (self.X(v), ax_y - 3.5, self.X(v), ax_y + 3.5, AXIS))
                g.append('<text x="%.2f" y="%.2f" fill="%s" font-family="%s" font-size="11" '
                         'text-anchor="middle" direction="ltr" stroke="#fff" stroke-width="3" '
                         'paint-order="stroke" stroke-linejoin="round">%s</text>'
                         % (self.X(v), ax_y + 15, SOFT, SERIF, esc(self.tick_fmt(v))))
            for v in ys:
                g.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f" stroke="%s" stroke-width="1.4"/>'
                         % (ax_x - 3.5, self.Y(v), ax_x + 3.5, self.Y(v), AXIS))
                g.append('<text x="%.2f" y="%.2f" fill="%s" font-family="%s" font-size="11" '
                         'text-anchor="end" direction="ltr" stroke="#fff" stroke-width="3" '
                         'paint-order="stroke" stroke-linejoin="round">%s</text>'
                         % (ax_x - 6, self.Y(v) + 3.8, SOFT, SERIF, esc(self.tick_fmt(v))))
        # axis names
        g.append('<text x="%.2f" y="%.2f" fill="%s" font-family="%s" font-size="13" '
                 'font-style="italic" text-anchor="start" direction="ltr">x</text>' % (W - self.mr + 12, ax_y + 4, INK, SERIF))
        g.append('<text x="%.2f" y="%.2f" fill="%s" font-family="%s" font-size="13" '
                 'font-style="italic" text-anchor="middle" direction="ltr">y</text>' % (ax_x, self.mt - 12, INK, SERIF))
        return "".join(g)

    def svg(self, cls="figsvg"):
        defs = ('<defs><marker id="ah%d" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" '
                'markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="%s"/>'
                '</marker><marker id="ah%db" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6.5" '
                'markerHeight="6.5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill="%s"/>'
                '</marker><clipPath id="cp%d"><rect x="%.2f" y="%.2f" width="%.2f" height="%.2f"/></clipPath>'
                '</defs>' % (self.uid, AXIS, self.uid, AXIS, self.uid,
                             self.ml - 8, self.mt - 8, self.pw + 16, self.ph + 16))
        return ('<svg class="%s" viewBox="0 0 %g %g" xmlns="http://www.w3.org/2000/svg" '
                'role="img">%s<g clip-path="url(#cp%d)">%s</g>%s<g clip-path="url(#cp%d)">%s</g></svg>'
                % (cls, W, H, defs, self.uid, "".join(self.body), self._frame(),
                   self.uid, "".join(self.over)))


# ------------------------------------------------------------------ helpers --
FIGS = {}


def reg(name):
    def deco(fn):
        FIGS[name] = fn
        return fn
    return deco


def write_all(outdir):
    os.makedirs(outdir, exist_ok=True)
    for name, fn in FIGS.items():
        svg = fn()
        with open(os.path.join(outdir, name + ".svg"), "w", encoding="utf-8") as fh:
            fh.write(svg)
    return sorted(FIGS)
