// Reads the calculated data and turns it into things the pages show. The numbers themselves come from scripts/calc-*.mjs (npm run calc).
import eclipse from '../../data/eclipse-2027.json';
import calendar from '../../data/sky-calendar.json';
import { buildDate } from './site';

export type Verdict = 'go' | 'maybe' | 'skip';
export const verdictLabel: Record<Verdict, string> = { go: 'Go', maybe: 'Maybe', skip: 'Skip' };

// The rule is public: it is written out on the Methodology page. Change it here AND there.
export const RULE = { goMinRate: 20, goMaxMoon: 35, skipBelowRate: 10, skipMoonFrom: 80 };

export interface Shower {
  slug: string; name: string; start: string; end: string; night: [string, string];
  zhr: number; moonPercent: number; imoMoonPercent: number;
  verdict: Verdict; why: string; waxing: boolean;
}

// Waxing Moon (before Full Moon) sets in the evening or night, so the dark hours come AFTER it sets. Waning Moon rises late: dark hours come BEFORE it rises.
const isWaxing = (night: string) => {
  const t = new Date(`${night}T00:00:00Z`).getTime();
  const next = calendar.moonPhases.find((p) => new Date(p.at).getTime() > t && (p.phase === 'Full Moon' || p.phase === 'New Moon'));
  return next?.phase === 'Full Moon';
};

export function showerVerdict(zhr: number, moon: number, waxing: boolean): { verdict: Verdict; why: string } {
  if (zhr < RULE.skipBelowRate) return { verdict: 'skip', why: `At best ${zhr} meteors an hour under a perfect sky. Not worth a trip.` };
  if (moon >= RULE.skipMoonFrom) return { verdict: 'skip', why: `The Moon is ${moon}% lit and will drown out most meteors.` };
  if (zhr >= RULE.goMinRate && moon <= RULE.goMaxMoon) return { verdict: 'go', why: `Up to ${zhr} an hour and a dark sky (Moon ${moon}% lit).` };
  const when = waxing ? 'after the Moon sets' : 'before the Moon rises';
  return { verdict: 'maybe', why: `Moon ${moon}% lit, up to ${zhr} an hour. Go ${when}; check moonset or moonrise for your town.` };
}

export const showers: Shower[] = calendar.showers.map((s) => {
  const waxing = isWaxing(s.night[1]);
  return { ...s, night: s.night as [string, string], waxing, ...showerVerdict(s.zhr, s.moonPercent, waxing) };
});

// Showers whose peak night has not finished yet (the night ends at the end of the second date, UTC).
export const upcomingShowers = (now = buildDate) =>
  showers.filter((s) => new Date(`${s.night[1]}T23:59:59Z`) >= now).sort((a, b) => a.night[1].localeCompare(b.night[1]));

export const nextMoon = (now = buildDate) => calendar.moonPhases.filter((p) => new Date(p.at) > now);

export { eclipse, calendar };

export const daysUntil = (date: string, now = buildDate) =>
  Math.max(0, Math.ceil((new Date(`${date}T00:00:00Z`).getTime() - now.getTime()) / 86_400_000));

export const fmtDuration = (sec: number) => `${Math.floor(sec / 60)} min ${String(Math.round(sec % 60)).padStart(2, '0')} s`;

// Local clock time at a place, using the time-zone rules known today (they can change before 2027).
export function localTime(iso: string, tz: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: tz });
  const off = new Intl.DateTimeFormat('en-GB', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(d).find((p) => p.type === 'timeZoneName')?.value ?? '';
  return { time, offset: off.replace('GMT', 'UTC') || 'UTC' };
}

export type EclipsePlace = (typeof eclipse.places)[number];

export function placeNote(p: EclipsePlace): string {
  if (p.kind === 'total') {
    return (p.totalitySeconds ?? 0) < 120
      ? 'Near the edge of the path: a few kilometres either way changes the length a lot.'
      : '';
  }
  const pct = (p.obscuration * 100).toFixed(1);
  return p.obscuration >= 0.995
    ? `Just outside the path. ${pct}% covered still looks like a bright Sun, not night.`
    : `Outside the path. A partial eclipse only, ${pct}% of the Sun covered at most.`;
}
