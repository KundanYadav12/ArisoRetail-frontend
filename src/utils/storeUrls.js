/**
 * Dynamic Storefront URL Helper
 * 
 * Generates appropriate merchant storefront URLs based on the active domain
 * (e.g. *.arisoretail.duckdns.org or *.arisopos.in) or assigned custom domain.
 */

export function getMerchantStoreUrl(subdomain, customDomain = null) {
  if (customDomain && typeof customDomain === 'string' && customDomain.trim()) {
    const clean = customDomain.trim().toLowerCase();
    return clean.startsWith('http') ? clean : `https://${clean}`;
  }

  if (!subdomain || typeof subdomain !== 'string' || !subdomain.trim()) {
    return '';
  }

  const cleanSub = subdomain.trim().toLowerCase();

  if (typeof window !== 'undefined') {
    const host = window.location.hostname.toLowerCase();
    const proto = window.location.protocol || 'https:';
    const port = window.location.port ? `:${window.location.port}` : '';

    // If currently accessed via arisoretail.duckdns.org (or any *.duckdns.org)
    if (host.includes('duckdns.org')) {
      return `${proto}//${cleanSub}.arisoretail.duckdns.org${port}`;
    }

    // If currently accessed via arisopos.in
    if (host.includes('arisopos.in')) {
      return `${proto}//${cleanSub}.arisopos.in${port}`;
    }

    // If currently accessed via arisotechnologies.com
    if (host.includes('arisotechnologies.com')) {
      return `${proto}//${cleanSub}.retail.arisotechnologies.com${port}`;
    }

    // If local development (localhost or 127.0.0.1)
    if (host === 'localhost' || host === '127.0.0.1' || /^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
      return `${proto}//${cleanSub}.localhost${port}`;
    }

    // Any other domain: dynamically prefix subdomain to current hostname
    return `${proto}//${cleanSub}.${host}${port}`;
  }

  // Server-side fallback default
  return `https://${cleanSub}.arisoretail.duckdns.org`;
}

export function getAllStoreUrls(subdomain, customDomain = null) {
  if (!subdomain) return { primary: '', duckdns: '', arisopos: '', custom: null };
  const cleanSub = subdomain.trim().toLowerCase();

  return {
    primary: getMerchantStoreUrl(subdomain, customDomain),
    duckdns: `https://${cleanSub}.arisoretail.duckdns.org`,
    arisopos: `https://${cleanSub}.arisopos.in`,
    custom: customDomain ? (customDomain.startsWith('http') ? customDomain : `https://${customDomain}`) : null
  };
}
