import { chromium } from 'playwright';
import { fileURLToPath } from 'url';
import path from 'path';

const dir = path.dirname(fileURLToPath(import.meta.url));
const out = process.argv[2] || path.join(dir, 'بەشی-چوارەم-تاقیکردنەوەی-داتاشراوی-یەکەم.pdf');

const browser = await chromium.launch({ args: ['--font-render-hinting=none'] });
const page = await browser.newPage();
page.on('console', (m) => { if (m.type() === 'error') console.log('page error:', m.text()); });
const IN = process.argv[3] || 'index.html';
await page.goto('file://' + path.join(dir, IN), { waitUntil: 'networkidle' });
await page.waitForFunction(() => document.documentElement.classList.contains('ready'), null, { timeout: 60000 });
const pages = await page.evaluate(() => document.body.dataset.pages);
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
console.log('content sheets:', pages, '->', out);
await browser.close();
