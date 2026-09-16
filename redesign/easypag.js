/* KaTeX + pagination for the beginner edition. */
(function () {
  const HEAD = { sec: "بەشی یەکەم · بەرزبوونەوە و داهاتنی نەخشە",
                 au: "بیرکاری — وەشانی ئاسان", subj: "بۆ خوێندکاری پۆلی ١٠" };

  function sheet(n) {
    const s = document.createElement("section");
    s.className = "sheet";
    s.innerHTML =
      '<header class="rh"><span>' + HEAD.sec + '</span><span class="rh-au">' + HEAD.au + "</span></header>" +
      '<div class="sheet-body"></div>' +
      '<footer class="rf"><span>' + HEAD.subj + '</span><span class="folio">' + n + "</span></footer>";
    return s;
  }

  function run() {
    const src = document.getElementById("content");
    const out = document.getElementById("book");
    const blocks = Array.from(src.children);
    let n = 0, cur = null, body = null;
    const newSheet = () => { n += 1; cur = sheet(n); out.appendChild(cur); body = cur.querySelector(".sheet-body"); };
    newSheet();
    const fits = () => body.scrollHeight <= body.clientHeight + 1;

    const place = (b, depth) => {
      body.appendChild(b);
      if (fits()) return;
      const inner = b.querySelector(":scope > .b");
      const kids = inner ? Array.from(inner.children) : [];
      if (kids.length > 1 && (depth || 0) < 12) {
        inner.replaceChildren();
        const tail = b.cloneNode(true);
        const tinner = tail.querySelector(":scope > .b");
        tinner.replaceChildren();
        let i = 0;
        for (; i < kids.length; i++) {
          inner.appendChild(kids[i]);
          if (!fits()) { inner.removeChild(kids[i]); break; }
        }
        if (i > 0) {
          for (let j = i; j < kids.length; j++) tinner.appendChild(kids[j]);
          newSheet();
          place(tail, (depth || 0) + 1);
          return;
        }
        kids.forEach((k) => inner.appendChild(k));
      }
      body.removeChild(b);
      if (body.children.length) { newSheet(); place(b, (depth || 0) + 1); }
      else body.appendChild(b);
    };

    for (const b of blocks) {
      if (b.dataset.break === "page" && body.children.length) newSheet();
      place(b, 0);
    }
    src.remove();
    document.body.dataset.pages = n;
  }

  function start() {
    if (window.renderMathInElement)
      window.renderMathInElement(document.body, {
        delimiters: [{ left: "\\(", right: "\\)", display: false },
                     { left: "\\[", right: "\\]", display: true }],
        throwOnError: false, strict: false,
      });
    document.fonts.ready.then(() => { run(); document.documentElement.classList.add("ready"); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
