// Aurora destinations and their darkness by month. Numbers come from scripts/calc-aurora.mjs (npm run calc).
import data from '../../data/aurora.json';
import { calendar } from './sky';
import { buildDate } from './site';
export const aurora = data;
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONTHS_LONG = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
// Season as text, for example "September to March". Seasons wrap over the new year.
export const seasonText = (season: number[]) => {
  const set = new Set(season);
  let start = season.find((m) => !set.has((m + 11) % 12));
  if (start === undefined) return 'all year';
  let end = start;
  while (set.has((end + 1) % 12) && (end + 1) % 12 !== start) end = (end + 1) % 12;
  return `${MONTHS_LONG[start]} to ${MONTHS_LONG[end]}`;
};
// New Moons that fall in the aurora season months, from today on: the darkest weeks to plan around.
export const seasonNewMoons = (season: number[], now = buildDate) =>
  calendar.moonPhases.filter((p) => p.phase === 'New Moon' && new Date(p.at) > now && season.includes(new Date(p.at).getUTCMonth()));

// Month pages: the next occurrence of a month (0-11) in the calculated detail, from today on.
export type AuroraPlace = (typeof data.places)[number];
export const monthSlug = (m: number) => MONTHS_LONG[m].toLowerCase();
export const nextOccurrence = <T extends { month: string }>(detail: T[], m: number, now = buildDate) => {
  const list = detail.filter((d) => Number(d.month.slice(5)) - 1 === m);
  return list.find((d) => new Date(Date.UTC(Number(d.month.slice(0, 4)), m + 1, 1)) > now) ?? list[list.length - 1];
};
export const phasesIn = (ym: string) => calendar.moonPhases.filter((p) => p.at.slice(0, 7) === ym && (p.phase === 'New Moon' || p.phase === 'Full Moon'));
