// Every solar and lunar eclipse from now to the end of 2030, and what ~47 world cities see of each. Writes data/eclipses.json.
// Method: Astronomy Engine. Solar: SearchGlobalSolarEclipse, then SearchLocalSolarEclipse per city (Sun must be up at the peak).
// Lunar: SearchLunarEclipse, then the Moon's altitude at mid-eclipse per city. Run: npm run calc
import * as A from 'astronomy-engine';
import { writeFileSync, readFileSync } from 'node:fs';
const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const lib = read('../node_modules/astronomy-engine/package.json');
const cities = read('../data/world-cities.json').cities.map(([slug, name, country, lat, lon, tz, region]) => ({ slug, name, country, lat, lon, tz, region }));
const START = new Date(process.env.FROM ?? '2026-10-24T00:00:00Z');
const END = new Date('2031-01-01T00:00:00Z');
const r1 = (x) => Math.round(x * 10) / 10;
const solar = [];
for (let s = A.SearchGlobalSolarEclipse(START); s.peak.date < END; s = A.NextGlobalSolarEclipse(s.peak)) {
  const peak = s.peak.date;
  const seen = [];
  for (const c of cities) {
    const from = new Date(peak.getTime() - 2 * 86400000);
    const e = A.SearchLocalSolarEclipse(from, new A.Observer(c.lat, c.lon, 0));
    if (Math.abs(e.peak.time.date - peak) > 86400000) continue; // the city's next eclipse is a different one
    if (e.peak.altitude <= 0) continue; // Sun below the horizon at the city's peak
    const dur = e.total_begin && e.total_end ? (e.total_end.time.date - e.total_begin.time.date) / 1000 : null;
    seen.push({ city: c.slug, kind: e.kind, obscuration: Math.round(e.obscuration * 1000) / 1000, peak: e.peak.time.date.toISOString(), sunAltitude: Math.round(e.peak.altitude), centralSeconds: dur && Math.round(dur) });
  }
  solar.push({ date: peak.toISOString().slice(0, 10), peak: peak.toISOString(), kind: s.kind, centre: s.latitude == null ? null : { lat: r1(s.latitude), lon: r1(s.longitude) }, cities: seen.sort((a, b) => b.obscuration - a.obscuration) });
}
const lunar = [];
for (let l = A.SearchLunarEclipse(START); l.peak.date < END; l = A.NextLunarEclipse(l.peak)) {
  const seen = [];
  for (const c of cities) {
    const eq = A.Equator(A.Body.Moon, l.peak, new A.Observer(c.lat, c.lon, 0), true, true);
    const alt = A.Horizon(l.peak, new A.Observer(c.lat, c.lon, 0), eq.ra, eq.dec, 'normal').altitude;
    if (alt > 0) seen.push({ city: c.slug, moonAltitude: Math.round(alt) });
  }
  lunar.push({ date: l.peak.date.toISOString().slice(0, 10), peak: l.peak.date.toISOString(), kind: l.kind, totalMinutes: l.sd_total ? Math.round(2 * l.sd_total) : 0, partialMinutes: l.sd_partial ? Math.round(2 * l.sd_partial) : 0, cities: seen.sort((a, b) => b.moonAltitude - a.moonAltitude) });
}
// Independent checks against published figures (not used to tune anything).
const tests = read('../data/eclipse-list-tests.json').tests.map((t) => {
  const e = solar.find((x) => x.date === t.date)?.cities.find((c) => c.city === t.city);
  const ours = e?.centralSeconds ?? null;
  return { ...t, ourSeconds: ours, differenceSeconds: ours == null ? null : ours - t.publishedSeconds };
});
const lunarTests = read('../data/eclipse-list-tests.json').lunar.map((t) => {
  const e = lunar.find((x) => x.date === t.date);
  return { ...t, ourMinutes: e?.totalMinutes ?? null, differenceMinutes: e ? e.totalMinutes - t.publishedMinutes : null };
});
const out = { calculatedOn: new Date().toISOString().slice(0, 10), method: `Astronomy Engine ${lib.version} (MIT licence)`, cities, solar, lunar, tests, lunarTests };
writeFileSync(new URL('../data/eclipses.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(tests, lunarTests);
for (const s of solar) console.log('SOLAR', s.date, s.kind, s.cities.filter((c) => c.kind !== 'partial').map((c) => `${c.city}:${c.kind}:${c.centralSeconds}s`).join(' '), '| partial in', s.cities.length);
for (const l of lunar) console.log('LUNAR', l.date, l.kind, l.totalMinutes, 'min total | seen in', l.cities.length, l.cities.slice(0, 6).map((c) => c.city).join(','));
