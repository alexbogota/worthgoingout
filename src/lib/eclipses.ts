// Eclipse list 2026–2030 and what world cities see. Numbers come from scripts/calc-eclipse-list.mjs (npm run calc).
import data from '../../data/eclipses.json';
import { buildDate } from './site';

export const eclipseList = data;
export const cityBySlug = Object.fromEntries(data.cities.map((c) => [c.slug, c]));
export type City = (typeof data.cities)[number];

export const solarLabel: Record<string, string> = { total: 'Total solar eclipse', annular: 'Annular solar eclipse', partial: 'Partial solar eclipse', hybrid: 'Hybrid solar eclipse' };
export const lunarLabel: Record<string, string> = { total: 'Total lunar eclipse', partial: 'Partial lunar eclipse', penumbral: 'Penumbral lunar eclipse' };

export const upcoming = <T extends { peak: string }>(list: T[], now = buildDate) => list.filter((e) => new Date(e.peak) >= now);

export const dayLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
export const utcTime = (iso: string) => new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
export const roughMin = (sec: number) => (sec < 90 ? `about ${Math.round(sec)} s` : `about ${Math.floor(sec / 60)} min ${String(Math.round(sec % 60)).padStart(2, '0')} s`);
