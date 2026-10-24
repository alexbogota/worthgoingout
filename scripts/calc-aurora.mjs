// For each aurora destination: hours of darkness (Sun more than 12 degrees below the horizon) on the 15th of each month.
// We do not publish a magnetic latitude: a simple dipole model is several degrees off in places like Scotland and Iceland.
// Writes data/aurora.json. Run: npm run calc
import * as A from 'astronomy-engine';
import { readFileSync, writeFileSync } from 'node:fs';
import { nightOf, lastDay, alt } from './lib-sun.mjs';
const cfg = JSON.parse(readFileSync(new URL('../data/aurora-places.json', import.meta.url), 'utf8'));
const lib = JSON.parse(readFileSync(new URL('../node_modules/astronomy-engine/package.json', import.meta.url), 'utf8'));
const SEASON_HOURS = 4; // a month counts as aurora season when there are at least this many dark hours
const YEAR = Number(process.env.AURORA_YEAR ?? 2027);
const darkHours = (lat, lon, month) => {
  // Sample the Sun's altitude every 5 minutes for 24 hours starting at local solar noon on the 15th.
  const obs = new A.Observer(lat, lon, 0);
  const noonUtc = Date.UTC(YEAR, month, 15, 12) - (lon / 15) * 3600000;
  let n = 0;
  for (let i = 0; i < 288; i++) {
    const t = A.MakeTime(new Date(noonUtc + i * 300000));
    const eq = A.Equator(A.Body.Sun, t, obs, true, true);
    if (A.Horizon(t, obs, eq.ra, eq.dec, 'normal').altitude < -12) n++;
  }
  return Math.round((n * 5) / 6) / 10; // hours, one decimal
};
const places = cfg.places.map((p) => {
  const dark = Array.from({ length: 12 }, (_, i) => darkHours(p.lat, p.lon, i));
  // Month pages: each month from October 2026 to December 2027. Darkness (Sun below -12 deg) on the 1st, 15th and last night.
  const detail = [];
  for (let i = 0; i < 15; i++) {
    const y = 2026 + Math.floor((9 + i) / 12), m = (9 + i) % 12;
    const n1 = nightOf(p.lat, p.lon, 0, y, m, 1, -12, 15), n15 = nightOf(p.lat, p.lon, 0, y, m, 15, -12, 15), nl = nightOf(p.lat, p.lon, 0, y, m, lastDay(y, m), -12, 15);
    // Highest the Sun gets on the 15th (below 0 means it does not rise: polar night).
    let sunMax = -90; const o = new A.Observer(p.lat, p.lon, 0);
    for (let h = 0; h < 24; h += 0.25) sunMax = Math.max(sunMax, alt(A.Body.Sun, A.MakeTime(new Date(Date.UTC(y, m, 15) + h * 3600000)), o));
    detail.push({ sunMax: Math.round(sunMax * 10) / 10, month: `${y}-${String(m + 1).padStart(2, '0')}`, darkFirst: n1.dark, darkMid: n15.dark, darkLast: nl.dark, duskMid: n15.dusk, dawnMid: n15.dawn });
  }
  return { ...p, dark, season: dark.map((h, i) => (h >= SEASON_HOURS ? i : null)).filter((i) => i !== null), detail };
});
writeFileSync(new URL('../data/aurora.json', import.meta.url), JSON.stringify({ calculatedOn: new Date().toISOString().slice(0, 10), method: `Astronomy Engine ${lib.version} (MIT licence)`, year: YEAR, darkSunBelow: -12, seasonHours: SEASON_HOURS, places }, null, 1) + '\n');
for (const p of places) console.log(p.name.padEnd(12), p.dark.join(' '), '| season', p.season.join(','));
