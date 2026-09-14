# -*- coding: utf-8 -*-
"""Markup helpers for authoring the re-typeset booklet."""

ARROW = ('<span class="tr {d}"><svg viewBox="0 0 100 100" preserveAspectRatio="none">'
         '<line x1="6" y1="{y1}" x2="94" y2="{y2}"/></svg><b class="head"></b></span>')

UP = ARROW.format(d="up", y1=94, y2=6)
DOWN = ARROW.format(d="down", y1=6, y2=94)
UND = "پێناسەنەکراوە"
ASY = "دەرکەناری ستوونی"


def _isword(v):
    return any("\u0600" <= c <= "\u06FF" for c in str(v))


def tbl(signs, crit, probes=None, dvals=None, fvals=None,
        left=r"-\infty", right=r"+\infty", flabel="f(x)", dlabel="f'(x)"):
    """Sign table.  len(signs) == len(crit) + 1.

    signs : list of '+' / '-' (one per interval)
    crit  : list of critical x-values (LaTeX, no delimiters)
    dvals : value of f' at each critical point (default '0'); use mk.UND
    fvals : value of f at each critical point ('' for blank)
    """
    n = len(signs)
    assert len(crit) == n - 1, "signs must be one more than crit"
    probes = probes or [""] * n
    dvals = dvals or ["0"] * (n - 1)
    fvals = fvals or [""] * (n - 1)

    def w(tag, cls, body):
        c = f' class="{cls}"' if cls else ""
        return f"<{tag}{c}>{body}</{tag}>"

    # probe row
    pr = ['<td class="lbl"></td>']
    for i in range(n):
        p = probes[i]
        pr.append("<td>" + (f'<span class="chip">\\({p}\\)</span>' if p else "") + "</td>")
        if i < n - 1:
            pr.append("<td></td>")

    # x row
    xr = [w("th", "lbl", r"\(x\)")]
    for i in range(n):
        lab = left if i == 0 else (right if i == n - 1 else "")
        xr.append(w("td", "edge", f"\\({lab}\\)" if lab else ""))
        if i < n - 1:
            xr.append(w("td", "crit", f"\\({crit[i]}\\)"))

    # f' row
    dr = [w("th", "lbl", f"\\({dlabel}\\)")]
    for i in range(n):
        s = signs[i]
        if s == "o":
            dr.append(w("td", "out", "✕"))
        else:
            run = " ".join([s if s == "+" else "−"] * 4)
            dr.append(w("td", "pos" if s == "+" else "neg", run))
        if i < n - 1:
            v = dvals[i]
            if _isword(v):
                dr.append(w("td", "crit und", v))
            else:
                dr.append(w("td", "crit", f"\\({v}\\)"))

    # f row
    fr = [w("th", "lbl", f"\\({flabel}\\)")]
    for i in range(n):
        if signs[i] == "o":
            fr.append(w("td", "out", "لە بواردا نییە"))
        else:
            fr.append(w("td", "", UP if signs[i] == "+" else DOWN))
        if i < n - 1:
            v = fvals[i]
            fr.append(w("td", "val", f"\\({v}\\)" if v else ""))

    rows = [
        '<tr class="pr">' + "".join(pr) + "</tr>",
        '<tr class="x">' + "".join(xr) + "</tr>",
        '<tr class="d">' + "".join(dr) + "</tr>",
        '<tr class="f">' + "".join(fr) + "</tr>",
    ]
    return '<table class="sgn">' + "".join(rows) + "</table>"


def ch(options, ok=None, cols=4):
    """Multiple-choice list.  options: list of LaTeX or HTML strings."""
    keys = "ABCD EFGH"
    cls = {2: "choices two", 3: "choices three", 4: "choices"}[cols]
    out = [f'<ul class="{cls}">']
    for i, o in enumerate(options):
        good = " class=\"ok\"" if ok is not None and i == ok else ""
        body = o if o.startswith("<") or "\\(" in o else f"\\({o}\\)"
        out.append(f'<li{good}><span class="k">{keys[i]}</span><span class="v">{body}</span></li>')
    out.append("</ul>")
    return "".join(out)


def years(*ys):
    if not ys:
        return ""
    return '<span class="years">' + "".join(
        f'<span class="year{" rep" if str(y).startswith("*") else ""}">{str(y).lstrip("*")}</span>'
        for y in ys) + "</span>"


def q(num, text, yrs=(), body="", cls=""):
    y = years(*yrs)
    n = f'<span class="qn">{num}</span>' if num else ""
    return (f'<div class="q block {cls}"><div class="h">{n}'
            f'<div class="qt">{text}</div>{y}</div>'
            f'<div class="b">{body}</div></div>')


def ex(tag, text, body):
    return (f'<div class="ex block"><div class="h"><span class="tag">{tag}</span>'
            f'<div>{text}</div></div><div class="b">{body}</div></div>')


def sol(body, lab="شیکار"):
    return f'<div class="sol"><span class="lab">{lab}</span>{body}</div>'


def res(*items):
    out = ['<div class="res">']
    for lab, val in items:
        out.append(f'<div class="it"><b>{lab}</b><span>{val}</span></div>')
    out.append("</div>")
    return "".join(out)


def steps(*lines):
    return '<div class="steps">' + "".join(f"<div>{l}</div>" for l in lines) + "</div>"


def note(kind, lab, text):
    return f'<div class="note {kind} block"><span class="lab">{lab}</span>{text}</div>'


def fig(src, cap="", cls=""):
    if not src.endswith(".png"):
        src += ".png"
    c = f"<figcaption>{cap}</figcaption>" if cap else ""
    return f'<figure class="fig {cls}"><img src="figs/{src}" alt="">{c}</figure>'


def add(chunk, path="index.html"):
    s = open(path, encoding="utf-8").read()
    s = s.replace("<!--CONTENT-END-->", chunk + "\n<!--CONTENT-END-->")
    open(path, "w", encoding="utf-8").write(s)
    print("added", len(chunk), "chars")
