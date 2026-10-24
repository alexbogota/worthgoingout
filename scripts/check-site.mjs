// Checks the built site in dist/: every <img> has alt, every internal link and #anchor exists, every page has title, description, one h1.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
const DIST = 'dist';
const pages = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); statSync(p).isDirectory() ? walk(p) : p.endsWith('.html') && pages.push(p); } })(DIST);
const urlOf = (p) => '/' + p.slice(DIST.length + 1).replace(/index\.html$/, '').replace(/\.html$/, '');
const ids = new Map(); const htmls = new Map();
for (const p of pages) { const h = readFileSync(p, 'utf8'); htmls.set(p, h); ids.set(urlOf(p), new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]))); }
const errors = [];
for (const [p, h] of htmls) {
  const u = urlOf(p);
  if (u === '/404') continue;
  if (!/<title>[^<]{5,}/.test(h)) errors.push(`${u}: no title`);
  if (!/<meta name="description" content="[^"]{50,}/.test(h)) errors.push(`${u}: description missing or short`);
  if ((h.match(/<h1[\s>]/g) || []).length !== 1) errors.push(`${u}: needs exactly one h1`);
  for (const m of h.matchAll(/<img\b[^>]*>/g)) if (!/\salt="[^"]+"/.test(m[0])) errors.push(`${u}: img without alt`);
  for (const m of h.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    const href = m[1];
    if (/^(https?:|mailto:|tel:)/.test(href)) continue;
    const [path, hash] = href.split('#');
    const target = path === '' ? u : path;
    const file = join(DIST, target);
    const ok = ids.has(target) || existsSync(file);
    if (!ok) { errors.push(`${u}: broken link ${href}`); continue; }
    if (hash && ids.has(target) && !ids.get(target).has(hash)) errors.push(`${u}: missing anchor ${href}`);
  }
}
console.log(`${pages.length} pages checked`);
if (errors.length) { console.error([...new Set(errors)].join('\n')); process.exit(1); }
console.log('OK');
