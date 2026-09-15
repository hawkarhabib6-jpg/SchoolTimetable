/* ---------------------------------------------------------------------------
   index.html  →  .docx
   Re-emits the authored blocks as a native Word document:
   real text, real tables, real Word equations (OMML via pandoc), real images.
   --------------------------------------------------------------------------- */
import { chromium } from "playwright";
import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";
import {
  Document, Packer, Paragraph, TextRun, ImageRun, PageBreak,
  Table, TableRow, TableCell, TableLayoutType,
  WidthType, ShadingType, BorderStyle, AlignmentType, VerticalAlign,
  Header, Footer, PageNumber, ImportedXmlComponent, TextDirection,
} from "docx";

const DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT = process.argv[2] || path.join(DIR, "بەشی-چوارەم-تاقیکردنەوەی-داتاشراوی-یەکەم.docx");

/* ---------------------------------- tokens -------------------------------- */
const C = {
  ink: "16222E", soft: "3D4F5E", muted: "6B7C8A",
  rule: "DFE7ED", ruleS: "C3D1DC", tint: "F5F8FA",
  brand: "0E4F6E", brand600: "0B3F58", brand50: "EEF5F9",
  up: "1A7A52", up50: "EAF6F0", down: "B3322C",
  accent: "B06D12", accent50: "FDF4E6", accentB: "E3C896",
  violet: "5C4A9C", rose: "A52B4D", rose50: "FDEEF2",
  white: "FFFFFF", critBg: "FBF2F2", xBg: "F3F7EA",
};
const FONT = { ascii: "Tahoma", hAnsi: "Tahoma", cs: "Tahoma" };
const SZ = { body: 19, small: 17, tiny: 15, h1: 30, h2: 24, h3: 21, cover: 56 };

const PAGE_W = 11906, MARGIN = 1021;           // A4, 1.8 cm
const CONTENT_W = PAGE_W - MARGIN * 2;          // 9864 dxa
const DXA_PER_PX = 15;

const ARAB = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;
const isRtl = (s) => ARAB.test(s);

const noBorder = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const NO_BORDERS = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
                     insideHorizontal: noBorder, insideVertical: noBorder };
const line = (color = C.ruleS, size = 4) => ({ style: BorderStyle.SINGLE, size, color });
const cellBorders = (color = C.ruleS) => ({ top: line(color), bottom: line(color), left: line(color), right: line(color) });

/* -------------------------------- 1. read DOM ----------------------------- */
const FIGDIR = fs.mkdtempSync(path.join(os.tmpdir(), "figs-"));

async function readTree() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ deviceScaleFactor: 2 });
  // keep the raw \( … \) delimiters: block the scripts
  await page.route("**/paginate.js", (r) => r.fulfill({ body: "", contentType: "application/javascript" }));
  await page.route("**/katex.min.js", (r) => r.fulfill({ body: "", contentType: "application/javascript" }));
  await page.route("**/auto-render.min.js", (r) => r.fulfill({ body: "", contentType: "application/javascript" }));
  await page.goto("file://" + path.join(DIR, "index.html"), { waitUntil: "networkidle" });

  // tag the figures in document order and keep their markup
  const svgs = await page.evaluate(() =>
    [...document.querySelectorAll("svg.figsvg")].map((el, i) => {
      el.setAttribute("data-figidx", String(i));
      return el.outerHTML;
    }));

  const tree = await page.evaluate(() => {
    const ser = (el) => {
      const o = { tag: el.tagName.toLowerCase(), cls: [...el.classList], kids: [] };
      if (el.dataset && el.dataset.break) o.brk = el.dataset.break;
      if (o.tag === "img") { o.src = el.getAttribute("src"); o.w = el.naturalWidth; o.h = el.naturalHeight; return o; }
      if (o.tag === "svg") {
        const idx = el.getAttribute("data-figidx");
        if (idx === null) return o;
        return { tag: "img", fig: Number(idx), w: 1040, h: 780 };
      }
      if (o.tag === "script") return o;
      for (const n of el.childNodes) {
        if (n.nodeType === 3) { if (n.nodeValue.length) o.kids.push({ tag: "#text", v: n.nodeValue }); }
        else if (n.nodeType === 1) o.kids.push(ser(n));
      }
      return o;
    };
    const toc = [...document.querySelectorAll(".cover-toc li")].map((li) => ({
      n: li.children[0].textContent, t: li.children[1].textContent, p: li.children[2].textContent }));
    return { blocks: [...document.getElementById("content").children].map(ser), toc };
  });
  // render every figure on its own, at one fixed size, so the rasters all match
  const cellsHtml = svgs.map((m) => '<div class="figcell">' + m + "</div>").join("");
  const tmpPage = path.join(DIR, "_figpage.html");
  fs.writeFileSync(tmpPage,
    '<!DOCTYPE html><html dir="rtl"><head><meta charset="utf-8">' +
    '<link rel="stylesheet" href="styles.css"><style>' +
    'body{margin:0;background:#fff}' +
    '.figcell{width:520px;height:390px;background:#fff;margin:0 0 6px}' +
    '.figcell svg{width:520px;height:390px;display:block;border:none;background:#fff}' +
    "</style></head><body>" + cellsHtml + "</body></html>");
  await page.goto("file://" + tmpPage, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const cells = await page.$$(".figcell");
  for (let i = 0; i < cells.length; i++) {
    await cells[i].screenshot({ path: path.join(FIGDIR, "fig" + i + ".png") });
  }
  console.log("figures rasterised:", cells.length);
  fs.rmSync(tmpPage, { force: true });

  await browser.close();
  const fill = (n) => {
    if (n && n.tag === "img" && n.fig !== undefined) n.src = path.join(FIGDIR, "fig" + n.fig + ".png");
    (n && n.kids || []).forEach(fill);
  };
  tree.blocks.forEach(fill);
  return tree;
}

/* ------------------------------- 2. math → OMML --------------------------- */
const MATH_RE = /\\\(([\s\S]*?)\\\)/g;

function collectMath(node, set) {
  if (node.tag === "#text") { let m; MATH_RE.lastIndex = 0; while ((m = MATH_RE.exec(node.v))) set.add(m[1]); return; }
  (node.kids || []).forEach((k) => collectMath(k, set));
}

const forWord = (tex) => tex.replace(/\\tfrac/g, "\\frac");

function ommlBatch(list) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "omml-"));
  const md = list.map((s) => "$" + forWord(s).replace(/\r?\n/g, " ") + "$").join("\n\n");
  fs.writeFileSync(path.join(tmp, "m.md"), md);
  execFileSync("pandoc", ["m.md", "-o", "m.docx"], { cwd: tmp });
  execFileSync("unzip", ["-qo", "m.docx", "word/document.xml"], { cwd: tmp });
  const xml = fs.readFileSync(path.join(tmp, "word/document.xml"), "utf8");
  fs.rmSync(tmp, { recursive: true, force: true });
  const paras = xml.match(/<w:p\b[\s\S]*?<\/w:p>/g) || [];
  const out = [];
  for (const p of paras) {
    const m = p.match(/<m:oMath>[\s\S]*<\/m:oMath>/);
    if (m) out.push(m[0]);
  }
  return out;
}

function buildMathMap(blocks) {
  const set = new Set();
  blocks.forEach((b) => collectMath(b, set));
  const list = [...set];
  const map = new Map();
  let ok = 0, fail = 0;
  const batch = ommlBatch(list);
  if (batch.length === list.length) {
    list.forEach((s, i) => map.set(s, batch[i]));
    ok = list.length;
  } else {
    // batch drifted — convert individually so nothing is mis-paired
    for (const s of list) {
      try {
        const one = ommlBatch([s]);
        if (one.length === 1) { map.set(s, one[0]); ok++; } else { fail++; console.log('  unconverted:', s); }
      } catch { fail++; console.log('  unconverted:', s); }
    }
  }
  console.log(`math: ${ok} converted${fail ? `, ${fail} kept as text` : ""} (of ${list.length})`);
  return map;
}


/* Interval notation ( ]a,b[ ) is rendered as plain Unicode text: Word shows it
   fine either way, and LibreOffice cannot import reversed brackets inside OMML. */
const TEXTABLE = (tex) => /[\[\]]/.test(tex) && !/[\^_]|\\begin|\\sqrt\[|\\cases/.test(tex);

function texToText(tex) {
  let s = tex;
  s = s.replace(/\\left|\\right|\\!/g, "");
  s = s.replace(/\\[tdc]?frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2");
  s = s.replace(/\\[tdc]?frac(\d)(\d)/g, "$1/$2");
  s = s.replace(/\\sqrt\{([^{}]*)\}/g, "\u221A$1");
  s = s.replace(/\\infty/g, "\u221E").replace(/\\cup/g, "\u222A").replace(/\\cap/g, "\u2229")
       .replace(/\\pi/g, "\u03C0").replace(/\\theta/g, "\u03B8")
       .replace(/\\mathbb\{R\}/g, "\u211D")
       .replace(/\\pm/g, "\u00B1").replace(/\\mp/g, "\u2213")
       .replace(/\\notin/g, "\u2209").replace(/\\in\b/g, "\u2208")
       .replace(/\\neq/g, "\u2260").replace(/\\leq?\b/g, "\u2264").replace(/\\geq?\b/g, "\u2265")
       .replace(/\\text\{([^{}]*)\}/g, "$1")
       .replace(/\\[,;:! ]/g, " ")
       .replace(/\\\\/g, " ");
  s = s.replace(/[{}]/g, "").replace(/\\[a-zA-Z]+/g, "");
  s = s.replace(/(^|[\s(\[])-(?=[\d\u221E])/g, "$1\u2212").replace(/(\d)\s*-\s*(\d)/g, "$1 \u2212 $2");
  return s.replace(/\s+/g, " ").trim();
}

/* ------------------------------- 3. inline runs --------------------------- */
const CLS_STYLE = {
  "c-up":   { color: C.up, bold: true },
  "c-down": { color: C.down, bold: true },
  "c-key":  { color: C.violet, bold: true },
  "c-br":   { color: C.brand, bold: true },
  "c-ac":   { color: C.accent, bold: true },
  "c-mut":  { color: C.muted },
  lab:      { bold: true },
  fignum:   { bold: true, color: C.brand },
  qn:       { bold: true, color: C.brand },
  year:     { bold: true, color: C.accent, size: SZ.tiny },
  tag:      { bold: true, color: C.accent },
  k:        { bold: true, color: C.muted, size: SZ.tiny },
  en:       { color: C.muted, size: SZ.small },
};

function mkRun(text, st, mathMap) {
  return new TextRun({
    text,
    font: FONT,
    size: st.size || SZ.body,
    bold: !!st.bold,
    italics: !!st.italics,
    color: st.color || C.ink,
    rightToLeft: isRtl(text),
  });
}

function inlines(node, st, mathMap, out = []) {
  if (node.tag === "#text") {
    let last = 0, m;
    MATH_RE.lastIndex = 0;
    while ((m = MATH_RE.exec(node.v))) {
      const pre = node.v.slice(last, m.index);
      if (pre) out.push(mkRun(pre.replace(/\s+/g, " "), st, mathMap));
      const omml = mathMap.get(m[1]);
      if (TEXTABLE(m[1])) {
        const t = texToText(m[1]);
        if (t) out.push(new TextRun({ text: "\u202A" + t + "\u202C", font: FONT, size: st.size || SZ.body,
          bold: st.bold, italics: st.italics, color: st.color || C.ink, rightToLeft: false }));
      } else if (omml) out.push(ImportedXmlComponent.fromXmlString(omml));
      else if (m[1].trim()) out.push(mkRun(m[1], { ...st, italics: true }, mathMap));
      last = m.index + m[0].length;
    }
    const rest = node.v.slice(last);
    if (rest) out.push(mkRun(rest.replace(/\s+/g, " "), st, mathMap));
    return out;
  }
  if (node.tag === "img") { out.push(imageRun(node, 90)); return out; }
  if (node.tag === "br") { out.push(new TextRun({ break: 1 })); return out; }

  let s = { ...st };
  if (node.tag === "b" || node.tag === "strong") s.bold = true;
  if (node.tag === "i" || node.tag === "em") s.italics = true;
  if (node.tag === "small") s.size = SZ.small;
  for (const c of node.cls) if (CLS_STYLE[c]) s = { ...s, ...CLS_STYLE[c] };

  (node.kids || []).forEach((k) => inlines(k, s, mathMap, out));
  return out;
}

const txt = (node) => node.tag === "#text" ? node.v
  : (node.kids || []).map(txt).join("");

/* --------------------------------- images --------------------------------- */
function imageRun(node, maxWidthPx) {
  const file = path.isAbsolute(node.src) ? node.src : path.join(DIR, node.src);
  const buf = fs.readFileSync(file);
  const ratio = node.h / node.w;
  const w = Math.min(maxWidthPx, node.w);
  return new ImageRun({ data: buf, type: "png", transformation: { width: Math.round(w), height: Math.round(w * ratio) } });
}

/* ------------------------------ paragraph helpers ------------------------- */
const P = (children, opt = {}) => ({ __spec: true, children, opt });

const mkPara = (sp) => {
  const opt = sp.opt || {};
  return new Paragraph({
    children: sp.children,
    bidirectional: opt.ltr ? false : true,
    alignment: opt.align || (opt.ltr ? AlignmentType.LEFT : AlignmentType.RIGHT),
    spacing: { before: opt.before ?? 0, after: opt.after ?? 50 },
    indent: opt.indent,
    shading: opt.fill ? { type: ShadingType.CLEAR, fill: opt.fill, color: "auto" } : undefined,
    border: opt.border,
    pageBreakBefore: opt.pageBreakBefore,
    keepNext: opt.keepNext,
  });
};
const fin = (arr) => arr.map((x) => (x && x.__spec ? mkPara(x) : x));

const plain = (text, st = {}, opt = {}) => P([new TextRun({
  text, font: FONT, size: st.size || SZ.body, bold: st.bold, color: st.color || C.ink,
  italics: st.italics, rightToLeft: isRtl(text),
})], opt);

/* box: shading + borders spread across a group of paragraph specs */
function boxed(paras, { fill, accent, edge = true }) {
  const specs = paras.filter((p) => p && p.__spec && p.children && p.children.length);
  const n = specs.length;
  specs.forEach((p, i) => {
    const b = {};
    if (edge) {
      if (i === 0) b.top = line(accent || C.rule, 4);
      if (i === n - 1) b.bottom = line(accent || C.rule, 4);
      b.left = line(accent || C.rule, 4);
      b.right = { style: BorderStyle.SINGLE, size: 18, color: accent || C.brand };
    }
    p.opt = { ...p.opt, border: b };
    if (fill) p.opt.fill = fill;
  });
  return paras;
}

/* ---------------------------------- tables -------------------------------- */
function cell(children, opt = {}) {
  return new TableCell({
    children: children.length ? fin(children) : [mkPara(P([]))],
    width: { size: opt.width, type: WidthType.DXA },
    shading: opt.fill ? { type: ShadingType.CLEAR, fill: opt.fill, color: "auto" } : undefined,
    borders: opt.borders || cellBorders(),
    margins: { top: 40, bottom: 40, left: 70, right: 70 },
    verticalAlign: VerticalAlign.CENTER,
    columnSpan: opt.span,
  });
}

function table(rows, widths, opt = {}) {
  return new Table({
    rows,
    columnWidths: widths,
    width: { size: widths.reduce((a, b) => a + b, 0), type: WidthType.DXA },
    layout: TableLayoutType.FIXED,
    visuallyRightToLeft: opt.ltr ? false : true,
    borders: opt.borders,
  });
}

/* ------------------------------ sign-table arrows ------------------------- */
const arrow = (up) => P([new TextRun({
  text: up ? "↗" : "↘", font: { ascii: "Segoe UI Symbol", hAnsi: "Segoe UI Symbol", cs: "Segoe UI Symbol" },
  size: 32, bold: true, color: up ? C.up : C.down,
})], { align: AlignmentType.CENTER, after: 0, line: 240 });

/* --------------------------------- blocks --------------------------------- */
function renderBlock(node, mathMap, width = CONTENT_W, opt = {}) {
  const cls = node.cls || [];
  const has = (c) => cls.includes(c);
  const brk = node.brk === "page";
  const out = [];
  const push = (arr) => { arr.forEach((x) => out.push(x)); };

  /* ---- lesson title ---- */
  if (has("lesson")) {
    const num = node.kids.find((k) => k.cls?.includes("n"));
    const h1 = node.kids.find((k) => k.tag === "h1");
    const en = h1?.kids.find((k) => k.cls?.includes("en"));
    const title = h1 ? txt(h1).replace(txt(en || { kids: [] }), "").trim() : "";
    out.push(P([
      new TextRun({ text: txt(num) + "   ", font: FONT, size: SZ.h1, bold: true, color: C.accent }),
      new TextRun({ text: title, font: FONT, size: SZ.h1, bold: true, color: C.brand600, rightToLeft: true }),
    ], { pageBreakBefore: brk, after: 20, keepNext: true }));
    if (en) out.push(P([new TextRun({ text: txt(en).trim(), font: FONT, size: SZ.small, color: C.muted })],
      { ltr: false, after: 140, border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.brand } } }));
    return out;
  }

  /* ---- section heading ---- */
  if (node.tag === "h2" && has("sec")) {
    out.push(P([new TextRun({ text: txt(node).trim(), font: FONT, size: SZ.h2, bold: true, color: C.brand600, rightToLeft: true })],
      { pageBreakBefore: brk, before: 180, after: 90, keepNext: true,
        border: { right: { style: BorderStyle.SINGLE, size: 24, color: C.accent } }, indent: { right: 120 } }));
    return out;
  }

  /* ---- band (section banner) ---- */
  if (has("band")) {
    const en = node.kids.find((k) => k.cls?.includes("en"));
    const label = txt(node).replace(txt(en || { kids: [] }), "").trim();
    out.push(P([
      new TextRun({ text: label, font: FONT, size: SZ.h2, bold: true, color: C.white, rightToLeft: true }),
      new TextRun({ text: en ? "    " + txt(en).trim() : "", font: FONT, size: SZ.small, color: "CFE1EB" }),
    ], { pageBreakBefore: brk, fill: C.brand600, before: 60, after: 140, keepNext: true, indent: { left: 120, right: 120 } }));
    return out;
  }

  /* ---- worksheet head ---- */
  if (has("ws-head")) {
    const flds = node.kids.filter((k) => k.cls?.includes("fld"))
      .map((f) => txt(f.kids.find((x) => x.tag === "i")).trim() + ": ______________________");
    out.push(P([new TextRun({ text: flds.join("     "), font: FONT, size: SZ.body, color: C.soft, rightToLeft: true })],
      { pageBreakBefore: brk, after: 160, border: { bottom: line(C.ink, 8) } }));
    return out;
  }

  /* ---- note / task / qsub ---- */
  if (has("note") || has("task") || has("qsub")) {
    const fill = has("note") && has("warn") ? C.rose50
      : has("note") && has("key") ? C.accent50
      : has("note") && has("ok") ? C.up50
      : has("qsub") ? C.brand50 : has("task") ? C.tint : C.brand50;
    const accent = has("note") && has("warn") ? C.rose
      : has("note") && has("key") ? C.accent
      : has("note") && has("ok") ? C.up
      : has("task") ? C.accent : C.brand;
    const labNode = node.kids.find((k) => k.cls?.includes("lab"));
    const runs = [];
    if (labNode) runs.push(new TextRun({ text: txt(labNode).trim() + ": ", font: FONT, size: SZ.body, bold: true, color: accent, rightToLeft: true }));
    node.kids.filter((k) => k !== labNode).forEach((k) => inlines(k, {}, mathMap, runs));
    const p = P(runs, { pageBreakBefore: brk, before: 40, after: 100, indent: { left: 120, right: 120 } });
    push(boxed([p], { fill, accent }));
    return out;
  }

  /* ---- card ---- */
  if (has("card")) {
    const t = node.kids.find((k) => k.cls?.includes("t"));
    const paras = [];
    if (t) paras.push(P([new TextRun({ text: txt(t).trim(), font: FONT, size: SZ.h3, bold: true, color: C.brand600, rightToLeft: true })],
      { before: 50, after: 50, indent: { left: 120, right: 120 } }));
    node.kids.filter((k) => k !== t).forEach((k) => {
      renderBlock(k, mathMap, width, { inCard: true }).forEach((x) => {
        if (x && x.__spec) x.opt = { ...x.opt, indent: { left: 120, right: 120 } };
        paras.push(x);
      });
    });
    for (let i = paras.length - 1; i >= 0; i--) {
      const p = paras[i];
      if (p && p.__spec && (!p.children || !p.children.length)) paras.splice(i, 1);
    }
    const ps = paras.filter((p) => p && p.__spec);
    if (ps.length) ps[ps.length - 1].opt = { ...ps[ps.length - 1].opt, after: 80 };
    push(boxed(paras, { fill: has("tint") ? C.brand50 : undefined, accent: C.brand }));
    if (brk && paras[0] && paras[0].__spec) paras[0].opt = { ...paras[0].opt, pageBreakBefore: true };
    return out;
  }

  /* ---- worked example / exam question ---- */
  if (has("ex") || has("q")) {
    const isEx = has("ex");
    const h = node.kids.find((k) => k.cls?.includes("h"));
    const b = node.kids.find((k) => k.cls?.includes("b"));
    const runs = [];
    if (h) {
      const tag = h.kids.find((k) => k.cls?.includes("tag"));
      const qn = h.kids.find((k) => k.cls?.includes("qn"));
      const years = h.kids.find((k) => k.cls?.includes("years"));
      const qt = h.kids.find((k) => k.cls?.includes("qt"));
      const badge = tag ? txt(tag).trim() : qn ? txt(qn).trim() : "";
      if (badge) runs.push(new TextRun({ text: badge + " · ", font: FONT, size: SZ.body, bold: true,
        color: isEx ? C.accent : C.brand, rightToLeft: isRtl(badge) }));
      const titleNode = qt || h.kids.find((k) => k.tag === "div" && k !== tag && k !== qn && k !== years);
      if (titleNode) inlines(titleNode, { bold: true }, mathMap, runs);
      if (years) {
        const ys = years.kids.map((y) => txt(y).trim()).filter(Boolean);
        if (ys.length) runs.push(new TextRun({ text: "   [" + ys.join(" · ") + "]", font: FONT, size: SZ.tiny,
          bold: true, color: C.accent, rightToLeft: true }));
      }
    }
    const head = P(runs, { pageBreakBefore: brk, fill: isEx ? C.accent50 : C.tint,
      before: 100, after: 40, keepNext: true, indent: { left: 120, right: 120 },
      border: {
        top: line(isEx ? C.accentB : C.rule), bottom: line(isEx ? C.accentB : C.rule),
        left: line(isEx ? C.accentB : C.rule),
        right: { style: BorderStyle.SINGLE, size: 18, color: isEx ? C.accent : C.brand },
      } });
    out.push(head);
    if (b) b.kids.forEach((k) => push(renderBlock(k, mathMap, width)));
    out.push(P([], { after: 60 }));
    return out;
  }

  /* ---- solution wrapper ---- */
  if (has("sol")) {
    const lab = node.kids.find((k) => k.cls?.includes("lab"));
    if (lab) out.push(P([new TextRun({ text: txt(lab).trim(), font: FONT, size: SZ.small, bold: true, color: C.brand, rightToLeft: true })],
      { fill: C.brand50, after: 40, keepNext: true, indent: { left: 120, right: 120 } }));
    node.kids.filter((k) => k !== lab).forEach((k) => push(renderBlock(k, mathMap, width)));
    return out;
  }

  /* ---- results strip ---- */
  if (has("res")) {
    const parts = node.kids.filter((k) => k.cls?.includes("it"));
    const runs = [];
    parts.forEach((it, i) => {
      const lab = it.kids[0], val = it.kids[1];
      if (i) runs.push(new TextRun({ text: "     ", font: FONT, size: SZ.body }));
      runs.push(new TextRun({ text: txt(lab).trim() + " ", font: FONT, size: SZ.small, bold: true, color: C.soft, rightToLeft: true }));
      inlines(val, {}, mathMap, runs);
    });
    push(boxed([P(runs, { fill: C.tint, before: 50, after: 90, indent: { left: 120, right: 120 } })],
      { fill: C.tint, accent: C.ruleS }));
    return out;
  }

  /* ---- steps (LTR maths) ---- */
  if (has("steps")) {
    node.kids.forEach((ln) => {
      const runs = inlines(ln, {}, mathMap);
      if (runs.length) out.push(P(runs, { ltr: true, after: 20, line: 250 }));
    });
    return out;
  }
  if (has("qdrow")) {
    const runs = [];
    node.kids.forEach((qd, i) => { if (i) runs.push(new TextRun({ text: "      ", font: FONT })); inlines(qd, {}, mathMap, runs); });
    out.push(P(runs, { after: 40 }));
    return out;
  }

  /* ---- choices ---- */
  if (has("choices")) {
    const items = node.kids.filter((k) => k.tag === "li");
    const cols = has("two") ? 2 : has("three") ? 3 : 4;
    const w = Math.floor(width / cols);
    const widths = Array(cols).fill(w);
    const rows = [];
    for (let i = 0; i < items.length; i += cols) {
      const slice = items.slice(i, i + cols);
      const cells = slice.map((li) => {
        const k = li.kids.find((x) => x.cls?.includes("k"));
        const v = li.kids.find((x) => x.cls?.includes("v"));
        const ok = li.cls.includes("ok");
        const runs = [new TextRun({ text: txt(k).trim() + ")  ", font: FONT, size: SZ.small, bold: true, color: ok ? C.up : C.muted })];
        if (v) inlines(v, ok ? { bold: true } : {}, mathMap, runs);
        return cell([P(runs, { after: 0, align: AlignmentType.CENTER })],
          { width: w, fill: ok ? C.up50 : "FCFDFE", borders: cellBorders(ok ? "A9D8C1" : C.rule) });
      });
      while (cells.length < cols) cells.push(cell([], { width: w, borders: cellBorders(C.rule) }));
      rows.push(new TableRow({ children: cells }));
    }
    out.push(table(rows, widths));
    out.push(P([], { after: 60 }));
    return out;
  }

  /* ---- sign table ---- */
  if (node.tag === "table" && has("sgn")) {
    const trs = [];
    (function grab(n) { (n.kids || []).forEach((k) => { if (k.tag === "tr") trs.push(k); else grab(k); }); })(node);
    const body = trs.filter((t) => !t.cls.includes("pr"));
    const probe = trs.find((t) => t.cls.includes("pr"));
    const nCols = body[0].kids.filter((k) => k.tag === "td" || k.tag === "th").length;
    const lblW = Math.floor(width * 0.14);
    const rest = Math.floor((width - lblW) / (nCols - 1));
    const widths = [lblW, ...Array(nCols - 1).fill(rest)];
    const rows = [];

    if (probe) {
      const cells = probe.kids.filter((k) => k.tag === "td" || k.tag === "th").map((c, i) => {
        const runs = c.kids.length ? inlines(c, { size: SZ.tiny, bold: true, color: C.brand }, mathMap) : [];
        return cell([P(runs, { align: AlignmentType.CENTER, after: 0 })],
          { width: widths[i], borders: NO_BORDERS, fill: undefined });
      });
      rows.push(new TableRow({ children: cells }));
    }
    body.forEach((tr) => {
      const kind = tr.cls.includes("x") ? "x" : tr.cls.includes("d") ? "d" : "f";
      const cells = tr.kids.filter((k) => k.tag === "td" || k.tag === "th").map((c, i) => {
        const isLbl = c.cls.includes("lbl");
        const isCrit = c.cls.includes("crit");
        const isOut = c.cls.includes("out");
        let fill = isLbl ? (kind === "x" ? "EAF1D9" : C.brand50) : kind === "x" ? C.xBg : C.white;
        if (isCrit) fill = kind === "x" ? C.critBg : C.white;
        if (c.cls.includes("val")) fill = "FBFBFB";
        if (isOut) fill = "FBF4F4";
        let content;
        const trSpan = (c.kids || []).find((k) => k.cls && k.cls.includes("tr"));
        if (kind === "f" && trSpan) {
          content = [arrow(trSpan.cls.includes("up"))];
        } else {
          const st = isCrit ? { bold: true, color: C.down }
            : c.cls.includes("pos") ? { bold: true, color: C.up }
            : c.cls.includes("neg") ? { bold: true, color: C.down }
            : c.cls.includes("und") ? { size: SZ.tiny, color: C.violet, bold: true }
            : isOut ? { color: C.down, bold: true, size: SZ.small }
            : isLbl ? { bold: true, color: C.brand600 } : { color: C.soft };
          content = [P(inlines(c, st, mathMap), { align: AlignmentType.CENTER, after: 0 })];
        }
        return cell(content, { width: widths[i], fill, borders: cellBorders(C.ruleS) });
      });
      rows.push(new TableRow({ children: cells }));
    });
    out.push(table(rows, widths));
    out.push(P([], { after: 80 }));
    return out;
  }

  /* ---- reference table (trig) ---- */
  if (node.tag === "table" && has("ref")) {
    const trs = [];
    const collect = (n) => { (n.kids || []).forEach((k) => { if (k.tag === "tr") trs.push(k); else collect(k); }); };
    collect(node);
    const nCols = Math.max(...trs.map((t) => t.kids.filter((k) => /^t[dh]$/.test(k.tag)).length));
    const w = Math.floor(width / nCols);
    const widths = Array(nCols).fill(w);
    const rows = trs.map((tr) => new TableRow({
      children: tr.kids.filter((k) => /^t[dh]$/.test(k.tag)).map((c, i) =>
        cell([P(inlines(c, c.tag === "th" ? { bold: true, color: C.brand600 } : {}, mathMap),
          { align: AlignmentType.CENTER, after: 0 })],
          { width: w, fill: c.tag === "th" ? C.brand50 : C.white, borders: cellBorders(C.ruleS) })),
    }));
    out.push(table(rows, widths, { ltr: true }));
    out.push(P([], { after: 80 }));
    return out;
  }

  /* ---- quadrant grid ---- */
  if (has("quad")) {
    const cells = node.kids.filter((k) => k.cls?.includes("cell"));
    const w = Math.floor(width / 2);
    const rows = [];
    for (let i = 0; i < cells.length; i += 2) {
      rows.push(new TableRow({ children: cells.slice(i, i + 2).map((c) => {
        const qn = c.kids.find((k) => k.cls?.includes("qn"));
        const ref = c.kids.find((k) => k.cls?.includes("ref"));
        const sg = c.kids.find((k) => k.cls?.includes("sg"));
        const ps = [P([new TextRun({ text: txt(qn).trim(), font: FONT, size: SZ.small, bold: true, color: C.brand, rightToLeft: true })],
          { align: AlignmentType.CENTER, after: 20 })];
        if (ref) ps.push(P(inlines(ref, { bold: true, color: C.violet }, mathMap), { align: AlignmentType.CENTER, after: 20 }));
        if (sg) {
          const runs = [];
          sg.kids.forEach((it, i2) => { if (i2) runs.push(new TextRun({ text: "    ", font: FONT })); inlines(it, {}, mathMap, runs); });
          ps.push(P(runs, { align: AlignmentType.CENTER, after: 0, ltr: true }));
        }
        return cell(ps, { width: w, fill: C.white, borders: cellBorders(C.rule) });
      }) }));
    }
    out.push(table(rows, [w, w]));
    out.push(P([], { after: 80 }));
    return out;
  }

  /* ---- sign-change patterns ---- */
  if (has("signrow")) {
    const srs = node.kids.filter((k) => k.cls?.includes("sr"));
    const w = Math.floor(width / 2);
    const rows = [];
    for (let i = 0; i < srs.length; i += 2) {
      rows.push(new TableRow({ children: srs.slice(i, i + 2).map((sr) => {
        const l = sr.kids.find((k) => k.cls?.includes("sr-line"));
        const c2 = sr.kids.find((k) => k.cls?.includes("sr-cap"));
        const ps = [];
        if (l) {
          const runs = [];
          l.kids.forEach((k) => {
            const st = k.cls?.includes("pos") ? { bold: true, color: C.up }
              : k.cls?.includes("neg") ? { bold: true, color: C.down }
              : k.cls?.includes("cv") ? { bold: true, italics: true } : {};
            inlines(k, st, mathMap, runs);
            runs.push(new TextRun({ text: "  ", font: FONT }));
          });
          ps.push(P(runs, { ltr: true, align: AlignmentType.CENTER, after: 20 }));
        }
        if (c2) ps.push(P(inlines(c2, { size: SZ.small, color: C.soft }, mathMap), { align: AlignmentType.CENTER, after: 0 }));
        return cell(ps, { width: w, borders: NO_BORDERS });
      }) }));
    }
    out.push(table(rows, [w, w]));
    out.push(P([], { after: 60 }));
    return out;
  }

  /* ---- worksheet item grid ---- */
  if (has("items")) {
    const its = node.kids.filter((k) => k.cls?.includes("item"));
    const cols = has("g4") ? 4 : 2;
    const w = Math.floor(width / cols);
    const rows = [];
    for (let i = 0; i < its.length; i += cols) {
      rows.push(new TableRow({ children: its.slice(i, i + cols).map((it) => {
        const n = it.kids.find((k) => k.cls?.includes("n"));
        const runs = [new TextRun({ text: txt(n).trim() + ")  ", font: FONT, size: SZ.small, bold: true, color: C.brand })];
        it.kids.filter((k) => k !== n).forEach((k) => inlines(k, {}, mathMap, runs));
        return cell([P(runs, { ltr: true, after: 0 })], { width: w, borders: NO_BORDERS });
      }) }));
    }
    out.push(table(rows, Array(cols).fill(w)));
    out.push(P([], { after: 80 }));
    return out;
  }

  /* ---- figure ---- */
  if (node.tag === "figure") {
    const img = node.kids.find((k) => k.tag === "img");
    const cap = node.kids.find((k) => k.tag === "figcaption");
    const px = Math.floor((width / DXA_PER_PX) * 0.94);
    if (img) out.push(P([imageRun(img, Math.min(px, opt.figMax || px))], { align: AlignmentType.CENTER, after: 30 }));
    if (cap) out.push(P(inlines(cap, { size: SZ.small, color: C.muted }, mathMap), { align: AlignmentType.CENTER, after: 60 }));
    return out;
  }

  /* ---- tree diagram ---- */
  if (has("tree")) {
    const nodes = [];
    const walk = (n, depth) => {
      if (n.cls?.includes("node")) { nodes.push({ text: txt(n).trim(), root: n.cls.includes("root"), leaf: n.cls.includes("g"), depth }); return; }
      (n.kids || []).forEach((k) => walk(k, depth + (k.cls?.includes("lvl") ? 1 : 0)));
    };
    walk(node, 0);
    nodes.forEach((n) => {
      out.push(P([new TextRun({ text: (n.root ? "" : n.leaf ? "– " : "• ") + n.text, font: FONT,
        size: n.root ? SZ.body : SZ.small, bold: n.root, color: n.root ? C.white : n.leaf ? C.up : C.brand600, rightToLeft: true })],
        { fill: n.root ? C.brand600 : n.leaf ? C.up50 : C.brand50, after: 30,
          indent: { right: n.root ? 0 : n.leaf ? 700 : 300, left: 120 },
          align: n.root ? AlignmentType.CENTER : AlignmentType.RIGHT }));
    });
    out.push(P([], { after: 60 }));
    return out;
  }

  /* ---- lists ---- */
  if (node.tag === "ol" || node.tag === "ul") {
    const items = node.kids.filter((k) => k.tag === "li");
    items.forEach((li, i) => {
      const marker = node.tag === "ol" ? `${i + 1}.  ` : "•  ";
      const runs = [new TextRun({ text: marker, font: FONT, size: SZ.body, bold: true,
        color: node.cls.includes("alt") ? C.accent : C.brand })];
      inlines(li, {}, mathMap, runs);
      out.push(P(runs, { after: 30, indent: { right: 200 } }));
    });
    return out;
  }

  /* ---- column groups ---- */
  if (has("cols2") || has("cols3") || has("cols4") || has("row") || has("fgrid-lead")) {
    const kids = (node.kids || []).filter((k) => k.tag !== "#text" || k.v.trim());
    const cols = has("cols4") ? 4 : has("cols3") ? 3 : has("row") ? 2 : has("fgrid-lead") ? 1 : 2;
    const heavy = kids.some((k) => k.cls?.some((c) => ["q", "ex", "card"].includes(c)));
    if (heavy || kids.length === 0) {                       // stack instead of side-by-side
      kids.forEach((k) => push(renderBlock(k, mathMap, width)));
      return out;
    }
    if (has("fgrid-lead")) {                       // single lead figure: keep it modest
      kids.forEach((k) => push(renderBlock(k, mathMap, Math.floor(width * 0.5))));
      return out;
    }
    const isRow = has("row");
    const ws = isRow ? [Math.floor(width * 0.62), Math.floor(width * 0.38)]
      : Array(Math.min(cols, kids.length)).fill(Math.floor(width / Math.min(cols, kids.length)));
    const cells = kids.slice(0, ws.length).map((k, i) =>
      cell(renderBlock(k, mathMap, ws[i] - 200), { width: ws[i], borders: NO_BORDERS }));
    while (cells.length < ws.length) cells.push(cell([], { width: ws[cells.length], borders: NO_BORDERS }));
    out.push(table([new TableRow({ children: cells })], ws));
    // extra rows for figure grids with more items than columns
    for (let i = ws.length; i < kids.length; i += ws.length) {
      const more = kids.slice(i, i + ws.length).map((k, j) =>
        cell(renderBlock(k, mathMap, ws[j] - 200), { width: ws[j], borders: NO_BORDERS }));
      while (more.length < ws.length) more.push(cell([], { width: ws[more.length], borders: NO_BORDERS }));
      out.push(table([new TableRow({ children: more })], ws));
    }
    out.push(P([], { after: 60 }));
    return out;
  }

  /* ---- generic container / paragraph ---- */
  const blockKids = (node.kids || []).filter((k) =>
    k.tag === "div" || k.tag === "ul" || k.tag === "ol" || k.tag === "table" || k.tag === "figure");
  if (blockKids.length) {
    (node.kids || []).forEach((k) => {
      if (k.tag === "#text" && !k.v.trim()) return;
      if (blockKids.includes(k)) push(renderBlock(k, mathMap, width));
      else { const r = inlines(k, {}, mathMap); if (r.length) out.push(P(r, { after: 40 })); }
    });
    return out;
  }
  const runs = inlines(node, {}, mathMap);
  if (runs.length) out.push(P(runs, { pageBreakBefore: brk, after: 50 }));
  return out;
}

/* ---------------------------------- cover --------------------------------- */
function cover(toc) {
  const el = [];
  el.push(P([new TextRun({ text: "بیرکاری — پۆلی ١٢ی زانستی", font: FONT, size: 22, color: C.muted, rightToLeft: true })],
    { align: AlignmentType.CENTER, before: 1400, after: 200 }));
  el.push(P([new TextRun({ text: "   4 – 1   ", font: FONT, size: 40, bold: true, color: C.white,
    shading: { type: ShadingType.CLEAR, fill: C.accent, color: "auto" } })],
    { align: AlignmentType.CENTER, after: 260, ltr: true }));
  el.push(P([new TextRun({ text: "تاقیکردنەوەی داتاشراوی یەکەم", font: FONT, size: SZ.cover, bold: true, color: C.brand600, rightToLeft: true })],
    { align: AlignmentType.CENTER, after: 120 }));
  el.push(P([new TextRun({ text: "First Derivative Test", font: { ascii: "Georgia", hAnsi: "Georgia" }, size: 28, color: C.muted })],
    { align: AlignmentType.CENTER, after: 500 }));

  const w1 = Math.floor(CONTENT_W * 0.1), w3 = Math.floor(CONTENT_W * 0.1);
  const w2 = CONTENT_W - w1 - w3;
  const rows = toc.map((t) => new TableRow({ children: [
    cell([P([new TextRun({ text: t.n, font: FONT, size: SZ.small, bold: true, color: C.brand, rightToLeft: true })],
      { align: AlignmentType.CENTER, after: 0 })], { width: w1, fill: C.brand50, borders: { top: noBorder, left: noBorder, right: noBorder, bottom: line(C.rule, 2) } }),
    cell([P([new TextRun({ text: t.t, font: FONT, size: SZ.body, color: C.ink, rightToLeft: true })], { after: 0 })],
      { width: w2, borders: { top: noBorder, left: noBorder, right: noBorder, bottom: line(C.rule, 2) } }),
    cell([P([new TextRun({ text: t.p, font: FONT, size: SZ.small, color: C.muted })],
      { align: AlignmentType.CENTER, after: 0 })], { width: w3, borders: { top: noBorder, left: noBorder, right: noBorder, bottom: line(C.rule, 2) } }),
  ] }));
  el.push(table(rows, [w1, w2, w3]));

  el.push(P([new TextRun({ text: "ئامادەکردن و ڕێکخستن: ", font: FONT, size: SZ.small, color: C.muted, rightToLeft: true }),
             new TextRun({ text: "م. عبدالله حمید", font: FONT, size: SZ.body, bold: true, color: C.brand600, rightToLeft: true }),
             new TextRun({ text: "      پێداچوونەوە: ", font: FONT, size: SZ.small, color: C.muted, rightToLeft: true }),
             new TextRun({ text: "ئـا. ئیبراهیم ئەحمەد", font: FONT, size: SZ.body, bold: true, color: C.brand600, rightToLeft: true })],
    { align: AlignmentType.CENTER, before: 600, after: 0 }));
  el.push(P([new PageBreak()]));
  return el;
}

/* ---------------------------------- main ---------------------------------- */
const { blocks, toc } = await readTree();
const mathMap = buildMathMap(blocks);

const children = cover(toc);
for (const b of blocks) renderBlock(b, mathMap).forEach((x) => children.push(x));

const hdr = new Header({ children: fin([P([
  new TextRun({ text: "بەشی چوارەم · تاقیکردنەوەی داتاشراوی یەکەم", font: FONT, size: SZ.tiny, bold: true, color: C.brand600, rightToLeft: true }),
  new TextRun({ text: "\tم. عبدالله حمید · ئـا. ئیبراهیم ئەحمەد", font: FONT, size: SZ.tiny, color: C.muted, rightToLeft: true }),
], { after: 0, border: { bottom: line(C.brand, 6) } })]) });

const ftr = new Footer({ children: fin([P([
  new TextRun({ text: "بیرکاری — ١٢ی زانستی", font: FONT, size: SZ.tiny, color: C.muted, rightToLeft: true }),
  new TextRun({ text: "\t", font: FONT }),
  new TextRun({ children: [PageNumber.CURRENT], font: FONT, size: SZ.tiny, bold: true, color: C.brand }),
], { after: 0, border: { top: line(C.rule, 4) } })]) });

const doc = new Document({
  creator: "م. عبدالله حمید",
  title: "بەشی چوارەم — تاقیکردنەوەی داتاشراوی یەکەم",
  description: "First Derivative Test — re-typeset edition",
  styles: { default: { document: { run: { font: FONT, size: SZ.body, color: C.ink } } } },
  sections: [{
    properties: {
      page: { size: { width: PAGE_W, height: 16838 },
              margin: { top: 1000, bottom: 900, left: MARGIN, right: MARGIN, header: 560, footer: 480 } },
      bidi: true,
    },
    headers: { default: hdr },
    footers: { default: ftr },
    children: fin(children),
  }],
});

fs.writeFileSync(OUT, await Packer.toBuffer(doc));
console.log("wrote", OUT, "(" + (fs.statSync(OUT).size / 1024 / 1024).toFixed(1) + " MB)");
