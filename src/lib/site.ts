// Site-wide settings in one place.
export const site = {
  name: 'Worth Going Out',
  tagline: 'Plain answers on eclipses and meteor showers: is it worth going out?',
  url: 'https://worthgoingout.com',
  email: 'contact@worthgoingout.com',
  // Date of the last edit of the legal pages (change when they change).
  legalUpdated: '24 October 2026',
  // Pinterest site verification code (the content of the p:domain_verify meta tag). Empty until the owner claims the site on Pinterest.
  pinterestVerify: '',
};

// The date the site was built. Pages that count down or list "coming up" use it, so the site is rebuilt every day (see .github/workflows/deploy.yml).
export const buildDate = new Date();
export const longDate = (d: Date | string) =>
  new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
