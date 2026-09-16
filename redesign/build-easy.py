# -*- coding: utf-8 -*-
"""Inline the beginner figures into easy.html -> easy.build.html"""
import re, os, sys

src = open("easy.html", encoding="utf-8").read()
missing = []

def inject(m):
    head, name = m.group(0), m.group(1)
    p = os.path.join("figs", "easy", name + ".svg")
    if not os.path.exists(p):
        missing.append(name); return head
    return head + open(p, encoding="utf-8").read()

out, n = re.subn(r'<figure class="fig" data-fig="([A-Za-z0-9_]+)">', inject, src)
out = out.replace('<script src="easypag.js">', '<script src="easypag.js">')
open("easy.build.html", "w", encoding="utf-8").write(out)
print("inlined", n, "figures", "| missing:", missing)
