// Affiliate links: live only when the partner is approved (data/partners.json). Pages call liveLink() and show nothing when it is null.
import data from '../../data/partners.json';
type Link = { partner: string; url: string };
const partners = data.partners as Record<string, { name: string; enabled: boolean }>;
const links = data.links as Record<string, Link>;
export const liveLinks = () => Object.entries(links).filter(([, l]) => l.url && partners[l.partner]?.enabled);
export const liveLink = (id: string) => {
  const l = links[id];
  if (!l || !l.url || !partners[l.partner]?.enabled) return null;
  return { href: `/go/${id}/`, partner: partners[l.partner].name, url: l.url };
};
