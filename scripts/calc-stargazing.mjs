// For each stargazing destination, month by month: hours of full darkness (Sun 18 degrees or more below the horizon) on the 15th,
// hours in which the centre of the Milky Way is 15 degrees or more above the horizon in full darkness, and the run of nights around
// each New Moon in which the Moon is down for at least 80% of the dark hours (and at least MIN_HOURS). Writes data/stargazing.json. Run: npm run calc
import * as A from 'astronomy-engine';
import { readFileSync, writeFileSync } from 'node:fs';
const cfg = JSON.parse(readFileSync(new URL('../data/stargazing-places.json', import.meta.url), 'utf8'));
const lib = JSON.parse(readFileSync(new URL('../node_modules/astronomy-engine/package.json', import.meta.url), 'utf8'));
const FROM = new Date(process.env.FROM ?? '2026-11-01T00:00:00Z');
const MONTHS = 14, STEP = 10 * 60000, MIN_HOURS = 4, MIN_SHARE = 0.8;
const GC = { ra: 17 + 45.7 / 60, dec: -29.0 }; // centre of the Milky Way (Sagittarius A*), J2000
const alt = (body, t, obs) => { const e = A.Equator(body, t, obs, true, true); return A.Horizon(t, obs, e.ra, e.dec, 'normal').altitude; };
function night(obs, lon, y, m, d) {
  // From local solar noon on the given date to the next local solar noon.
  const start = Date.UTC(y, m, d, 12) - (lon / 15) * 3600000;
  let dark = 0, moonless = 0, core = 0;
  for (let ms = start; ms < start + 86400000; ms += STEP) {
    const t = A.MakeTime(new Date(ms));
    if (alt(A.Body.Sun, t, obs) > -18) continue;
    dark += STEP;
    if (alt(A.Body.Moon, t, obs) < 0) moonless += STEP;
    const gc = A.Horizon(t, obs, GC.ra, GC.dec, 'normal').altitude; // fixed point: precession ignored, fine at this precision
    if (gc >= 15) core += STEP;
  }
  const h = (x) => Math.round((x / 3600000) * 10) / 10;
  return { dark: h(dark), moonless: h(moonless), core: h(core) };
}
const iso = (y, m, d) => new Date(Date.UTC(y, m, d)).toISOString().slice(0, 10);
const places = cfg.places.map((p) => {
  const obs = new A.Observer(p.lat, p.lon, p.elevation);
  // Every night in the period, for the moonless windows.
  const nights = [];
  const end = new Date(Date.UTC(FROM.getUTCFullYear(), FROM.getUTCMonth() + MONTHS, 1));
  for (let d = new Date(FROM); d < end; d = new Date(d.getTime() + 86400000)) {
    const n = night(obs, p.lon, d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
    nights.push({ date: d.toISOString().slice(0, 10), ...n });
  }
  // Windows: runs of consecutive nights that are dark and (almost) moonless.
  const windows = [];
  let run = null;
  for (const n of nights) {
    if (n.moonless >= MIN_HOURS && n.moonless >= MIN_SHARE * n.dark) { run ??= { from: n.date, to: n.date, nights: 0 }; run.to = n.date; run.nights++; }
    else if (run) { windows.push(run); run = null; }
  }
  if (run) windows.push(run);
  const months = [];
  for (let i = 0; i < MONTHS; i++) {
    const y = FROM.getUTCFullYear(), m = FROM.getUTCMonth() + i;
    const mid = night(obs, p.lon, y, m, 15);
    months.push({ month: iso(y, m, 1).slice(0, 7), dark: mid.dark, core: mid.core });
  }
  return { ...p, months, windows };
});
writeFileSync(new URL('../data/stargazing.json', import.meta.url), JSON.stringify({ calculatedOn: new Date().toISOString().slice(0, 10), method: `Astronomy Engine ${lib.version} (MIT licence)`, minHours: MIN_HOURS, minShare: MIN_SHARE, places }, null, 1) + '\n');
for (const p of places) console.log(p.slug, p.months.map((m) => `${m.month.slice(5)}:${m.dark}/${m.core}`).join(' '), '\n  windows', p.windows.slice(0, 4).map((w) => `${w.from}..${w.to}(${w.nights})`).join(' '));
