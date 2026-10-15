/**
 * Ad-blocker awareness (client-side only).
 *
 * We never inject ads or bypass blockers — we simply detect whether an ad
 * blocker is active and, if not, gently recommend uBlock Origin / AdGuard DNS
 * for a cleaner, safer viewing experience. The recommendation is shown once and
 * can be dismissed permanently (persisted locally and, when signed in, on the
 * user's profile).
 *
 * Detection is intentionally privacy-respecting: it uses a bait element and a
 * fetch to a well-known ad host, both of which are blocked by common filters.
 * No data leaves the browser.
 */
import { CONFIG } from './config.js';
import { $, el, toast } from './ui.js';
import { getUser, updatePrefs } from './auth.js';

let bannerEl = null;

// Track whether our own Content-Security-Policy blocked the ad probe. If it
// did, a failed request tells us nothing about the user's ad blocker, so we
// must not treat it as a positive detection.
let cspBlockedAdHost = false;
let cspTrackerInstalled = false;

function installCspTracker() {
  if (cspTrackerInstalled) return;
  cspTrackerInstalled = true;
  document.addEventListener('securitypolicyviolation', (e) => {
    if ((e.blockedURI || '').includes('googlesyndication')) {
      cspBlockedAdHost = true;
    }
  });
}

/**
 * Heuristic detection — returns true when an ad blocker looks active.
 * Uses two independent signals: a cosmetic-filter bait element (primary) and a
 * network probe (secondary, CSP-aware).
 */
export async function detectAdBlocker() {
  installCspTracker();

  // 1. Bait element: cosmetic filters hide elements with ad-like class names.
  const bait = el('div', {
    class: 'ad-banner adsbox doubleclick ad-placement pub_300x250',
    style: 'position:absolute;left:-9999px;top:-9999px;width:1px;height:1px;',
    'aria-hidden': 'true',
  });
  document.body.appendChild(bait);

  await new Promise((r) => setTimeout(r, 120));

  const style = window.getComputedStyle(bait);
  const hiddenByFilter =
    bait.offsetParent === null ||
    bait.offsetHeight === 0 ||
    style.display === 'none' ||
    style.visibility === 'hidden';
  bait.remove();

  if (hiddenByFilter) return true;

  // 2. Network bait: a request to a known ad endpoint. If it fails fast, a
  //    blocker (or DNS sinkhole) is likely intercepting it — UNLESS our own CSP
  //    blocked it, in which case the result is inconclusive.
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    await fetch(
      'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
      { method: 'HEAD', mode: 'no-cors', signal: controller.signal }
    );
    clearTimeout(timer);
    return false; // request went through -> no blocker
  } catch {
    // If our CSP blocked the probe, we cannot conclude a blocker is present.
    return cspBlockedAdHost ? false : true;
  }
}

function buildBanner() {
  const links = CONFIG.links;
  return el('div', {
    class: 'notice',
    id: 'adNotice',
    role: 'dialog',
    'aria-modal': 'false',
    'aria-labelledby': 'adNoticeTitle',
    html: `
      <button class="notice__dismiss" data-dismiss-ad aria-label="Dismiss">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M18.3 5.7 12 12l6.3 6.3-1.4 1.4L10.6 13.4 4.3 19.7 2.9 18.3 9.2 12 2.9 5.7 4.3 4.3l6.3 6.3 6.3-6.3z"/></svg>
      </button>
      <div class="notice__head">
        <span class="notice__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 1 3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-1 15-4-4 1.41-1.41L11 13.17l4.59-4.58L17 10l-6 6z"/></svg>
        </span>
        <h2 class="notice__title" id="adNoticeTitle">Enjoy a cleaner, ad-free experience</h2>
      </div>
      <p class="notice__body">
        PikuFlix never shows ads, but some embedded players may. For a smoother,
        safer experience we recommend an ad blocker or a privacy DNS:
      </p>
      <ul class="notice__list">
        <li>🛡️ <strong>uBlock Origin</strong> — free &amp; open source
          (<a href="${links.ublockChrome}" target="_blank" rel="noopener noreferrer">Chrome</a>
          · <a href="${links.ublockFirefox}" target="_blank" rel="noopener noreferrer">Firefox</a>)</li>
        <li>🌐 <strong>AdGuard DNS</strong> — blocks ads on every device
          (<a href="${links.adguardDns}" target="_blank" rel="noopener noreferrer">setup guide</a>)</li>
      </ul>
      <div class="notice__actions">
        <button class="btn btn--primary btn--sm" data-dismiss-ad>Got it</button>
        <button class="btn btn--ghost btn--sm" id="adNoticeLater">Maybe later</button>
      </div>
    `,
  });
}

/** Show the recommendation banner. */
export function showAdNotice() {
  if (!bannerEl) {
    bannerEl = buildBanner();
    document.body.appendChild(bannerEl);
  }
  bannerEl.classList.add('is-open');

  bannerEl.querySelectorAll('[data-dismiss-ad]').forEach((b) =>
    b.addEventListener('click', () => dismissAdNotice(true))
  );
  $('#adNoticeLater')?.addEventListener('click', () => dismissAdNotice(false));
}

function dismissAdNotice(permanent) {
  bannerEl?.classList.remove('is-open');
  if (permanent) {
    localStorage.setItem(CONFIG.storageKeys.adNotice, '1');
    // Persist to the user's profile when signed in.
    updatePrefs({ adBlockNoticeSeen: true });
  }
}

/**
 * Run the full flow:
 *   - if an ad blocker is already active -> do nothing (they're set).
 *   - if not, and the user hasn't dismissed it -> show the recommendation.
 *
 * `force` shows the banner regardless (used right after first sign-up).
 */
export async function initAdBlockerAwareness({ force = false } = {}) {
  const hasBlocker = await detectAdBlocker();
  window.dispatchEvent(
    new CustomEvent('pikuflix:adblock', { detail: { active: hasBlocker } })
  );

  if (hasBlocker) return { active: true, shown: false };

  const dismissed = localStorage.getItem(CONFIG.storageKeys.adNotice) === '1';
  const seenOnProfile = getUser()?.prefs?.adBlockNoticeSeen;
  if (force || (!dismissed && !seenOnProfile)) {
    // Small delay so it doesn't fight with the first paint.
    setTimeout(showAdNotice, force ? 400 : 2500);
    return { active: false, shown: true };
  }
  return { active: false, shown: false };
}

/** Called by auth.js after a brand-new signup to prompt immediately. */
export function promptAdNoticeOnFirstLogin() {
  initAdBlockerAwareness({ force: true });
}
