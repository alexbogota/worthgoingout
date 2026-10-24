// Moon phases and the Moon's light on the peak night of each meteor shower. Writes data/sky-calendar.json.
// Facts about showers (dates, ZHR) are in data/showers.json (International Meteor Organization). The Moon numbers are ours (Astronomy Engine).
import * as A from 'astronomy-engine';
import { writeFileSync, readFileSync } from 'node:fs';

const showers = JSON.parse(readFileSync(new URL('../data/showers.json', import.meta.url), 'utf8'));
const lib = JSON.parse(readFileSync(new URL('../node_modules/astronomy-engine/package.json', import.meta.url), 'utf8'));

const REF_HOUR = Number(process.env.REF_HOUR ?? 0); // hour (UTC) on the second date of the peak night
const lit = (d) => Math.round(A.Illumination('Moon', d).phase_fraction * 100);

// Moon phases from 1 Oct 2026 for 16 months
const names = ['New Moon', 'First Quarter', 'Full Moon', 'Last Quarter'];
const phases = [];
let q = A.SearchMoonQuarter(new Date('2026-10-01T00:00:00Z'));
while (q.time.date < new Date('2028-02-01T00:00:00Z')) {
  phases.push({ phase: names[q.quarter], at: q.time.date.toISOString() });
  q = A.NextMoonQuarter(q);
}

const rows = showers.showers.map((s) => {
  const d = new Date(`${s.night[1]}T${String(REF_HOUR).padStart(2, '0')}:00:00Z`);
  return { ...s, moonPercent: lit(d) };
});

writeFileSync(new URL('../data/sky-calendar.json', import.meta.url), JSON.stringify({
  calculatedOn: new Date().toISOString().slice(0, 10),
  method: `Astronomy Engine ${lib.version}; Moon light at ${String(REF_HOUR).padStart(2, '0')}:00 UTC on the second date of each peak night`,
  moonPhases: phases,
  showers: rows,
}, null, 1));

for (const r of rows) console.log(r.name.padEnd(26), 'ours', String(r.moonPercent).padStart(3), 'IMO', String(r.imoMoonPercent).padStart(3));
console.log(phases.slice(0, 6));
