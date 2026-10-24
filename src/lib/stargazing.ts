// Stargazing destinations: darkness, Milky Way core hours and moonless windows. Numbers from scripts/calc-stargazing.mjs.
import data from '../../data/stargazing.json';
import { buildDate } from './site';
export const stargazing = data;
export const monthShort = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'short', timeZone: 'UTC' });
export const monthLong = (ym: string) => new Date(`${ym}-01T00:00:00Z`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const d = (s: string, year = false) => new Date(`${s}T00:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', ...(year ? { year: 'numeric' } : {}), timeZone: 'UTC' });
export const windowText = (w: { from: string; to: string }) => `${d(w.from)} to ${d(w.to, true)}`;
export const nextWindows = (p: (typeof data.places)[number], n = 6, now = buildDate) => p.windows.filter((w) => new Date(`${w.to}T23:59:59Z`) >= now).slice(0, n);
// Twelve months starting with the current one.
export const twelve = (p: (typeof data.places)[number], now = buildDate) => {
  const ym = now.toISOString().slice(0, 7);
  const i = Math.max(0, p.months.findIndex((m) => m.month === ym));
  return p.months.slice(i, i + 12);
};
// Months in which the core of the Milky Way is up for at least 2 hours of full darkness.
export const coreSeason = (p: (typeof data.places)[number]) => {
  const best = [...p.months.slice(0, 12)].sort((a, b) => b.core - a.core);
  const good = p.months.slice(0, 12).filter((m) => m.core >= 2).map((m) => m.month);
  return { best: best[0], good };
};
