// Builds public/og-image.png (1200x630) from an SVG. Run: npm run og
import sharp from 'sharp';
const rays = Array.from({ length: 48 }, (_, i) => {
  const a = (i / 48) * Math.PI * 2, r1 = 150, r2 = i % 2 ? 190 : 230;
  const x = (r) => (880 + Math.cos(a) * r).toFixed(1), y = (r) => (315 + Math.sin(a) * r).toFixed(1);
  return `<line x1="${x(r1)}" y1="${y(r1)}" x2="${x(r2)}" y2="${y(r2)}" stroke="#f4c86a" stroke-width="3" stroke-linecap="round" opacity="0.8"/>`;
}).join('');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#0f1230"/>${rays}
<circle cx="880" cy="315" r="118" fill="#f4c86a"/><circle cx="880" cy="315" r="121" fill="#070a1f"/>
<text x="70" y="250" font-family="Georgia, serif" font-size="74" fill="#ffffff">Worth Going Out</text>
<text x="70" y="330" font-family="Arial, sans-serif" font-size="34" fill="#e4e7f7">Is the eclipse or meteor shower</text>
<text x="70" y="378" font-family="Arial, sans-serif" font-size="34" fill="#e4e7f7">worth the trip? We calculate it.</text>
<text x="70" y="540" font-family="Arial, sans-serif" font-size="28" fill="#f4c86a">worthgoingout.com</text></svg>`;
await sharp(Buffer.from(svg)).png().toFile('public/og-image.png');
console.log('public/og-image.png written');
