// Copies the photos chosen in data/photos.json from the candidates folder (branch photos, extracted to $PHOTOS_DIR)
// into public/photos as <id>-1600.webp, <id>-800.webp and a 1200x630 <id>-og.jpg for social cards, and records their sizes in data/photos.json.
import sharp from 'sharp';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
const dir = process.env.PHOTOS_DIR ?? 'out';
const data = JSON.parse(readFileSync('data/photos.json', 'utf8'));
for (const [id, p] of Object.entries(data.photos)) {
  const big = `public/photos/${id}-1600.webp`;
  if (!existsSync(big)) {
    const src = `${dir}/${p.from}`;
    await sharp(src).resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 76 }).toFile(big);
    await sharp(src).resize({ width: 800 }).webp({ quality: 74 }).toFile(`public/photos/${id}-800.webp`);
  }
  const og = `public/photos/${id}-og.jpg`;
  if (!existsSync(og)) await sharp(big).resize(1200, 630, { fit: 'cover', position: 'attention' }).jpeg({ quality: 82, mozjpeg: true }).toFile(og);
  const m = await sharp(big).metadata();
  p.width = m.width; p.height = m.height;
}
writeFileSync('data/photos.json', JSON.stringify(data, null, 1) + '\n');
console.log(Object.keys(data.photos).length, 'photos placed');
