import { chromium } from 'playwright';
import path from 'path'; import { fileURLToPath } from 'url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const b = await chromium.launch(); const p = await b.newPage();
await p.goto('file://' + path.join(dir, 'index.html'), { waitUntil: 'networkidle' });
await p.waitForFunction(() => document.documentElement.classList.contains('ready'), null, { timeout: 60000 });
console.log(await p.evaluate(() =>
  Array.from(document.querySelectorAll('h2.sec, .band, .lesson h1, .ws-head')).map(el => {
    const sh = el.closest('.sheet');
    const folio = sh ? sh.querySelector('.folio').textContent : '?';
    return folio + '  ' + el.textContent.replace(/\s+/g, ' ').trim().slice(0, 55);
  }).join('\n')));
await b.close();
