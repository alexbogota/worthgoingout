// Calculates the 2 Aug 2027 total solar eclipse for a list of places and writes data/eclipse-2027.json.
// Method: Astronomy Engine (MIT, Don Cross), SearchLocalSolarEclipse. See the Methodology page for how we use and check the numbers.
// Run: npm run calc
import * as A from 'astronomy-engine';
import { writeFileSync, readFileSync } from 'node:fs';

const places = JSON.parse(readFileSync(new URL('../data/eclipse-places.json', import.meta.url), 'utf8'));
const lib = JSON.parse(readFileSync(new URL('../node_modules/astronomy-engine/package.json', import.meta.url), 'utf8'));

const iso = (t) => (t ? t.time.date.toISOString() : null);
const secs = (a, b) => (a && b ? Math.round((b.time.date - a.time.date) / 100) / 10 : null);

const DIRS = ['north', 'north-north-east', 'north-east', 'east-north-east', 'east', 'east-south-east', 'south-east', 'south-south-east', 'south', 'south-south-west', 'south-west', 'west-south-west', 'west', 'west-north-west', 'north-west', 'north-north-west'];
function calc(lat, lon, elev) {
  const obs = new A.Observer(lat, lon, elev);
  const e = A.SearchLocalSolarEclipse(new Date('2027-07-30T00:00:00Z'), obs);
  if (Math.abs(e.peak.time.date - new Date('2027-08-02T10:07:00Z')) > 86400000) return null; // this place sees a later eclipse, not this one
  const eq = A.Equator(A.Body.Sun, e.peak.time, obs, true, true);
  const az = A.Horizon(e.peak.time, obs, eq.ra, eq.dec, 'normal').azimuth;
  return {
    sunAzimuthAtPeak: Math.round(az),
    sunDirectionAtPeak: DIRS[Math.round(az / 22.5) % 16],
    sunAltitudeAtStart: Math.round(e.partial_begin.altitude),
    sunAltitudeAtEnd: Math.round(e.partial_end.altitude),
    kind: e.kind === 'total' || e.kind === A.EclipseKind?.Total ? 'total' : e.kind,
    obscuration: Math.round(e.obscuration * 1000) / 1000,
    partialBegin: iso(e.partial_begin),
    totalBegin: iso(e.total_begin),
    peak: iso(e.peak),
    totalEnd: iso(e.total_end),
    partialEnd: iso(e.partial_end),
    totalitySeconds: secs(e.total_begin, e.total_end),
    sunAltitudeAtPeak: Math.round(e.peak.altitude),
  };
}

// Calibration: the library runs a constant few seconds long (a different Moon radius convention, most likely). We measure the difference at ONE
// published point (the point of greatest duration) and subtract it everywhere. Other published values are then used as an independent test.
const g = places.reference;
const check = calc(g.lat, g.lon, 0);
const offset = Math.round((check.totalitySeconds - g.publishedSeconds) * 10) / 10;
const cal = (s) => (s == null ? null : Math.round((s - offset) * 10) / 10);

const rows = places.places.map((p) => {
  const c = calc(p.lat, p.lon, p.elevation ?? 0);
  return { ...p, ...c, totalitySecondsRaw: c.totalitySeconds, totalitySeconds: cal(c.totalitySeconds) };
});
// Extra cities for the city pages. Kept only if the Sun is up at greatest eclipse and at least 1% of it is covered.
const extra = JSON.parse(readFileSync(new URL('../data/eclipse-cities.json', import.meta.url), 'utf8')).cities;
const cities = [];
for (const [slug, name, country, lat, lon, tz] of extra) {
  const c = calc(lat, lon, 0);
  if (!c || c.obscuration < 0.01 || c.sunAltitudeAtPeak <= 0) { console.log('skip', name, c ? `obsc ${c.obscuration} alt ${c.sunAltitudeAtPeak}` : 'not visible'); continue; }
  cities.push({ slug, name, country, lat, lon, elevation: 0, tz, ...c, totalitySecondsRaw: c.totalitySeconds, totalitySeconds: cal(c.totalitySeconds) });
}

const tests = places.tests.map((t) => {
  const c = calc(t.lat, t.lon, t.elevation ?? 0);
  const ours = cal(c.totalitySeconds);
  return { label: t.label, publishedSeconds: t.publishedSeconds, source: t.source, ourSeconds: ours, differenceSeconds: Math.round((ours - t.publishedSeconds) * 10) / 10 };
});

const out = {
  event: { name: 'Total solar eclipse of 2 August 2027', date: '2027-08-02' },
  calculatedOn: new Date().toISOString().slice(0, 10),
  method: `Astronomy Engine ${lib.version} (MIT licence), SearchLocalSolarEclipse`,
  calibration: {
    point: g.label,
    publishedSeconds: g.publishedSeconds,
    publishedSource: g.source,
    rawSeconds: check.totalitySeconds,
    offsetSeconds: offset,
  },
  tests,
  places: rows,
  cities,
};
writeFileSync(new URL('../data/eclipse-2027.json', import.meta.url), JSON.stringify(out, null, 1));
console.log('calibration:', out.calibration);
console.log('tests:', tests);
for (const r of [...rows, ...cities]) console.log(r.name.padEnd(16), r.country.padEnd(13), r.kind.padEnd(8), String(r.totalitySeconds ?? '-').padStart(6), 'alt', r.sunAltitudeAtPeak, 'obsc', r.obscuration);
