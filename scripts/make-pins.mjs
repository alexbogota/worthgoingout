// Photographs each /pin/<id>/ page from the built site (dist/) at 1000x1500 and saves public/pins/<id>.jpg.
// Run after a build: npm run build && npm run pins && npm run build. Needs Playwright with Chromium (installed on this machine, not in CI).
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { createRequire } from 'node:module';
import sharp from 'sharp';
const require = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require(join(process.env.NODE_PATH ?? '/usr/local/lib/node_modules', 'playwright'))); }
const src = readFileSync('src/lib/pins.ts', 'utf8');
const ids = [...src.matchAll(/id: '([^']+)'/g)].map((m) => m[1]);
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.woff2': 'font/woff2', '.woff': 'font/woff', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const server = createServer((req, res) => {
  let p = join('dist', decodeURIComponent(req.url.split('?')[0]));
  if (existsSync(p) && statSync(p).isDirectory()) p = join(p, 'index.html');
  if (!existsSync(p)) { res.statusCode = 404; return res.end(); }
  res.setHeader('Content-Type', types[extname(p)] ?? 'application/octet-stream');
  res.end(readFileSync(p));
}).listen(4391);
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1500 } });
for (const id of ids) {
  await page.goto(`http://localhost:4391/pin/${id}/`);
  await page.evaluate(() => document.fonts.ready);
  const png = await page.screenshot({ clip: { x: 0, y: 0, width: 1000, height: 1500 } });
  await sharp(png).jpeg({ quality: 86, mozjpeg: true }).toFile(`public/pins/${id}.jpg`);
  console.log('pin', id);
}
await browser.close(); server.close();
