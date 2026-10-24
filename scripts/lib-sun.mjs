// Shared helpers for the month pages: dusk and dawn for a given Sun depth, and dark hours on a night.
import * as A from 'astronomy-engine';
const alt = (body, t, obs) => { const e = A.Equator(body, t, obs, true, true); return A.Horizon(t, obs, e.ra, e.dec, 'normal').altitude; };
export { alt };
// The night that starts on local date (y, m, d): from local solar noon to the next local solar noon.
export function nightOf(lat, lon, elev, y, m, d, depth, stepMin = 10) {
  const obs = new A.Observer(lat, lon, elev);
  const start = Date.UTC(y, m, d, 12) - (lon / 15) * 3600000;
  const dusk = A.SearchAltitude(A.Body.Sun, obs, -1, A.MakeTime(new Date(start)), 1, depth);
  const dawn = A.SearchAltitude(A.Body.Sun, obs, +1, A.MakeTime(new Date(start)), 1, depth);
  let dark = 0, moonless = 0;
  for (let ms = start; ms < start + 86400000; ms += stepMin * 60000) {
    const t = A.MakeTime(new Date(ms));
    if (alt(A.Body.Sun, t, obs) > depth) continue;
    dark += stepMin;
    if (alt(A.Body.Moon, t, obs) < 0) moonless += stepMin;
  }
  const ok = dusk && dawn && dawn.date > dusk.date;
  return { dusk: ok ? dusk.date.toISOString() : null, dawn: ok ? dawn.date.toISOString() : null, dark: Math.round(dark / 6) / 10, moonless: Math.round(moonless / 6) / 10 };
}
export const lastDay = (y, m) => new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
