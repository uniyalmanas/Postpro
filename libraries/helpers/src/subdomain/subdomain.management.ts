import { parse } from 'tldts';

export function getCookieUrlFromDomain(domain: string) {
  if (process.env.COOKIE_DOMAIN) {
    return process.env.COOKIE_DOMAIN;
  }
  const url = parse(domain);
  if (!url.hostname) return undefined;

  // Cloud platform subdomains (e.g. *.railway.app, *.up.railway.app, *.vercel.app, *.onrender.com)
  // are on the Public Suffix List (PSL). Browsers strictly reject cookies with wildcard domain
  // attributes like Domain=.railway.app to prevent cross-tenant cookie attacks.
  // For these platforms, scope the cookie directly to the specific host.
  if (
    url.hostname.endsWith('.railway.app') ||
    url.hostname.endsWith('.up.railway.app') ||
    url.hostname.endsWith('.vercel.app') ||
    url.hostname.endsWith('.onrender.com') ||
    url.hostname.endsWith('.fly.dev')
  ) {
    return url.hostname;
  }

  return url.domain ? '.' + url.domain : url.hostname;
}
