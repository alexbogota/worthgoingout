// Finds freely licensed photos on Wikimedia Commons for each query in data/photo-queries.json, downloads them at 1600 px,
// converts to WebP and writes out/candidates.json (licence, author, source page) plus one numbered contact sheet per query.
// Runs on GitHub (the workflow "Find photos"); the result goes to the branch `photos`. Picking happens by hand in data/photos.json.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import sharp from 'sharp';

const UA = 'WorthGoingOutBot/1.0 (https://worthgoingout.com; contact@worthgoingout.com)';
const cfg = JSON.parse(readFileSync('data/photo-queries.json', 'utf8'));
const OK = /^(public domain|pd|cc0|cc by(-sa)? \d(\.\d)?)/i;
const strip = (h = '') => h.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const api = async (search) => {
  const u = new URL('https://commons.wikimedia.org/w/api.php');
  Object.entries({ action: 'query', format: 'json', generator: 'search', gsrnamespace: '6', gsrlimit: '20', gsrsearch: `${search} filetype:bitmap`,
    prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1600' }).forEach(([k, v]) => u.searchParams.set(k, v));
  const r = await fetch(u, { headers: { 'User-Agent': UA } });
  const j = await r.json();
  return Object.values(j.query?.pages ?? {}).sort((a, b) => a.index - b.index);
};
mkdirSync('out/candidates', { recursive: true });
const all = {};
for (const q of cfg.queries) {
  const seen = new Set(); const picked = [];
  for (const filter of [' incategory:Featured_pictures_on_Wikimedia_Commons', ' incategory:Quality_images', '']) {
    if (picked.length >= cfg.perQuery) break;
    let pages = [];
    try { pages = await api(q.search + filter); } catch (e) { console.log('search failed', q.id, e.message); }
    for (const p of pages) {
      if (picked.length >= cfg.perQuery || seen.has(p.title)) continue;
      const ii = p.imageinfo?.[0]; const m = ii?.extmetadata ?? {};
      const lic = strip(m.LicenseShortName?.value);
      if (!ii || !/jpeg|png/.test(ii.mime) || ii.width < 1200 || !OK.test(lic)) continue;
      seen.add(p.title);
      picked.push({ title: p.title, page: ii.descriptionurl, thumb: ii.thumburl, width: ii.width, height: ii.height,
        license: lic, licenseUrl: strip(m.LicenseUrl?.value), author: strip(m.Artist?.value).slice(0, 160), credit: strip(m.Credit?.value).slice(0, 160),
        description: strip(m.ImageDescription?.value).slice(0, 300), quality: filter.includes('Featured') ? 'featured' : filter.includes('Quality') ? 'quality' : 'other' });
    }
  }
  mkdirSync(`out/candidates/${q.id}`, { recursive: true });
  const tiles = [];
  for (const [i, c] of picked.entries()) {
    try {
      const r = await fetch(c.thumb, { headers: { 'User-Agent': UA } });
      const buf = Buffer.from(await r.arrayBuffer());
      c.file = `candidates/${q.id}/${i + 1}.webp`;
      await sharp(buf).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 78 }).toFile(`out/${c.file}`);
      const label = Buffer.from(`<svg width="400" height="260"><rect x="0" y="0" width="54" height="40" fill="#000"/><text x="12" y="30" font-size="28" font-family="sans-serif" fill="#fff">${i + 1}</text></svg>`);
      tiles.push(await sharp(buf).resize(400, 260, { fit: 'cover' }).composite([{ input: label, top: 0, left: 0 }]).png().toBuffer());
    } catch (e) { console.log('download failed', c.title, e.message); c.file = null; }
    await new Promise((r) => setTimeout(r, 300));
  }
  if (tiles.length) {
    const cols = 4, rows = Math.ceil(tiles.length / cols);
    await sharp({ create: { width: cols * 400, height: rows * 260, channels: 3, background: '#111' } })
      .composite(tiles.map((t, i) => ({ input: t, left: (i % cols) * 400, top: Math.floor(i / cols) * 260 }))).jpeg({ quality: 70 }).toFile(`out/sheet-${q.id}.jpg`);
  }
  all[q.id] = picked.filter((c) => c.file);
  console.log(q.id, all[q.id].length, 'photos');
}
writeFileSync('out/candidates.json', JSON.stringify(all, null, 1));
