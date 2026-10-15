/**
 * Client-side configuration.
 *
 * IMPORTANT: no secrets live here. All privileged calls (TMDB, AI) go through
 * the same-origin `/api/*` proxy on the server. This file only holds public,
 * non-sensitive UI settings.
 */
export const CONFIG = Object.freeze({
  apiBase: '/api',
  // Rows shown on the home page. Each maps to a TMDB endpoint (see app.js).
  homeRows: [
    { id: 'trending', title: 'Trending Now', endpoint: '/trending/all/week' },
    { id: 'movies', title: 'Popular Movies', endpoint: '/movie/popular' },
    { id: 'tv', title: 'Popular TV Shows', endpoint: '/tv/popular' },
    { id: 'top', title: 'Top Rated', endpoint: '/movie/top_rated' },
  ],
  // External links used by the ad-blocker onboarding banner.
  links: {
    ublockChrome:
      'https://chromewebstore.google.com/detail/ublock-origin/cjpalhdlnbpafiamejdnhcphjbkeiagm',
    ublockFirefox: 'https://addons.mozilla.org/firefox/addon/ublock-origin/',
    adguardDns: 'https://adguard-dns.io/en/public-dns.html',
    adguardHome: 'https://adguard.com/en/adguard-home/overview.html',
  },
  storageKeys: {
    myList: 'pikuflix.mylist',
    adNotice: 'pikuflix.adNoticeDismissed',
  },
});
