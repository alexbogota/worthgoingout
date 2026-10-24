// Tells Bing, Yandex and other IndexNow search engines which pages changed since the last deploy.
// Compares a hash of each built page with the hashes saved last time (.indexnow/hashes.json, kept by actions/cache).
// The key file public/<key>.txt is public on purpose: that is how IndexNow checks the site is ours.
import { readdirSync, readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
const HOST = 'worthgoingout.com';
const keyFile = readdirSync('public').find((f) => /^[0-9a-f]{32}\.txt$/.test(f));
if (!keyFile) { console.log('No IndexNow key file in public/'); process.exit(0); }
const key = keyFile.slice(0, -4);
const pages = [];
(function walk(d) { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (f === 'index.html') pages.push(p); } })('dist');
const sitemapUrls = new Set([...readFileSync('dist/sitemap-0.xml', 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]));
const hashes = {};
for (const p of pages) {
  const url = `https://${HOST}/${p.slice(5).replace(/index\.html$/, '')}`;
  if (!sitemapUrls.has(url)) continue; // only pages we want indexed
  // Ignore the parts that change every day without new content (day counts, build dates).
  const html = readFileSync(p, 'utf8').replace(/<strong id="days">\d+<\/strong>/g, '').replace(/\d+ days to go/g, '');
  hashes[url] = createHash('sha1').update(html).digest('hex');
}
const store = '.indexnow/hashes-v2.json'; // v2: the first send was refused, so start again
const old = existsSync(store) ? JSON.parse(readFileSync(store, 'utf8')) : null;
const changed = Object.keys(hashes).filter((u) => !old || old[u] !== hashes[u]);
mkdirSync('.indexnow', { recursive: true });
if (!changed.length) { writeFileSync(store, JSON.stringify(hashes)); console.log('IndexNow: no changed pages'); process.exit(0); }
// The search engine fetches the key file from the live site; check it is there first.
const kf = await fetch(`https://${HOST}/${keyFile}`).then(async (r) => ({ status: r.status, text: (await r.text()).trim() })).catch((e) => ({ status: 0, text: String(e) }));
console.log(`key file on the site: HTTP ${kf.status}, ${kf.text === key ? 'matches' : 'DOES NOT match'}`);
const body = { host: HOST, key, keyLocation: `https://${HOST}/${keyFile}`, urlList: changed.slice(0, 10000) };
const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) });
console.log(`IndexNow: sent ${changed.length} changed page(s), answer ${r.status}`);
// Remember the pages only when the search engines accepted them, so a failed send is retried next time.
if (r.status === 200 || r.status === 202) writeFileSync(store, JSON.stringify(hashes));
else console.log(await r.text().catch(() => ''));
console.log(`::notice title=IndexNow::sent ${changed.length} changed page(s), answer ${r.status} (key file HTTP ${kf.status}, ${kf.text === key ? 'matches' : 'does not match'})`);
